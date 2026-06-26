"""Shared scraper utilities: anti-blocking config, DB access, salary parsing.

DB layer uses SQLAlchemy so the same code writes to local SQLite during
development and to the production Postgres (Neon) database when DATABASE_URL
is set — critical for scrapers running on a schedule against production.
"""

import random
import asyncio
import os
import re
import sys
import urllib.request
from datetime import datetime, timezone
from urllib.parse import urljoin, urlparse

from sqlalchemy import create_engine, text
from sqlalchemy.engine import Connection

sys.path.insert(0, os.path.normpath(os.path.join(os.path.dirname(__file__), "..")))
from shared.salary_parser import (  # noqa: E402,F401
    parse_salary,
    parse_salary_basis,
    parse_salary_type,
    is_valid_salary,
    clean_salary_snippet,
)

DB_PATH = os.path.normpath(os.path.join(os.path.dirname(__file__), "..", "backend", "jobs.db"))


def _resolve_database_url() -> str:
    url = os.environ.get("DATABASE_URL")
    if not url:
        return f"sqlite:///{DB_PATH}"
    if url.startswith("postgresql://") and "+psycopg" not in url:
        url = url.replace("postgresql://", "postgresql+psycopg://", 1)
    return url


DATABASE_URL = _resolve_database_url()
_engine = create_engine(DATABASE_URL)
IS_SQLITE = _engine.dialect.name == "sqlite"


def get_connection() -> Connection:
    """Open a new DB connection. Caller is responsible for closing it."""
    return _engine.connect()


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


def get_ua():
    return random.choice(UA_LIST)


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
                salary_min   REAL,
                salary_max   REAL,
                salary_text  TEXT,
                salary_shown INTEGER DEFAULT 0,
                salary_currency TEXT,
                salary_basis TEXT,
                salary_type  TEXT,
                description  TEXT,
                url          TEXT,
                source       TEXT,
                posted_at    TEXT,
                scraped_at   TEXT DEFAULT (datetime('now')),
                expires_at   TEXT,
                is_active    INTEGER DEFAULT 1
            )
        """))
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


def save_market_stat(conn: Connection, source: str, total_pages: int, salary_pages: int) -> float | None:
    """Store a page-count-based estimate of the share of ads with a visible salary.

    This is an approximation (ads per page can differ between the filtered
    and unfiltered listing) — good enough for a "roughly X%" landing stat,
    without crawling thousands of pages just to count exact totals.
    """
    if not total_pages:
        return None
    pct = round(min(salary_pages, total_pages) / total_pages * 100, 1)
    conn.execute(
        text("""
            INSERT INTO market_stats (source, total_pages, salary_pages, estimated_pct, computed_at)
            VALUES (:source, :total_pages, :salary_pages, :pct, :computed_at)
            ON CONFLICT(source) DO UPDATE SET
                total_pages=excluded.total_pages,
                salary_pages=excluded.salary_pages,
                estimated_pct=excluded.estimated_pct,
                computed_at=excluded.computed_at
        """),
        {
            "source": source,
            "total_pages": total_pages,
            "salary_pages": salary_pages,
            "pct": pct,
            "computed_at": datetime.now(timezone.utc).isoformat(),
        },
    )
    conn.commit()
    return pct


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

    days_left = job.get("days_to_expiry")
    expires_at = None
    if days_left is not None:
        from datetime import timedelta

        expires_at = (datetime.now(timezone.utc) + timedelta(days=days_left)).isoformat()

    result = conn.execute(
        text("""
            INSERT INTO jobs
            (external_id, title, company, location, job_type,
             salary_min, salary_max, salary_text, salary_shown,
             salary_currency, salary_basis, salary_type,
             url, source, posted_at, expires_at)
            VALUES (:external_id, :title, :company, :location, :job_type,
                    :salary_min, :salary_max, :salary_text, :salary_shown,
                    :salary_currency, :salary_basis, :salary_type,
                    :url, :source, :posted_at, :expires_at)
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
            "url": job.get("url"),
            "source": source,
            "posted_at": job.get("posted_at"),
            "expires_at": expires_at,
        },
    )
    inserted = result.fetchone() is not None
    conn.commit()
    return inserted


def deactivate_expired(conn: Connection) -> int:
    """Mark jobs past their expires_at as inactive so the API stops serving them."""
    result = conn.execute(
        text("""
            UPDATE jobs SET is_active = :inactive
            WHERE is_active = :active AND expires_at IS NOT NULL AND expires_at < :now
        """),
        {"inactive": False, "active": True, "now": datetime.now(timezone.utc).isoformat()},
    )
    conn.commit()
    return result.rowcount
