"""Fill in categories for jobs saved before category scraping existed.

For every active job without a `category_raw`, re-fetches its detail page and
reads the portal's own category (posao.hr "Kategorija:" row, mojposao Nuxt
`rootPosition`). With --remap, skips the network entirely and just recomputes
`category` from the stored `category_raw` — run that after changing the rules
in shared/category_normalizer.py.

Usage:
  python -m scraper.backfill_categories --dry-run
  python -m scraper.backfill_categories --limit 50
  python -m scraper.backfill_categories --remap
"""

import argparse
import asyncio
from collections import Counter

from sqlalchemy import text

try:
    from scraper import base_scraper as base
except Exception:
    import base_scraper as base

from shared.category_normalizer import normalize_category


def remap(dry_run: bool) -> None:
    with base.get_connection() as conn:
        rows = conn.execute(text("SELECT id, category, category_raw FROM jobs WHERE category_raw IS NOT NULL")).fetchall()
        changed = 0
        for job_id, current, raw in rows:
            new = normalize_category(raw)
            if new != current:
                changed += 1
                print(f"  {job_id}: {current!r} -> {new!r}  (raw: {raw!r})")
                if not dry_run:
                    conn.execute(text("UPDATE jobs SET category = :c WHERE id = :id"), {"c": new, "id": job_id})
        if not dry_run:
            conn.commit()
    print(f"Remapped {changed} of {len(rows)} jobs{' (dry run)' if dry_run else ''}.")


def _extract_raw(source: str, content: str) -> str | None:
    if source == "posao":
        return base.extract_posao_category(content)
    if source == "mojposao":
        nuxt = base.extract_nuxt_payload(content)
        return nuxt.get("category") if nuxt else None
    return None


async def fetch_missing(limit: int | None, dry_run: bool) -> None:
    with base.get_connection() as conn:
        query = "SELECT id, source, url FROM jobs WHERE is_active = :active AND category_raw IS NULL AND url IS NOT NULL ORDER BY id DESC"
        if limit:
            query += f" LIMIT {int(limit)}"
        rows = conn.execute(text(query), {"active": True}).fetchall()
        print(f"{len(rows)} jobs without a category.")

        found = Counter()
        failed = 0
        async with base.new_http_client() as client:
            for i, (job_id, source, url) in enumerate(rows, 1):
                try:
                    resp = await base.retry_with_backoff(client.get, url)
                    raw = _extract_raw(source, resp.text)
                except Exception as e:
                    raw = None
                    print(f"  [{i}/{len(rows)}] {job_id}: fetch failed ({e.__class__.__name__})")
                if raw:
                    category = normalize_category(raw)
                    found[category] += 1
                    print(f"  [{i}/{len(rows)}] {job_id}: {raw!r} -> {category}")
                    if not dry_run:
                        conn.execute(
                            text("UPDATE jobs SET category = :c, category_raw = :r WHERE id = :id"),
                            {"c": category, "r": raw, "id": job_id},
                        )
                        conn.commit()
                else:
                    failed += 1
                await base.sleep_jitter(1.0, 2.5)

    print(f"\nDone{' (dry run)' if dry_run else ''}: {sum(found.values())} categorized, {failed} without a category.")
    for category, cnt in found.most_common():
        print(f"  {cnt:4}  {category}")


if __name__ == "__main__":
    parser = argparse.ArgumentParser()
    parser.add_argument("--remap", action="store_true", help="Recompute category from stored category_raw, no fetching.")
    parser.add_argument("--limit", type=int, default=None)
    parser.add_argument("--dry-run", dest="dry_run", action="store_true")
    args = parser.parse_args()
    if args.remap:
        remap(args.dry_run)
    else:
        asyncio.run(fetch_missing(args.limit, args.dry_run))
