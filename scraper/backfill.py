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

With --hzz-details, re-reads HZZ jobs with a salary but no description and
fills the description, county, contract type, education, experience and
number of openings.

Usage:
  python -m scraper.backfill --dry-run
  python -m scraper.backfill --limit 50
  python -m scraper.backfill --remap
  python -m scraper.backfill --hzz-details --dry-run --limit 5
"""

import argparse
import asyncio
from collections import Counter
from urllib.parse import urlparse

from sqlalchemy import text

try:
    from scraper import base_scraper as base
    from scraper import hzz_hr
except Exception:
    import base_scraper as base
    import hzz_hr

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
                        updates["expires_at"] = base.to_utc_iso(deadline)
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


async def fetch_hzz_details(limit: int | None, dry_run: bool) -> None:
    """Re-read live HZZ jobs with a salary that were saved before the scraper
    kept the description and the other detail fields. Only empty columns are
    filled. Ads gone from HZZ are left to the scraper's feed reconciliation."""
    with base.get_connection() as conn:
        query = """
            SELECT id, url, {cols} FROM jobs
            WHERE source = 'hzz' AND is_active = :active AND salary_shown = 1
              AND url IS NOT NULL AND description IS NULL
            ORDER BY id DESC
        """.format(cols=", ".join(hzz_hr.DETAIL_FIELDS))
        if limit:
            query += f" LIMIT {int(limit)}"
        rows = conn.execute(text(query), {"active": True}).fetchall()
        print(f"{len(rows)} HZZ jobs without a description.")

        filled = Counter()
        failed = 0
        async with base.new_http_client() as client:
            # Prime HZZ's cookie-support redirect once, like the scraper does.
            await base.retry_with_backoff(client.get, hzz_hr.SITE + "/RSS.aspx")
            for i, row in enumerate(rows, 1):
                job_id, url, current = row[0], row[1], dict(zip(hzz_hr.DETAIL_FIELDS, row[2:]))
                prefix = f"  [{i}/{len(rows)}] {job_id}:"
                try:
                    resp = await base.retry_with_backoff(client.get, url)
                    detail = hzz_hr.parse_detail(resp.text)
                except Exception as e:
                    failed += 1
                    print(f"{prefix} fetch failed ({e.__class__.__name__})")
                    await base.sleep_jitter(*hzz_hr.DETAIL_DELAY)
                    continue

                updates = {
                    col: detail[col]
                    for col in hzz_hr.DETAIL_FIELDS
                    if detail.get(col) is not None and current[col] is None
                }
                filled.update(updates.keys())
                print(f"{prefix} {', '.join(updates) or 'nothing new'}")
                if updates and not dry_run:
                    assignments = ", ".join(f"{col} = :{col}" for col in updates)
                    conn.execute(text(f"UPDATE jobs SET {assignments} WHERE id = :id"), {**updates, "id": job_id})
                    conn.commit()
                await base.sleep_jitter(*hzz_hr.DETAIL_DELAY)

    print(f"\nDone{' (dry run)' if dry_run else ''}: {failed} failed fetches. Filled per column:")
    for col in hzz_hr.DETAIL_FIELDS:
        print(f"  {filled[col]:4}  {col}")


if __name__ == "__main__":
    parser = argparse.ArgumentParser()
    parser.add_argument("--remap", action="store_true", help="Recompute category from stored category_raw, no fetching.")
    parser.add_argument("--hzz-details", dest="hzz_details", action="store_true", help="Fill description and other detail fields of HZZ jobs.")
    parser.add_argument("--limit", type=int, default=None)
    parser.add_argument("--dry-run", dest="dry_run", action="store_true")
    args = parser.parse_args()
    if args.remap:
        remap(args.dry_run)
    elif args.hzz_details:
        asyncio.run(fetch_hzz_details(args.limit, args.dry_run))
    else:
        asyncio.run(fetch_missing(args.limit, args.dry_run))
