"""Fill in details for jobs saved before the scrapers collected them.

For every active job missing a category or an application deadline,
re-fetches its detail page and reads:
  - the portal's own category (posao.hr "Kategorija:" row, mojposao Nuxt
    `rootPosition`), mapped through shared/category_normalizer.py
  - the deadline (posao.hr "Rok za prijavu: DD.MM.YYYY.")
Jobs whose page is gone (the portal redirects removed ads to its homepage)
are deactivated. Only empty fields are filled; nothing already set is
overwritten.

With --remap, skips the network entirely and just recomputes `category` from
the stored `category_raw` — run that after changing the category rules.

Usage:
  python -m scraper.backfill --dry-run
  python -m scraper.backfill --limit 50
  python -m scraper.backfill --remap
"""

import argparse
import asyncio
from collections import Counter
from urllib.parse import urlparse

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


def _is_removed(resp) -> bool:
    """Removed ads 404 or redirect to the portal's homepage."""
    return resp.status_code in (404, 410) or urlparse(str(resp.url)).path in ("", "/")


def _extract(source: str, content: str) -> tuple[str | None, object | None]:
    """(raw category, deadline) from a detail page."""
    if source == "posao":
        return base.extract_posao_category(content), base.parse_posao_deadline(content)
    if source == "mojposao":
        nuxt = base.extract_nuxt_payload(content)
        return (nuxt.get("category") if nuxt else None), None
    return None, None


async def fetch_missing(limit: int | None, dry_run: bool) -> None:
    with base.get_connection() as conn:
        query = """
            SELECT id, source, url, category_raw, expires_at FROM jobs
            WHERE is_active = :active AND url IS NOT NULL
              AND (category_raw IS NULL OR expires_at IS NULL)
            ORDER BY id DESC
        """
        if limit:
            query += f" LIMIT {int(limit)}"
        rows = conn.execute(text(query), {"active": True}).fetchall()
        print(f"{len(rows)} jobs missing a category or deadline.")

        categories = Counter()
        deadlines = removed = failed = 0
        async with base.new_http_client() as client:
            for i, (job_id, source, url, current_raw, current_expiry) in enumerate(rows, 1):
                prefix = f"  [{i}/{len(rows)}] {job_id}:"
                try:
                    resp = await base.retry_with_backoff(client.get, url)
                except Exception as e:
                    failed += 1
                    print(f"{prefix} fetch failed ({e.__class__.__name__})")
                    await base.sleep_jitter(1.0, 2.5)
                    continue

                updates = {}
                if _is_removed(resp):
                    removed += 1
                    updates["is_active"] = False
                    print(f"{prefix} removed from {source} — deactivating")
                else:
                    raw, deadline = _extract(source, resp.text)
                    if raw and not current_raw:
                        updates["category_raw"] = raw
                        updates["category"] = normalize_category(raw)
                        categories[updates["category"]] += 1
                    if deadline and not current_expiry:
                        updates["expires_at"] = deadline.isoformat()
                        deadlines += 1
                    print(f"{prefix} {updates.get('category', '-')} | rok: {deadline.date() if deadline else '-'}")

                if updates and not dry_run:
                    assignments = ", ".join(f"{col} = :{col}" for col in updates)
                    conn.execute(text(f"UPDATE jobs SET {assignments} WHERE id = :id"), {**updates, "id": job_id})
                    conn.commit()
                await base.sleep_jitter(1.0, 2.5)

    print(
        f"\nDone{' (dry run)' if dry_run else ''}: {sum(categories.values())} categories, "
        f"{deadlines} deadlines, {removed} removed ads deactivated, {failed} failed fetches."
    )
    for category, cnt in categories.most_common():
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
