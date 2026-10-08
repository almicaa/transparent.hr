"""
MojPosao.hr scraper
Pokreni: python mojposao_hr.py

Uses mojposao's own internal search API (the same endpoint the site's
frontend calls when you scroll for more results) instead of scraping
rendered HTML. Discovered via network inspection: the page's "infinite
scroll" silently caps out after ~2 batches in some environments (worked
locally, got stuck after one batch on Render) and there's no classic
?page=N pagination on the HTML route either — but the underlying API at
/api/proxy/jobs/search *does* support clean page/totalPages pagination
and already returns title/location/company/salary as structured JSON, no
browser needed at all for the listing.
"""

import asyncio
import re
from datetime import datetime, timezone

try:
    from scraper import base_scraper as base
except Exception:
    import base_scraper as base

API_URL = "https://mojposao.hr/api/proxy/jobs/search"
SEARCH_PAGE_URL = "https://mojposao.hr/pretraga-poslova?sortBy=adtype"


async def _fetch_site_total(http_client) -> int | None:
    """Parse total job count from h1 on the search results page: 'Rezultati pretrage <b>(1603)</b>'"""
    try:
        resp = await base.retry_with_backoff(http_client.get, SEARCH_PAGE_URL)
        m = re.search(r"Rezultati pretrage\s*<b>\((\d+)\)</b>", resp.text)
        if m:
            return int(m.group(1))
    except Exception:
        pass
    return None


def _structured_salary_text(sal: dict):
    salary_min = float(sal["from"] or sal["to"])
    salary_max = float(sal.get("to") or sal["from"])
    currency = str(sal.get("currency") or "eur").upper()
    tax_label = {"gross": "bruto", "net": "neto"}.get(str(sal.get("tax") or "").lower())
    amount = (
        f"{int(salary_min)} {currency}"
        if salary_min == salary_max
        else f"od {int(salary_min)} do {int(salary_max)} {currency}"
    )
    salary_text = f"{amount} {tax_label}".strip() if tax_label else amount
    return salary_text, salary_min, salary_max


def _text_salary_from_benefits(nuxt: dict | None):
    """Text-only salary mentions (e.g. "Bruto plaća u iznosu od 1430€...") live in
    the detail page's Nuxt "benefits" field, not in the listing API's description —
    confirmed by checking ~1300 listing descriptions and finding zero matches there."""
    if not nuxt:
        return None, None, None
    combined = "\n".join(filter(None, [nuxt.get("description"), nuxt.get("benefits")]))
    for line in combined.splitlines():
        line = line.strip().lstrip("-•").strip()
        if re.search(r"(?i)pla[ćc]a|salary", line) and base.is_valid_salary(line):
            amount_m = re.search(r"\d[\d.,\s]{0,12}\s*(?:€|EUR)", line, re.IGNORECASE)
            if amount_m:
                basis = base.parse_salary_basis(line)
                amount_clean = amount_m.group(0).strip()
                salary_text = f"{amount_clean} {basis}".strip() if basis else amount_clean
            else:
                salary_text = line
            salary_min, salary_max = base.parse_salary(salary_text)
            return salary_text, salary_min, salary_max
    return None, None, None


async def _reconcile_active_jobs(conn, http_client) -> int:
    """Deactivate DB jobs that no longer appear anywhere in the current mojposao API.

    The main scrape loop stops early (caught_up), so it never sees jobs that
    have been removed from the API since they were first scraped. This pass
    fetches all current IDs and deactivates any DB job that's gone missing.
    """
    from sqlalchemy import text

    print("[reconcile] Skupljam aktualne ID-ove s mojposao API-ja...")
    current_ids: set[str] = set()
    page = 1
    while True:
        try:
            resp = await base.retry_with_backoff(
                http_client.get, API_URL, params={"sortBy": "adtype", "page": page}
            )
            data = resp.json()
        except Exception as e:
            print(f"[reconcile] Greška na stranici {page}: {e} — preskačem reconciliation.")
            return 0
        items = data.get("items") or []
        if not items:
            break
        for item in items:
            for jd in item.get("jobs") or []:
                if jd.get("id"):
                    current_ids.add(str(jd["id"]))
        total_pages = data.get("totalPages") or 1
        if page >= total_pages:
            break
        page += 1
        await base.sleep_jitter(0.3, 0.7)

    if not current_ids:
        print("[reconcile] API nije vratio nijedan oglas — preskačem.")
        return 0

    print(f"[reconcile] API trenutno ima {len(current_ids)} oglasa.")
    db_result = conn.execute(text(
        "SELECT external_id FROM jobs WHERE source = 'mojposao' AND is_active = true"
    ))
    db_ids = {str(row[0]) for row in db_result.fetchall()}
    gone = db_ids - current_ids
    if not gone:
        return 0
    for eid in gone:
        conn.execute(
            text("UPDATE jobs SET is_active = false WHERE external_id = :eid AND source = 'mojposao'"),
            {"eid": eid},
        )
    conn.commit()
    return len(gone)


async def scrape_jobs(max_pages=None, max_jobs=None):
    base.init_db()
    try:
        base.check_robots("https://www.mojposao.hr")
    except Exception:
        pass

    conn = base.get_connection()
    base.register_source(conn, "mojposao", "mojposao.hr", "https://www.mojposao.hr")
    log_id = base.start_scrape_log(conn, "mojposao")
    new_jobs = []
    total_saved = 0
    processed = 0
    consecutive_known = 0
    caught_up = False
    api_total_jobs = 0
    api_salary_jobs = 0  # structured salary only — fast, no detail-page needed
    # Listing order isn't guaranteed strictly newest-first like posao.hr, so
    # this threshold is more conservative than posao_hr.py's.
    CAUGHT_UP_THRESHOLD = 40
    MAX_PROCESSED_SAFETY = 2500

    http_client = base.new_http_client()
    try:
        page_n = 1
        total_pages = None
        while True:
            if max_pages and page_n > max_pages:
                print("Dosegnut max_pages.")
                break
            if processed >= MAX_PROCESSED_SAFETY:
                print(f"  ↳ Dosegnut sigurnosni limit ({MAX_PROCESSED_SAFETY}) — prekidam da ne riskiram OOM.")
                break
            if max_jobs and processed >= max_jobs:
                break

            resp = await base.retry_with_backoff(
                http_client.get, API_URL, params={"sortBy": "adtype", "page": page_n}
            )
            data = resp.json()
            total_pages = data.get("totalPages") or total_pages
            if page_n == 1:
                api_total_jobs = data.get("total") or 0
            items = data.get("items") or []
            if not items:
                print("Nema više stavki — kraj liste.")
                break

            print(f"\n--- Stranica {page_n}/{total_pages} ({len(items)} grupa) ---")

            # Count structured-salary jobs across all pages (fast — no detail fetch)
            for item in items:
                for jd in item.get("jobs") or []:
                    sal = jd.get("salary") or {}
                    if sal.get("from") or sal.get("to"):
                        api_salary_jobs += 1

            for item in items:
                if caught_up or (max_jobs and processed >= max_jobs) or processed >= MAX_PROCESSED_SAFETY:
                    break
                for jd in item.get("jobs") or []:
                    if caught_up or (max_jobs and processed >= max_jobs) or processed >= MAX_PROCESSED_SAFETY:
                        break

                    external_id = jd.get("id")
                    if not external_id:
                        continue

                    if base.job_exists(conn, external_id):
                        consecutive_known += 1
                        processed += 1
                        if consecutive_known >= CAUGHT_UP_THRESHOLD:
                            print(f"  ↳ {consecutive_known} oglasa zaredom već u bazi — prekidam (caught up).")
                            caught_up = True
                            break
                        continue
                    consecutive_known = 0

                    title = (jd.get("title") or "").strip()
                    if not title:
                        continue

                    org = jd.get("organization")
                    # Confidential postings have organization: "incognito" (a plain
                    # string) instead of the usual {"name": ...} dict.
                    company = org.get("name") if isinstance(org, dict) else None

                    job = {
                        "external_id": external_id,
                        "url": f"https://www.mojposao.hr/posao/{external_id}/{jd.get('slug', '')}",
                        "title": title,
                        "company": company,
                        "location": jd.get("location"),
                        "posted_at": jd.get("publishedAt") or datetime.now().isoformat(),
                    }

                    ends_at = jd.get("endsAt")
                    if ends_at:
                        try:
                            end_dt = datetime.fromisoformat(ends_at.replace("Z", "+00:00"))
                            job["days_to_expiry"] = (end_dt - datetime.now(timezone.utc)).days
                        except Exception:
                            pass

                    # The detail page's Nuxt payload carries the category (rootPosition),
                    # the salary's tax basis (the listing API always returns tax:null) and,
                    # for ads without a structured salary, the benefits text it may be in.
                    nuxt = None
                    try:
                        detail_resp = await base.retry_with_backoff(http_client.get, job["url"])
                        nuxt = base.extract_nuxt_payload(detail_resp.text)
                        await base.sleep_jitter()
                    except Exception:
                        pass
                    if nuxt:
                        job["category_raw"] = nuxt.get("category")

                    salary_text = salary_min = salary_max = None
                    sal = jd.get("salary") or {}
                    if sal.get("from") or sal.get("to"):
                        salary_text, salary_min, salary_max = _structured_salary_text(sal)
                        if not sal.get("tax") and nuxt and isinstance(nuxt.get("salary"), dict):
                            detail_tax = str(nuxt["salary"].get("tax") or "").lower()
                            tax_label = {"gross": "bruto", "net": "neto"}.get(detail_tax)
                            if tax_label:
                                salary_text = f"{salary_text} {tax_label}"
                    else:
                        salary_text, salary_min, salary_max = _text_salary_from_benefits(nuxt)

                    salary_text = base.clean_salary_snippet(salary_text)
                    if salary_min is not None:
                        job["salary_text"] = salary_text
                        job["salary_min"], job["salary_max"] = salary_min, salary_max
                        job["salary_shown"] = True
                    elif salary_text and base.is_valid_salary(salary_text):
                        job["salary_text"] = salary_text
                        job["salary_min"], job["salary_max"] = base.parse_salary(salary_text)
                        job["salary_shown"] = True
                    else:
                        job["salary_shown"] = False

                    # ignore jobs without a visible salary
                    if not job["salary_shown"]:
                        processed += 1
                        continue

                    if base.save_job(conn, job, "mojposao"):
                        total_saved += 1
                        new_jobs.append(
                            {"title": job.get("title"), "url": job.get("url"), "salary_text": job.get("salary_text")}
                        )
                        print(f"  ✓ {job['title'][:50]} | 💰 {job.get('salary_text')}")

                    processed += 1

            if caught_up:
                break
            if total_pages and page_n >= total_pages:
                print("Dosegnuta zadnja stranica.")
                break
            page_n += 1
            await base.sleep_jitter(1.0, 2.5)

        if api_total_jobs:
            site_total = await _fetch_site_total(http_client)
            total_for_stat = site_total if site_total else api_total_jobs
            base.save_salary_stat(conn, "mojposao", total_for_stat, api_salary_jobs)

        if not max_pages and not max_jobs:
            reconciled = await _reconcile_active_jobs(conn, http_client)
            if reconciled:
                print(f"[reconcile] Deaktivirano {reconciled} oglasa koji više nisu na API-ju.")
    finally:
        await http_client.aclose()

    deactivated = base.deactivate_expired(conn)
    if deactivated:
        print(f"[expiry] Deaktivirano {deactivated} isteklih oglasa.")
    purged = base.purge_old_jobs(conn)
    if purged:
        print(f"[expiry] Obrisano {purged} starih neaktivnih oglasa iz baze.")

    base.finish_scrape_log(conn, log_id, jobs_found=processed, jobs_saved=total_saved, status="success")
    conn.close()
    print(f"\n✅ Gotovo! Ukupno novih oglasa: {total_saved}")
    return new_jobs


if __name__ == "__main__":
    print("🚀 Pokrećem MojPosao scraper...")
    asyncio.run(scrape_jobs())
