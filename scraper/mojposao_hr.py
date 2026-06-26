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

SEARCH_URL = "https://www.mojposao.hr/pretraga-poslova"


async def scrape_jobs(max_pages=2, max_jobs=None):
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

    async with async_playwright() as p:
        browser = await p.chromium.launch(headless=True)
        context = await browser.new_context(
            user_agent=base.get_ua(),
            viewport={"width": 1280, "height": 900},
        )
        page = await context.new_page()

        page_num = 1
        while True:
            if max_pages and page_num > max_pages:
                break
            if max_jobs and processed >= max_jobs:
                break

            url = f"{SEARCH_URL}?page={page_num}" if page_num > 1 else SEARCH_URL
            print(f"\n--- Stranica {page_num}: {url} ---")

            try:
                await page.goto(url, wait_until="networkidle", timeout=30000)
            except Exception as e:
                print(f"Greška pri učitavanju: {e}")
                break

            try:
                await page.wait_for_selector("div.job-card", timeout=10000)
            except Exception:
                print("Nema job-card elemenata na ovoj stranici.")
                break

            await page.wait_for_timeout(1500)

            job_cards = await page.query_selector_all("div.job-card")
            print(f"Pronađeno {len(job_cards)} oglasa")

            if not job_cards:
                break

            for card in job_cards:
                if max_jobs and processed >= max_jobs:
                    break
                try:
                    job = {}

                    link_el = await card.query_selector("a[href*='/posao/']")
                    if not link_el:
                        continue
                    href = await link_el.get_attribute("href")
                    job["url"] = f"https://www.mojposao.hr{href}" if not href.startswith("http") else href
                    match = re.search(r"/posao/([^/]+)/", href)
                    job["external_id"] = match.group(1) if match else href

                    job["title"] = (await link_el.inner_text()).strip()
                    if not job["title"]:
                        continue

                    # MojPosao hides salary on the list — open the detail page to get it
                    ua = base.get_ua()
                    ctx = await browser.new_context(user_agent=ua, viewport={"width": 1280, "height": 900})
                    detail_page = await ctx.new_page()
                    try:
                        await base.retry_with_backoff(detail_page.goto, job["url"], wait_until="networkidle", timeout=20000)
                        salary_text = None
                        sal_el = await detail_page.query_selector(
                            "span.with_salary, .with_salary, [class*='salary'], [data-test*='salary'], text=Plaća"
                        )
                        body = await detail_page.content()
                        if sal_el:
                            candidate = (await sal_el.inner_text()).strip()
                            if base.is_valid_salary(candidate) or re.search(r"(?i)^Pla[ćc]a:\s*\d", candidate):
                                salary_text = candidate
                            else:
                                m = re.search(r"(?i)(Pla[ćc]a:\s*[^<]{0,120})", body)
                                if m and base.is_valid_salary(m.group(1)):
                                    salary_text = m.group(1).strip()
                        else:
                            m = re.search(r"(?i)(Pla[ćc]a:\s*[^<]{0,120})", body)
                            if m and base.is_valid_salary(m.group(1)):
                                salary_text = m.group(1).strip()

                        salary_text = base.clean_salary_snippet(salary_text)
                        job["salary_text"] = salary_text
                        if salary_text and (base.is_valid_salary(salary_text) or re.search(r"(?i)^Pla[ćc]a:\s*\d", salary_text)):
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

            next_btn = await page.query_selector("a[rel='next'], [aria-label='Next'], [data-test='pagination-next'], .pagination__next")
            if not next_btn:
                next_btn = await page.query_selector("a:has-text('Sljedeća'), button:has-text('Sljedeća')")
            if not next_btn:
                print("Nema više stranica.")
                break

            page_num += 1
            await asyncio.sleep(1.5)

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
