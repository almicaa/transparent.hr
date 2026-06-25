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


async def run_all(max_jobs=10, dry_run=False):
    base.DRY_RUN = dry_run

    print(f"Running Posao.hr (max_jobs={max_jobs}) dry_run={dry_run}")
    await posao_hr.scrape_posao(max_pages=3, max_jobs=max_jobs)

    print(f"\nRunning MojPosao (max_jobs={max_jobs}) dry_run={dry_run}")
    await mojposao_hr.scrape_jobs(max_pages=3, max_jobs=max_jobs)


if __name__ == "__main__":
    parser = argparse.ArgumentParser()
    parser.add_argument("--max_jobs", type=int, default=10)
    parser.add_argument("--dry-run", dest="dry_run", action="store_true")
    args = parser.parse_args()
    asyncio.run(run_all(max_jobs=args.max_jobs, dry_run=args.dry_run))
