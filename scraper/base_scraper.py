"""Shared scraper utilities: anti-blocking config, DB access, salary parsing."""

import random
import asyncio
import os
import re
import sys
import sqlite3
import urllib.request
from datetime import datetime, timezone
from urllib.parse import urljoin, urlparse

sys.path.insert(0, os.path.normpath(os.path.join(os.path.dirname(__file__), "..")))
from shared.salary_parser import (  # noqa: E402,F401
    parse_salary,
    parse_salary_basis,
    parse_salary_type,
    is_valid_salary,
    clean_salary_snippet,
)

DB_PATH = os.path.normpath(os.path.join(os.path.dirname(__file__), "..", "backend", "jobs.db"))

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
                text = resp.read().decode("utf-8", errors="ignore")
        except Exception as e:
            print(f"[robots] No robots.txt at {robots_url} ({e})")
            return {"crawl_delay": None, "disallow": []}

        crawl_delay = None
        disallow = []
        ua = None
        for line in text.splitlines():
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
    conn = sqlite3.connect(DB_PATH)
    conn.execute("""
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
            description  TEXT,
            url          TEXT,
            source       TEXT,
            posted_at    TEXT,
            scraped_at   TEXT DEFAULT (datetime('now'))
        )
    """)
    conn.execute("""
        CREATE TABLE IF NOT EXISTS market_stats (
            source         TEXT PRIMARY KEY,
            total_pages    INTEGER NOT NULL,
            salary_pages   INTEGER NOT NULL,
            estimated_pct  REAL NOT NULL,
            computed_at    TEXT NOT NULL
        )
    """)
    conn.execute("""
        CREATE TABLE IF NOT EXISTS job_sources (
            name          TEXT PRIMARY KEY,
            display_name  TEXT NOT NULL,
            base_url      TEXT
        )
    """)
    conn.execute("""
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
    """)
    conn.commit()
    conn.close()


def register_source(conn: sqlite3.Connection, name: str, display_name: str, base_url: str | None = None):
    conn.execute(
        """
        INSERT INTO job_sources (name, display_name, base_url) VALUES (?,?,?)
        ON CONFLICT(name) DO UPDATE SET display_name=excluded.display_name, base_url=excluded.base_url
        """,
        (name, display_name, base_url),
    )
    conn.commit()


def start_scrape_log(conn: sqlite3.Connection, source: str) -> int:
    cur = conn.execute(
        "INSERT INTO scrape_logs (source, started_at, jobs_found, jobs_saved, status) VALUES (?,?,0,0,?)",
        (source, datetime.now(timezone.utc).isoformat(), "running"),
    )
    conn.commit()
    return cur.lastrowid


def finish_scrape_log(
    conn: sqlite3.Connection,
    log_id: int,
    *,
    jobs_found: int,
    jobs_saved: int,
    status: str = "success",
    error_message: str | None = None,
):
    conn.execute(
        """
        UPDATE scrape_logs
        SET finished_at=?, jobs_found=?, jobs_saved=?, status=?, error_message=?
        WHERE id=?
        """,
        (datetime.now(timezone.utc).isoformat(), jobs_found, jobs_saved, status, error_message, log_id),
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


def job_exists(conn: sqlite3.Connection, external_id: str) -> bool:
    """Cheap dedup check — lets a scraper skip the expensive detail-page visit
    for ads it has already saved, instead of just relying on INSERT OR IGNORE
    after doing all that work anyway."""
    row = conn.execute("SELECT 1 FROM jobs WHERE external_id = ? LIMIT 1", (external_id,)).fetchone()
    return row is not None


def save_market_stat(conn: sqlite3.Connection, source: str, total_pages: int, salary_pages: int) -> float | None:
    """Store a page-count-based estimate of the share of ads with a visible salary.

    This is an approximation (ads per page can differ between the filtered
    and unfiltered listing) — good enough for a "roughly X%" landing stat,
    without crawling thousands of pages just to count exact totals.
    """
    if not total_pages:
        return None
    pct = round(min(salary_pages, total_pages) / total_pages * 100, 1)
    conn.execute(
        """
        INSERT INTO market_stats (source, total_pages, salary_pages, estimated_pct, computed_at)
        VALUES (?,?,?,?,?)
        ON CONFLICT(source) DO UPDATE SET
            total_pages=excluded.total_pages,
            salary_pages=excluded.salary_pages,
            estimated_pct=excluded.estimated_pct,
            computed_at=excluded.computed_at
        """,
        (source, total_pages, salary_pages, pct, datetime.now(timezone.utc).isoformat()),
    )
    conn.commit()
    return pct


def save_job(conn: sqlite3.Connection, job: dict, source: str) -> bool:
    """Insert a job if not already present. Returns True if inserted."""
    if DRY_RUN:
        print(f"[dry-run] would insert: {(job.get('title') or '')[:60]} | {job.get('salary_text')}")
        return False

    salary_text = job.get("salary_text")
    salary_min = job.get("salary_min")
    salary_max = job.get("salary_max")
    try:
        conn.execute(
            """
            INSERT OR IGNORE INTO jobs
            (external_id, title, company, location, job_type,
             salary_min, salary_max, salary_text, salary_shown,
             salary_currency, salary_basis, salary_type,
             url, source, posted_at)
            VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,?,?)
            """,
            (
                job.get("external_id"),
                job.get("title"),
                job.get("company"),
                job.get("location"),
                job.get("job_type"),
                salary_min,
                salary_max,
                salary_text,
                int(bool(job.get("salary_shown"))),
                "EUR" if salary_min is not None else None,
                parse_salary_basis(salary_text),
                parse_salary_type(salary_text, salary_min, salary_max),
                job.get("url"),
                source,
                job.get("posted_at"),
            ),
        )
        conn.commit()
        return True
    except sqlite3.IntegrityError:
        return False
