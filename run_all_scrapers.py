"""Run all active scrapers in sequence: posao.hr, mojposao.hr

Usage:
  python run_all_scrapers.py --max_jobs 10 --dry-run
"""

import asyncio
import argparse

try:
    from scraper import base_scraper as base
    from scraper import posao_hr, mojposao_hr
except Exception:
    import base_scraper as base
    import posao_hr, mojposao_hr

from shared.email_notify import send_notification


def _format_summary(new_jobs: list[dict]) -> str:
    lines = []
    for job in new_jobs:
        salary = f" — {job['salary_text']}" if job.get("salary_text") else ""
        lines.append(f"- {job.get('title')}{salary}\n  {job.get('url')}")
    return "\n".join(lines)


async def run_all(max_jobs=None, dry_run=False):
    base.DRY_RUN = dry_run

    print(f"Running Posao.hr (max_jobs={max_jobs}) dry_run={dry_run}")
    posao_new = await posao_hr.scrape_posao(max_pages=15, max_jobs=max_jobs)

    print(f"\nRunning MojPosao (max_jobs={max_jobs}) dry_run={dry_run}")
    mojposao_new = await mojposao_hr.scrape_jobs(max_pages=15, max_jobs=max_jobs)

    all_new = posao_new + mojposao_new
    if all_new and not dry_run:
        subject = f"Transparent.hr: {len(all_new)} novih oglasa s plaćom"
        body = _format_summary(all_new)
        send_notification(subject, body)


if __name__ == "__main__":
    parser = argparse.ArgumentParser()
    parser.add_argument("--max_jobs", type=int, default=None, help="Cap per-source job count. Omit for no cap — the caught-up early-exit already bounds normal runs.")
    parser.add_argument("--dry-run", dest="dry_run", action="store_true")
    args = parser.parse_args()
    asyncio.run(run_all(max_jobs=args.max_jobs, dry_run=args.dry_run))
