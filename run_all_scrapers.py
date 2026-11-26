"""Run all active scrapers in sequence: posao.hr, mojposao.hr, HZZ

Each source runs on its own: if one fails, the others still run. A source
whose last two runs failed or found no ads at all (usually a changed page
layout) gets an alert email.

Usage:
  python run_all_scrapers.py --max_jobs 10 --dry-run
"""

import asyncio
import argparse
import os
import sys
import traceback
import urllib.request

try:
    from scraper import base_scraper as base
    from scraper import posao_hr, mojposao_hr, hzz_hr
except Exception:
    import base_scraper as base
    import posao_hr, mojposao_hr, hzz_hr

from shared.email_notify import send_notification


def _heartbeat() -> None:
    """Ping HEARTBEAT_URL (e.g. healthchecks.io) after a good run. The monitor
    alerts when pings stop, so nothing outside has to poll the database and
    keep Neon from scaling to zero."""
    url = os.environ.get("HEARTBEAT_URL")
    if not url:
        return
    try:
        urllib.request.urlopen(url, timeout=10).close()
    except Exception as e:
        print(f"[heartbeat] Ping nije uspio: {e}")


def _format_summary(new_jobs: list[dict]) -> str:
    lines = []
    for job in new_jobs:
        salary = f" — {job['salary_text']}" if job.get("salary_text") else ""
        lines.append(f"- {job.get('title')}{salary}\n  {job.get('url')}")
    return "\n".join(lines)


# A single bad run is often a portal hiccup; alert only when this many in a row failed.
FAILED_RUNS_BEFORE_ALERT = 2


def _is_bad(log: dict) -> bool:
    return log["status"] == "error" or not log["jobs_found"]


def _check_source(source: str, label: str, error: str | None) -> str | None:
    """Close out the source's log and return a problem description when its last
    FAILED_RUNS_BEFORE_ALERT runs all failed, else None."""
    conn = base.get_connection()
    try:
        if error:
            base.fail_running_scrape_logs(conn, source, error)
        logs = base.recent_scrape_logs(conn, source, FAILED_RUNS_BEFORE_ALERT)
    finally:
        conn.close()

    if len(logs) < FAILED_RUNS_BEFORE_ALERT or not all(_is_bad(log) for log in logs):
        if logs and _is_bad(logs[0]):
            print(f"⚠️  {label}: run nije uspio, upozorenje tek ako se ponovi.")
        return None

    runs = f"{FAILED_RUNS_BEFORE_ALERT} runa zaredom"
    if error:
        return f"{label}: scraper je pao ({runs}).\n{error}"
    if logs[0]["status"] == "error":
        return f"{label}: scraper je pao ({runs}).\n{logs[0]['error_message'] or ''}"
    return f"{label}: scraper nije pronašao nijedan oglas ({runs}). Moguće da se promijenio izgled stranice (vidi scraper/debug_selectors.py)."


async def run_all(max_jobs=None, dry_run=False) -> bool:
    """Returns False when some source needs an alert (see _check_source)."""
    base.DRY_RUN = dry_run

    sources = [
        # (scrape_logs source, label, coroutine factory)
        ("posao", "Posao.hr", lambda: posao_hr.scrape_posao(max_pages=15, max_jobs=max_jobs)),
        # mojposao's own search API reports totalPages, which bounds the loop.
        ("mojposao", "MojPosao", lambda: mojposao_hr.scrape_jobs(max_jobs=max_jobs)),
        ("hzz", "HZZ", lambda: hzz_hr.scrape_hzz(max_jobs=max_jobs)),
    ]

    all_new: list[dict] = []
    problems: list[str] = []
    for source, label, scrape in sources:
        print(f"\nRunning {label} (max_jobs={max_jobs}) dry_run={dry_run}")
        error = None
        try:
            all_new += await scrape()
        except Exception:
            error = traceback.format_exc()
            print(f"❌ {label} je pao:\n{error}")
        if dry_run:
            continue
        try:
            problem = _check_source(source, label, error)
        except Exception:
            problem = f"{label}: provjera loga nije uspjela.\n{traceback.format_exc()}"
        if problem:
            problems.append(problem)

    if dry_run:
        return True

    if problems:
        print("\n⚠️  " + "\n\n".join(problems))
        send_notification(
            f"Transparent.hr: problem sa scraperom ({len(problems)})",
            "\n\n".join(problems),
        )

    if all_new:
        send_notification(
            f"Transparent.hr: {len(all_new)} novih oglasa s plaćom",
            _format_summary(all_new),
        )

    return not problems


if __name__ == "__main__":
    parser = argparse.ArgumentParser()
    parser.add_argument("--max_jobs", type=int, default=None, help="Cap per-source job count. Omit for no cap — the caught-up early-exit already bounds normal runs.")
    parser.add_argument("--dry-run", dest="dry_run", action="store_true")
    args = parser.parse_args()
    ok = asyncio.run(run_all(max_jobs=args.max_jobs, dry_run=args.dry_run))
    if ok and not args.dry_run:
        _heartbeat()
    sys.exit(0 if ok else 1)
