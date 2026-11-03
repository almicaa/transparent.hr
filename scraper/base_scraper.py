"""Shared scraper utilities: anti-blocking config, DB access, salary parsing.

DB layer uses SQLAlchemy so the same code writes to local SQLite during
development and to the production Postgres (Neon) database when DATABASE_URL
is set — critical for scrapers running on a schedule against production.
"""

import random
import asyncio
import html
import json
import os
import re
import sys
import urllib.request
from datetime import datetime, timedelta, timezone
from urllib.parse import urljoin, urlparse

from sqlalchemy import create_engine, text
from sqlalchemy.engine import Connection

sys.path.insert(0, os.path.normpath(os.path.join(os.path.dirname(__file__), "..")))
from shared.salary_parser import (  # noqa: E402,F401
    parse_salary,
    parse_salary_basis,
    parse_salary_type,
    parse_salary_period,
    is_valid_salary,
    clean_salary_snippet,
)
from shared.category_normalizer import normalize_category  # noqa: E402

DB_PATH = os.path.normpath(os.path.join(os.path.dirname(__file__), "..", "backend", "jobs.db"))


def _resolve_database_url() -> str:
    url = os.environ.get("DATABASE_URL")
    if not url:
        return f"sqlite:///{DB_PATH}"
    if url.startswith("postgresql://") and "+psycopg" not in url:
        url = url.replace("postgresql://", "postgresql+psycopg://", 1)
    return url


DATABASE_URL = _resolve_database_url()
# pre_ping: check a pooled connection is still alive before handing it out.
_engine = create_engine(DATABASE_URL, pool_pre_ping=True)
IS_SQLITE = _engine.dialect.name == "sqlite"


def get_connection() -> Connection:
    """Open a new DB connection. Caller is responsible for closing it."""
    return _engine.connect()


class ReconnectingDB:
    """A DB connection for long scraper runs that survives the server dropping it.

    Neon closes connections that stay open for a long time (a first HZZ fill
    takes hours), which used to kill the run with "SSL SYSCALL error:
    Connection timed out". run() calls fn(conn, ...) and, if the connection is
    gone, throws it away, opens a fresh one and tries once more.
    """

    def __init__(self):
        self.conn = get_connection()

    def run(self, fn, *args, **kwargs):
        from sqlalchemy.exc import DBAPIError, OperationalError

        try:
            return fn(self.conn, *args, **kwargs)
        except DBAPIError as e:
            # Only a lost connection is worth retrying; a constraint or SQL error
            # would just fail again.
            if not (isinstance(e, OperationalError) or e.connection_invalidated):
                raise
            print(f"[db] Veza s bazom prekinuta ({type(e.orig).__name__}) — spajam se ponovno.")
            try:
                self.conn.invalidate()
                self.conn.close()
            except Exception:
                pass
            self.conn = get_connection()
            return fn(self.conn, *args, **kwargs)

    def close(self):
        try:
            self.conn.close()
        except Exception:
            pass


# Anti-blocking / politeness configuration
UA_LIST = [
    "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
    "Mozilla/5.0 (Macintosh; Intel Mac OS X 13_0) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/16.0 Safari/605.1.15",
    "Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/116.0.0.0 Safari/537.36",
]

MIN_DELAY = 2.0
MAX_DELAY = 5.0
MAX_CONCURRENCY = 1
PROXY_LIST = []  # optional: list of proxy strings (http://user:pass@host:port)
DRY_RUN = False

# Render's Cron Job instances cap memory at 512MB. Headless Chromium accumulates
# overhead over hundreds of context create/destroy cycles in a single run, and
# without these flags that's enough to OOM the whole job (it actually happened —
# the scraper got SIGKILLed mid-run rather than failing cleanly).
CHROMIUM_LAUNCH_ARGS = [
    "--disable-dev-shm-usage",
    "--disable-gpu",
    "--no-sandbox",
    "--disable-setuid-sandbox",
    "--disable-background-networking",
    "--disable-extensions",
]


def get_ua():
    return random.choice(UA_LIST)


def new_http_client():
    """Plain HTTP client for detail-page fetches.

    We only ever need the raw server-rendered HTML for these pages (Nuxt's
    hydration payload and plain salary text are both already present before
    any client-side JS runs) — no rendering needed. A headless Chromium
    context per detail page was the real driver behind a 512MB OOM on
    Render; httpx avoids spinning up a browser renderer at all.
    """
    import httpx

    return httpx.AsyncClient(headers={"User-Agent": get_ua()}, timeout=20.0, follow_redirects=True)


_BLOCKED_RESOURCE_TYPES = {"image", "media", "font", "stylesheet"}


async def _block_heavy_resources(route):
    if route.request.resource_type in _BLOCKED_RESOURCE_TYPES:
        await route.abort()
    else:
        await route.continue_()


async def block_heavy_resources(context) -> None:
    """Abort image/media/font/stylesheet requests on a browser context.

    We only ever read HTML/JSON from these pages — never render them visually
    — so images and fonts are pure memory/bandwidth waste. This is the single
    biggest lever against the 512MB OOM we kept hitting on Render: a typical
    job listing page pulls several MB of logos/photos per visit, repeated
    over hundreds of detail-page visits in one run.
    """
    await context.route("**/*", _block_heavy_resources)


async def sleep_jitter(min_delay=None, max_delay=None):
    mn = min_delay if min_delay is not None else MIN_DELAY
    mx = max_delay if max_delay is not None else MAX_DELAY
    await asyncio.sleep(random.uniform(mn, mx))


async def retry_with_backoff(coro_fn, *args, retries=3, base_delay=1.0, max_delay=20.0, **kwargs):
    """Retry wrapper for async callables (e.g., page.goto)."""
    attempt = 0
    while True:
        try:
            return await coro_fn(*args, **kwargs)
        except Exception:
            attempt += 1
            if attempt > retries:
                raise
            delay = min(max_delay, base_delay * (2 ** (attempt - 1)) + random.uniform(0, 1.0))
            await asyncio.sleep(delay)


def check_robots(base_url):
    """Fetch robots.txt and log Crawl-delay/Disallow for User-agent: *. Logs only, never blocks."""
    try:
        parsed = urlparse(base_url)
        robots_url = urljoin(f"{parsed.scheme}://{parsed.netloc}", "/robots.txt")
        try:
            with urllib.request.urlopen(robots_url, timeout=5) as resp:
                if resp.status != 200:
                    print(f"[robots] No robots.txt at {robots_url} (status {resp.status})")
                    return {"crawl_delay": None, "disallow": []}
                text_ = resp.read().decode("utf-8", errors="ignore")
        except Exception as e:
            print(f"[robots] No robots.txt at {robots_url} ({e})")
            return {"crawl_delay": None, "disallow": []}

        crawl_delay = None
        disallow = []
        ua = None
        for line in text_.splitlines():
            line = line.strip()
            if not line or line.startswith("#"):
                continue
            if line.lower().startswith("user-agent:"):
                ua = line.split(":", 1)[1].strip()
                continue
            if ua in ("*", None):
                if line.lower().startswith("crawl-delay:"):
                    try:
                        crawl_delay = float(line.split(":", 1)[1].strip())
                    except Exception:
                        pass
                if line.lower().startswith("disallow:"):
                    path = line.split(":", 1)[1].strip()
                    if path:
                        disallow.append(path)
        if crawl_delay:
            print(f"[robots] {robots_url} Crawl-delay: {crawl_delay}s")
        if disallow:
            print(f"[robots] {robots_url} Disallow: {disallow} (logged only, not blocking)")
        return {"crawl_delay": crawl_delay, "disallow": disallow}
    except Exception as e:
        print("[robots] Error fetching robots.txt:", e)
        return {"crawl_delay": None, "disallow": []}


_ADDED_JOB_COLUMNS = {
    "category_raw": "TEXT",
    "address_region": "TEXT",
    "contract_type": "TEXT",
    "education": "TEXT",
    "experience": "TEXT",
    "openings": "INTEGER",
    "salary_period": "TEXT",
}


def init_db():
    """Create tables for local SQLite dev. In production, Postgres schema is
    managed by Alembic migrations (backend/alembic) — this is a no-op there."""
    if not IS_SQLITE:
        return
    with _engine.begin() as conn:
        conn.execute(text("""
            CREATE TABLE IF NOT EXISTS jobs (
                id           INTEGER PRIMARY KEY AUTOINCREMENT,
                external_id  TEXT UNIQUE,
                title        TEXT NOT NULL,
                company      TEXT,
                location     TEXT,
                job_type     TEXT,
                category     TEXT,
                category_raw TEXT,
                salary_min   REAL,
                salary_max   REAL,
                salary_text  TEXT,
                salary_shown INTEGER DEFAULT 0,
                salary_currency TEXT,
                salary_basis TEXT,
                salary_type  TEXT,
                salary_period TEXT,
                description  TEXT,
                url          TEXT,
                source       TEXT,
                posted_at    TEXT,
                scraped_at   TEXT DEFAULT (datetime('now')),
                expires_at   TEXT,
                is_active    INTEGER DEFAULT 1,
                address_region TEXT,
                contract_type  TEXT,
                education      TEXT,
                experience     TEXT,
                openings       INTEGER
            )
        """))
        # Local databases created before a column existed (Alembic adds them
        # in production).
        existing = {row[1] for row in conn.execute(text("PRAGMA table_info(jobs)"))}
        for column, sql_type in _ADDED_JOB_COLUMNS.items():
            if column not in existing:
                conn.execute(text(f"ALTER TABLE jobs ADD COLUMN {column} {sql_type}"))
        conn.execute(text("""
            CREATE TABLE IF NOT EXISTS market_stats (
                source         TEXT PRIMARY KEY,
                total_pages    INTEGER NOT NULL,
                salary_pages   INTEGER NOT NULL,
                estimated_pct  REAL NOT NULL,
                computed_at    TEXT NOT NULL
            )
        """))
        conn.execute(text("""
            CREATE TABLE IF NOT EXISTS salary_stats (
                id               INTEGER PRIMARY KEY AUTOINCREMENT,
                source           TEXT NOT NULL,
                date             TEXT NOT NULL,
                total_jobs       INTEGER NOT NULL,
                jobs_with_salary INTEGER NOT NULL,
                pct              REAL NOT NULL,
                UNIQUE(source, date)
            )
        """))
        conn.execute(text("""
            CREATE TABLE IF NOT EXISTS job_sources (
                name          TEXT PRIMARY KEY,
                display_name  TEXT NOT NULL,
                base_url      TEXT
            )
        """))
        conn.execute(text("""
            CREATE TABLE IF NOT EXISTS scrape_logs (
                id            INTEGER PRIMARY KEY AUTOINCREMENT,
                source        TEXT NOT NULL,
                started_at    TEXT NOT NULL,
                finished_at   TEXT,
                jobs_found    INTEGER DEFAULT 0,
                jobs_saved    INTEGER DEFAULT 0,
                status        TEXT DEFAULT 'running',
                error_message TEXT
            )
        """))


def register_source(conn: Connection, name: str, display_name: str, base_url: str | None = None):
    conn.execute(
        text("""
            INSERT INTO job_sources (name, display_name, base_url) VALUES (:name, :display_name, :base_url)
            ON CONFLICT(name) DO UPDATE SET display_name=excluded.display_name, base_url=excluded.base_url
        """),
        {"name": name, "display_name": display_name, "base_url": base_url},
    )
    conn.commit()


def start_scrape_log(conn: Connection, source: str) -> int:
    result = conn.execute(
        text("""
            INSERT INTO scrape_logs (source, started_at, jobs_found, jobs_saved, status)
            VALUES (:source, :started_at, 0, 0, 'running')
            RETURNING id
        """),
        {"source": source, "started_at": datetime.now(timezone.utc).isoformat()},
    )
    log_id = result.scalar_one()
    conn.commit()
    return log_id


def finish_scrape_log(
    conn: Connection,
    log_id: int,
    *,
    jobs_found: int,
    jobs_saved: int,
    status: str = "success",
    error_message: str | None = None,
):
    conn.execute(
        text("""
            UPDATE scrape_logs
            SET finished_at=:finished_at, jobs_found=:jobs_found, jobs_saved=:jobs_saved,
                status=:status, error_message=:error_message
            WHERE id=:log_id
        """),
        {
            "finished_at": datetime.now(timezone.utc).isoformat(),
            "jobs_found": jobs_found,
            "jobs_saved": jobs_saved,
            "status": status,
            "error_message": error_message,
            "log_id": log_id,
        },
    )
    conn.commit()


async def get_listing_page_count(page) -> int | None:
    """Read the '(current/total)' page indicator from a listing page's <title>."""
    try:
        title = await page.title()
        m = re.search(r"\((\d+)\s*/\s*(\d+)\)", title)
        if m:
            return int(m.group(2))
    except Exception:
        pass
    return None


def job_exists(conn: Connection, external_id: str) -> bool:
    """Cheap dedup check — lets a scraper skip the expensive detail-page visit
    for ads it has already saved, instead of just relying on ON CONFLICT
    after doing all that work anyway."""
    row = conn.execute(
        text("SELECT 1 FROM jobs WHERE external_id = :external_id LIMIT 1"),
        {"external_id": external_id},
    ).fetchone()
    return row is not None


def save_salary_stat(conn: Connection, source: str, total_jobs: int, jobs_with_salary: int) -> float | None:
    """Store daily transparency data (one row per source per day, upserted).

    Used to build the historical % chart showing how many job listings on each
    source have a visible salary over time.
    """
    if not total_jobs:
        return None
    pct = round(jobs_with_salary / total_jobs * 100, 1)
    today = datetime.now(timezone.utc).strftime("%Y-%m-%d")
    conflict_action = "ON CONFLICT(source, date) DO UPDATE SET total_jobs=excluded.total_jobs, jobs_with_salary=excluded.jobs_with_salary, pct=excluded.pct"
    if IS_SQLITE:
        conn.execute(
            text(f"INSERT OR REPLACE INTO salary_stats (source, date, total_jobs, jobs_with_salary, pct) VALUES (:source, :date, :total, :with_sal, :pct)"),
            {"source": source, "date": today, "total": total_jobs, "with_sal": jobs_with_salary, "pct": pct},
        )
    else:
        conn.execute(
            text(f"INSERT INTO salary_stats (source, date, total_jobs, jobs_with_salary, pct) VALUES (:source, :date, :total, :with_sal, :pct) {conflict_action}"),
            {"source": source, "date": today, "total": total_jobs, "with_sal": jobs_with_salary, "pct": pct},
        )
    conn.commit()
    print(f"[stats] {source}: {jobs_with_salary}/{total_jobs} oglasa s plaćom = {pct}%")
    return pct


def extract_nuxt_payload(content: str) -> dict | None:
    """Parse mojposao.hr's Nuxt SSR hydration payload (devalue-encoded JSON)
    into a flat dict with resolved field values.

    Scraping the raw HTML for salary mentions is unreliable on mojposao —
    every page has a sitewide "Osvoji 500€!" referral banner that false-
    positives as a salary match. The clean job description/benefits text
    lives in a <script type="application/json"> hydration payload instead,
    where each field value is an integer index into a flat top-level array
    (Nuxt's "devalue" format). The job entity itself is consistently at
    array index 4 across job detail pages.
    """
    m = re.search(r'<script type="application/json"[^>]*>(.*?)</script>', content, re.DOTALL)
    if not m:
        return None
    try:
        data = json.loads(m.group(1))
        job = data[4]

        def resolve(idx):
            return data[idx] if isinstance(idx, int) and idx < len(data) else idx

        def resolve_key(key):
            return resolve(job.get(key))

        salary_raw = resolve_key("salary")
        salary = None
        if isinstance(salary_raw, dict):
            salary = {k: resolve(v) for k, v in salary_raw.items()}

        location_raw = resolve_key("location")
        location = None
        if isinstance(location_raw, dict):
            location = resolve(location_raw.get("summary"))

        org_raw = resolve_key("organization")
        organization = None
        if isinstance(org_raw, dict):
            organization = resolve(org_raw.get("name"))

        # rootPosition is mojposao's top-level category ({"id": 9, "name":
        # "Graditeljstvo, geodezija, geologija"}); `position` is the specific role.
        root_raw = resolve_key("rootPosition")
        category = None
        if isinstance(root_raw, dict):
            category = resolve(root_raw.get("name"))

        return {
            "title": resolve_key("title"),
            "description": resolve_key("description"),
            "benefits": resolve_key("benefits"),
            "salary": salary,
            "location": location,
            "organization": organization,
            "category": category if isinstance(category, str) else None,
        }
    except Exception:
        return None


def extract_posao_category(content: str) -> str | None:
    """First category from a posao.hr detail page's "Kategorija:" row, e.g.
    <div class="... category ...">Kategorija:</div><div ...><a href=".../djelatnosti/...">
    Instalacije, održavanje, popravak</a>, <a ...>Zanatska zanimanja ...</a></div>.
    Ads can list several; the first is the employer's primary pick."""
    m = re.search(r"Kategorija:</div>\s*<div[^>]*>\s*<a[^>]*>([^<]+)</a>", content)
    return html.unescape(m.group(1)).strip() if m else None


# Croatian deadlines are calendar dates; a fixed UTC+1 is close enough (it's an
# hour off during summer time) and avoids depending on tzdata in slim images.
_HR_TZ = timezone(timedelta(hours=1))


def parse_posao_deadline(content: str) -> datetime | None:
    """Exact application deadline from a posao.hr detail page, which states it in
    its meta description ("Rok za prijavu: 17.10.2026.. Vrsta posla: ...").
    The ad stays open through the end of that day."""
    m = re.search(r"Rok za prijavu:\s*(\d{1,2})\.\s*(\d{1,2})\.\s*(\d{4})", content)
    if not m:
        return None
    day, month, year = (int(g) for g in m.groups())
    try:
        return datetime(year, month, day, 23, 59, 59, tzinfo=_HR_TZ)
    except ValueError:
        return None


def to_utc_iso(value: datetime) -> str:
    """ISO timestamp in UTC for the jobs table. Its columns have no time zone,
    so Postgres drops any offset and keeps the wall-clock time: 23:59+01:00
    would be stored as 23:59 and then read back as UTC by the API."""
    if value.tzinfo is not None:
        value = value.astimezone(timezone.utc)
    return value.isoformat()


def parse_days_to_expiry(text_: str | None) -> int | None:
    """Parse posao.hr's own countdown ('N dana do isteka' / '1 dan do isteka')."""
    if not text_:
        return None
    m = re.search(r"(\d+)\s*dan", text_, re.IGNORECASE)
    return int(m.group(1)) if m else None


def save_job(conn: Connection, job: dict, source: str) -> bool:
    """Insert a job if not already present. Returns True if inserted."""
    if DRY_RUN:
        print(f"[dry-run] would insert: {(job.get('title') or '')[:60]} | {job.get('salary_text')}")
        return False

    salary_text = job.get("salary_text")
    salary_min = job.get("salary_min")
    salary_max = job.get("salary_max")

    # Prefer an exact deadline; fall back to a "N dana do isteka" countdown.
    expires_at = to_utc_iso(job["expires_at"]) if job.get("expires_at") else None
    days_left = job.get("days_to_expiry")
    if expires_at is None and days_left is not None:
        expires_at = (datetime.now(timezone.utc) + timedelta(days=days_left)).isoformat()

    result = conn.execute(
        text("""
            INSERT INTO jobs
            (external_id, title, company, location, job_type,
             salary_min, salary_max, salary_text, salary_shown,
             salary_currency, salary_basis, salary_type, salary_period,
             category, category_raw,
             url, source, posted_at, expires_at,
             description, address_region, contract_type, education, experience, openings)
            VALUES (:external_id, :title, :company, :location, :job_type,
                    :salary_min, :salary_max, :salary_text, :salary_shown,
                    :salary_currency, :salary_basis, :salary_type, :salary_period,
                    :category, :category_raw,
                    :url, :source, :posted_at, :expires_at,
                    :description, :address_region, :contract_type, :education, :experience, :openings)
            ON CONFLICT (external_id) DO NOTHING
            RETURNING id
        """),
        {
            "external_id": job.get("external_id"),
            "title": job.get("title"),
            "company": job.get("company"),
            "location": job.get("location"),
            "job_type": job.get("job_type"),
            "salary_min": salary_min,
            "salary_max": salary_max,
            "salary_text": salary_text,
            "salary_shown": int(bool(job.get("salary_shown"))),
            "salary_currency": "EUR" if salary_min is not None else None,
            "salary_basis": parse_salary_basis(salary_text),
            "salary_type": parse_salary_type(salary_text, salary_min, salary_max),
            "salary_period": parse_salary_period(salary_text, salary_min, salary_max),
            "category": normalize_category(job.get("category_raw")),
            "category_raw": job.get("category_raw"),
            "url": job.get("url"),
            "source": source,
            "posted_at": job.get("posted_at"),
            "expires_at": expires_at,
            "description": job.get("description"),
            "address_region": job.get("address_region"),
            "contract_type": job.get("contract_type"),
            "education": job.get("education"),
            "experience": job.get("experience"),
            "openings": job.get("openings"),
        },
    )
    inserted = result.fetchone() is not None
    conn.commit()
    return inserted


def deactivate_expired(conn: Connection) -> int:
    """Mark jobs past their expires_at as inactive so the API stops serving them.

    Also deactivates jobs with no known deadline once they're MAX_AGE_DAYS old,
    so ads whose deadline we couldn't read don't linger (purge_old_jobs then
    deletes them, since they're already past its 30-day cutoff).
    """
    MAX_AGE_DAYS = 40
    cutoff = (datetime.now(timezone.utc) - timedelta(days=MAX_AGE_DAYS)).isoformat()
    result = conn.execute(
        text("""
            UPDATE jobs SET is_active = :inactive
            WHERE is_active = :active AND (
                (expires_at IS NOT NULL AND expires_at < :now)
                OR (expires_at IS NULL AND scraped_at < :cutoff)
            )
        """),
        {"inactive": False, "active": True, "now": datetime.now(timezone.utc).isoformat(), "cutoff": cutoff},
    )
    conn.commit()
    return result.rowcount


def purge_old_jobs(conn: Connection) -> int:
    """Physically delete jobs that have been inactive for at least 30 days."""
    cutoff = (datetime.now(timezone.utc) - timedelta(days=30)).isoformat()
    result = conn.execute(
        text("""
            DELETE FROM jobs
            WHERE is_active = :inactive AND scraped_at < :cutoff
        """),
        {"inactive": False, "cutoff": cutoff},
    )
    conn.commit()
    return result.rowcount
