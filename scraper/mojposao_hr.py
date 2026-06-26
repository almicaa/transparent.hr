"""
MojPosao.hr scraper
Pokreni: python mojposao_hr.py
"""

import asyncio
import re
from datetime import datetime
from playwright.async_api import async_playwright

try:
    from scraper import base_scraper as base
except Exception:
    import base_scraper as base

SEARCH_URL = "https://www.mojposao.hr/pretraga-poslova?sortBy=adtype"


async def scrape_jobs(max_pages=2, max_jobs=None):
    """max_pages here means "max scroll batches" — mojposao's listing is
    infinite-scroll (a "Učitaj još poslova" load-more pattern), not classic
    ?page=N pagination."""
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
    # Listing order isn't guaranteed strictly newest-first like posao.hr, so
    # this threshold is more conservative than posao_hr.py's.
    CAUGHT_UP_THRESHOLD = 40

    async with async_playwright() as p:
        browser = await p.chromium.launch(headless=True)
        context = await browser.new_context(
            user_agent=base.get_ua(),
            viewport={"width": 1280, "height": 900},
        )
        page = await context.new_page()

        print(f"\n--- {SEARCH_URL} ---")
        try:
            await page.goto(SEARCH_URL, wait_until="networkidle", timeout=30000)
            await page.wait_for_selector("div.job-card", timeout=10000)
        except Exception as e:
            print(f"Greška pri učitavanju: {e}")
            await browser.close()
            base.finish_scrape_log(conn, log_id, jobs_found=0, jobs_saved=0, status="error", error_message=str(e))
            conn.close()
            return new_jobs

        await page.wait_for_timeout(1500)

        seen_ids = set()
        scroll_round = 0

        while True:
            if max_pages and scroll_round >= max_pages:
                print("Dosegnut max_pages (scroll batches).")
                break
            if max_jobs and processed >= max_jobs:
                break
            if caught_up:
                break

            job_cards = await page.query_selector_all("div.job-card")
            print(f"Ukupno učitano kartica: {len(job_cards)} (novih za obraditi: {len(job_cards) - len(seen_ids)})")

            found_new = False
            for card in job_cards:
                if max_jobs and processed >= max_jobs:
                    break
                try:
                    link_el = await card.query_selector("a[href*='/posao/']")
                    if not link_el:
                        continue
                    href = await link_el.get_attribute("href")
                    match = re.search(r"/posao/([^/]+)/", href)
                    external_id = match.group(1) if match else href

                    if external_id in seen_ids:
                        continue
                    seen_ids.add(external_id)
                    found_new = True

                    job = {}
                    job["url"] = f"https://www.mojposao.hr{href}" if not href.startswith("http") else href
                    job["external_id"] = external_id

                    job["title"] = (await link_el.inner_text()).strip()
                    if not job["title"]:
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

                    # MojPosao hides salary on the list — open the detail page to get it.
                    # Scraping raw HTML is unreliable (every page has a sitewide "Osvoji
                    # 500€!" referral banner that false-positives as a salary). The Nuxt
                    # hydration payload has clean description/benefits text instead.
                    ua = base.get_ua()
                    ctx = await browser.new_context(user_agent=ua, viewport={"width": 1280, "height": 900})
                    detail_page = await ctx.new_page()
                    try:
                        await base.retry_with_backoff(detail_page.goto, job["url"], wait_until="networkidle", timeout=20000)
                        body = await detail_page.content()
                        salary_text = None
                        salary_min = salary_max = None

                        nuxt = base.extract_nuxt_payload(body)
                        if nuxt:
                            sal = nuxt.get("salary")
                            if isinstance(sal, dict) and sal.get("from"):
                                # Structured field — exact numbers, no text parsing needed.
                                salary_min = float(sal["from"])
                                salary_max = float(sal.get("to") or sal["from"])
                                currency = str(sal.get("currency") or "eur").upper()
                                tax_label = {"gross": "bruto", "net": "neto"}.get(str(sal.get("tax") or "").lower())
                                amount = (
                                    f"{int(salary_min)} {currency}"
                                    if salary_min == salary_max
                                    else f"od {int(salary_min)} do {int(salary_max)} {currency}"
                                )
                                salary_text = f"{amount} {tax_label}".strip() if tax_label else amount
                            else:
                                combined = "\n".join(filter(None, [nuxt.get("description"), nuxt.get("benefits")]))
                                for line in combined.splitlines():
                                    line = line.strip().lstrip("-•").strip()
                                    if re.search(r"(?i)pla[ćc]a|salary", line) and base.is_valid_salary(line):
                                        # Don't keep the whole sentence (e.g. "...i zagarantirano
                                        # povećanje nakon 1. i 2. godine...") — just the first
                                        # amount, the rest belongs in the original ad, not the card.
                                        amount_m = re.search(r"\d[\d.,\s]{0,12}\s*(?:€|EUR)", line, re.IGNORECASE)
                                        if amount_m:
                                            basis = base.parse_salary_basis(line)
                                            amount_clean = amount_m.group(0).strip()
                                            salary_text = f"{amount_clean} {basis}".strip() if basis else amount_clean
                                        else:
                                            salary_text = line
                                        salary_min, salary_max = base.parse_salary(salary_text)
                                        break

                        if not salary_text:
                            # Fallback for pages without the Nuxt payload (layout changes etc.)
                            m = re.search(r"(?i)(Pla[ćc]a:\s*[^<]{0,120})", body)
                            if m and base.is_valid_salary(m.group(1)):
                                salary_text = m.group(1).strip()

                        salary_text = base.clean_salary_snippet(salary_text)
                        job["salary_text"] = salary_text
                        if salary_min is not None:
                            job["salary_min"], job["salary_max"] = salary_min, salary_max
                            job["salary_shown"] = True
                        elif salary_text and base.is_valid_salary(salary_text):
                            job["salary_min"], job["salary_max"] = base.parse_salary(salary_text)
                            job["salary_shown"] = True
                        else:
                            job["salary_shown"] = False
                    except Exception:
                        job["salary_text"] = None
                        job["salary_shown"] = False
                    finally:
                        await detail_page.close()
                        await ctx.close()

                    # ignore jobs without a visible salary
                    if not job.get("salary_shown"):
                        processed += 1
                        await base.sleep_jitter()
                        continue

                    # Prefer the clean Nuxt payload fields (same one used for salary)
                    # over guessing at card CSS classes.
                    if nuxt and nuxt.get("organization"):
                        job["company"] = nuxt["organization"]
                    if nuxt and nuxt.get("location"):
                        job["location"] = nuxt["location"]

                    if not job.get("company"):
                        all_links = await card.query_selector_all("a[href]")
                        for lnk in all_links:
                            lnk_href = await lnk.get_attribute("href") or ""
                            if "/posao/" not in lnk_href and "/poslodavac/" in lnk_href:
                                job["company"] = (await lnk.inner_text()).strip()
                                break
                    if not job.get("company"):
                        company_el = await card.query_selector(
                            "[class*='employer'], [class*='company'], [data-test*='employer'], [data-test*='company']"
                        )
                        if company_el:
                            job["company"] = (await company_el.inner_text()).strip()

                    if not job.get("location"):
                        loc_el = await card.query_selector("[class*='location'], [data-test*='location'], [class*='city']")
                        if loc_el:
                            job["location"] = (await loc_el.inner_text()).strip()

                    type_el = await card.query_selector("[class*='type'], [data-test*='type'], [class*='employment']")
                    if type_el:
                        job["job_type"] = (await type_el.inner_text()).strip()

                    time_el = await card.query_selector("time")
                    if time_el:
                        job["posted_at"] = await time_el.get_attribute("datetime") or (await time_el.inner_text()).strip()
                    else:
                        job["posted_at"] = datetime.now().isoformat()

                    if base.save_job(conn, job, "mojposao"):
                        total_saved += 1
                        new_jobs.append({"title": job.get("title"), "url": job.get("url"), "salary_text": job.get("salary_text")})
                        print(f"  ✓ {job['title'][:50]} | 💰 {job.get('salary_text')}")

                    processed += 1
                    await base.sleep_jitter()

                except Exception as e:
                    print(f"  Greška: {e}")
                    continue

            if caught_up:
                break

            prev_count = len(job_cards)
            await page.evaluate("window.scrollTo(0, document.body.scrollHeight)")
            await page.wait_for_timeout(2000)
            new_count = len(await page.query_selector_all("div.job-card"))
            scroll_round += 1

            if new_count <= prev_count and not found_new:
                print("Nema više oglasa za učitati (scroll ne dodaje nove).")
                break

        await browser.close()

    deactivated = base.deactivate_expired(conn)
    if deactivated:
        print(f"[expiry] Deaktivirano {deactivated} isteklih oglasa.")

    base.finish_scrape_log(conn, log_id, jobs_found=processed, jobs_saved=total_saved, status="success")
    conn.close()
    print(f"\n✅ Gotovo! Ukupno novih oglasa: {total_saved}")
    return new_jobs


if __name__ == "__main__":
    print("🚀 Pokrećem MojPosao scraper...")
    asyncio.run(scrape_jobs(max_pages=2))
