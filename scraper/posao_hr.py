"""
Posao.hr scraper — može zahtijevati prilagodbu selektora
Pokreni: python posao_hr.py

Rezultati se spremaju u backend/jobs.db, source='posao'. Ako scraper ne
pronalazi oglase, pokreni debug_selectors.py i prilagodi selektore.
"""

import asyncio
import re
from datetime import datetime
from playwright.async_api import async_playwright

try:
    from scraper import base_scraper as base
except Exception:
    import base_scraper as base

SEARCH_URL = "https://www.posao.hr/poslovi/placa/da/"
ALL_JOBS_URL = "https://www.posao.hr/poslovi/"


async def update_market_stat(browser, conn, filtered_page):
    """Estimate the share of posao.hr ads that show a salary from page counts."""
    try:
        salary_pages = await base.get_listing_page_count(filtered_page)
        ctx = await browser.new_context(user_agent=base.get_ua())
        await base.block_heavy_resources(ctx)
        p = await ctx.new_page()
        await p.goto(ALL_JOBS_URL, wait_until="networkidle", timeout=30000)
        total_pages = await base.get_listing_page_count(p)
        await p.close()
        await ctx.close()
        if salary_pages and total_pages:
            pct = base.save_market_stat(conn, "posao", total_pages, salary_pages)
            print(f"[market] posao.hr: {salary_pages}/{total_pages} stranica ~ {pct}% oglasa s plaćom")
    except Exception as e:
        print("[market] Greška pri procjeni:", e)


async def scrape_posao(max_pages=None, max_jobs=None):
    base.init_db()
    try:
        base.check_robots("https://www.posao.hr")
    except Exception:
        pass

    conn = base.get_connection()
    base.register_source(conn, "posao", "posao.hr", "https://www.posao.hr")
    log_id = base.start_scrape_log(conn, "posao")
    new_jobs = []
    total_saved = 0
    processed = 0
    consecutive_known = 0
    caught_up = False
    # Listings are newest-first, so once we've seen this many already-saved
    # ads in a row, the rest of the feed is stuff we already have — stop
    # instead of re-checking pages we've already fully covered.
    CAUGHT_UP_THRESHOLD = 25
    # Safety net against the OOM hit in production on mojposao: bound the
    # worst case so the run always exits cleanly instead of getting
    # SIGKILLed by Render's 512MB cap mid-run.
    MAX_PROCESSED_SAFETY = 2500

    async with async_playwright() as p:
        browser = await p.chromium.launch(headless=True, args=base.CHROMIUM_LAUNCH_ARGS)
        context = await browser.new_context(
            user_agent=base.get_ua(),
            viewport={"width": 1200, "height": 900},
        )
        await base.block_heavy_resources(context)
        page = await context.new_page()

        # Detail pages are fetched with plain HTTP (no browser) — see
        # base.new_http_client(). Only the listing page above needs a real
        # browser, for the salary-filtered feed's JS.
        http_client = base.new_http_client()

        page_num = 1
        while True:
            if max_pages and page_num > max_pages:
                break
            if processed >= MAX_PROCESSED_SAFETY:
                print(f"  ↳ Dosegnut sigurnosni limit ({MAX_PROCESSED_SAFETY}) — prekidam da ne riskiram OOM.")
                break

            url = f"{SEARCH_URL}?page={page_num}" if page_num > 1 else SEARCH_URL
            page_has_salary = url.startswith(SEARCH_URL)
            print(f"\n--- Stranica {page_num}: {url} ---")

            try:
                await page.goto(url, wait_until="networkidle", timeout=30000)
            except Exception as e:
                print("Greška pri učitavanju:", e)
                break

            if page_num == 1:
                await update_market_stat(browser, conn, page)

            try:
                await page.wait_for_selector("a[href]", timeout=10000)
            except Exception:
                print("Nema linkova na stranici — moguće drugačiji layout.")
                break

            await page.wait_for_timeout(1200)

            anchors = await page.query_selector_all("a[href]")
            candidates = []
            for a in anchors:
                try:
                    href = await a.get_attribute("href") or ""
                    text = (await a.inner_text()).strip()
                    if not text or len(text) < 5:
                        continue
                    # Real job ads look like /oglasi/<slug>/<numeric-id>/ — anything looser
                    # (e.g. "/posao" as a substring) also matches posao.hr's own footer
                    # links (cookie-policy, presskit, about-us) since the domain itself
                    # contains "posao.hr".
                    if re.search(r"/oglasi?/[^/]+/\d+/?", href):
                        candidates.append((a, href, text))
                except Exception:
                    continue

            print(f"Pronađeno kandidata za oglase: {len(candidates)}")

            if not candidates:
                print("Nema kandidata na ovoj stranici — možda treba prilagoditi selektor.")
                break

            seen = set()
            for a, href, text in candidates:
                if max_jobs and processed >= max_jobs:
                    break
                try:
                    url_full = href if href.startswith("http") else ("https://www.posao.hr" + href)
                    m = re.search(r"/(?:oglas|oglasi)/([^/\?#]+)", href)
                    external_id = m.group(1) if m else url_full

                    if external_id in seen:
                        continue
                    seen.add(external_id)

                    if base.job_exists(conn, external_id):
                        consecutive_known += 1
                        processed += 1
                        if consecutive_known >= CAUGHT_UP_THRESHOLD:
                            print(f"  ↳ {consecutive_known} oglasa zaredom već u bazi — prekidam (caught up).")
                            caught_up = True
                            break
                        continue
                    consecutive_known = 0

                    # Card markup is <a><strong>Title</strong><span class="location_system">City</span>
                    # <span class="location_system date_system">N dana do isteka</span>
                    # <span class="location_system with_salary">Plaća u oglasu</span></a> — query the
                    # title/location explicitly instead of guessing from concatenated innerText, which
                    # collapses to a single line (no newlines) on some card layouts and glues everything
                    # together (e.g. "...d)Völkermarkt ili Eisenkappel, Austrija28 dana do istekaPlaća...").
                    title_el = await a.query_selector("strong")
                    if title_el:
                        title_line = (await title_el.inner_text()).strip()
                    else:
                        title_line = text.splitlines()[0].strip() if text.splitlines() else text

                    location_line = None
                    loc_el = await a.query_selector("span.location_system:not(.date_system):not(.with_salary)")
                    if loc_el:
                        location_line = (await loc_el.inner_text()).strip() or None

                    days_to_expiry = None
                    date_el = await a.query_selector("span.date_system")
                    if date_el:
                        days_to_expiry = base.parse_days_to_expiry((await date_el.inner_text()).strip())

                    salary_line = None
                    sal_el = await a.query_selector("span.with_salary")
                    if sal_el:
                        candidate = (await sal_el.inner_text()).strip()
                        if candidate.lower() != "plaća u oglasu" and base.is_valid_salary(candidate):
                            salary_line = candidate

                    job = {"external_id": external_id, "url": url_full, "title": title_line}
                    if location_line:
                        job["location"] = location_line
                    if days_to_expiry is not None:
                        job["days_to_expiry"] = days_to_expiry

                    if salary_line and base.is_valid_salary(salary_line):
                        job["salary_text"] = salary_line
                        job["salary_shown"] = True
                        job["salary_min"], job["salary_max"] = base.parse_salary(salary_line)
                    else:
                        job["salary_shown"] = bool(page_has_salary)

                    parent = await a.evaluate_handle("el => el.closest('article, li, .job, .offer, .listing')")
                    company = None
                    location = None
                    salary_text = None

                    if parent:
                        try:
                            comp = await parent.query_selector("[class*='company'], [class*='employer'], [data-company]")
                            if comp:
                                company = (await comp.inner_text()).strip()
                        except Exception:
                            company = None
                        try:
                            loc = await parent.query_selector("[class*='location'], [class*='city'], [data-location]")
                            if loc:
                                location = (await loc.inner_text()).strip()
                        except Exception:
                            location = None
                        try:
                            ws = await parent.query_selector(".with_salary, .with-salary, .withSalary, span.with_salary")
                            if ws:
                                salary_text = (await ws.inner_text()).strip()
                                if salary_text and salary_text.strip().lower() == "plaća u oglasu":
                                    salary_text = None
                            else:
                                txts = await parent.query_selector_all("span, div, p")
                                for t in txts:
                                    ttxt = (await t.inner_text()).strip()
                                    if any(k in ttxt for k in ["HRK", "EUR", "€", "kn", "plaća", "Plaća", "neto", "bruto"]):
                                        salary_text = ttxt
                                        break

                            if salary_text and not base.is_valid_salary(salary_text):
                                salary_text = None
                            if not salary_text:
                                parent_text = (await parent.inner_text()) or ""
                                if parent_text and re.search(r"(?i)pla[ćc]a", parent_text):
                                    for line in parent_text.splitlines():
                                        if re.search(r"(?i)pla[ćc]a", line):
                                            salary_text = line.strip()
                                            break
                                    if not salary_text:
                                        salary_text = parent_text.strip()[:200]
                        except Exception:
                            salary_text = None

                    if company:
                        job["company"] = company
                    if location:
                        job["location"] = location
                    if salary_text and base.is_valid_salary(salary_text):
                        job["salary_text"] = salary_text
                        job["salary_shown"] = True
                        job["salary_min"], job["salary_max"] = base.parse_salary(salary_text)
                    job["posted_at"] = datetime.now().isoformat()

                    # Always fetch the detail page and try to extract the real salary amount
                    try:
                        resp = await base.retry_with_backoff(http_client.get, url_full)
                        det_sal = None
                        content = resp.text
                        # \b boundaries so this only matches the standalone word "Plaća"
                        # (the salary heading), not a substring inside e.g. "plaćanje"
                        # (referral-bonus disclaimer text that happens to contain "plaća").
                        m = re.search(r"(?i)\bPla[ćc]a\b[:\s]*([^<\n]{1,200})", content)
                        if m and base.is_valid_salary(m.group(1)):
                            det_sal = m.group(1).strip()
                        else:
                            m2 = re.search(r"(\d[\d\.,\s]{0,30}\s*(?:EUR|€|HRK|kn))", content, re.IGNORECASE)
                            if m2:
                                det_sal = m2.group(0).strip()

                        if det_sal:
                            det_sal = base.clean_salary_snippet(det_sal)
                            if base.is_valid_salary(det_sal):
                                job["salary_text"] = det_sal
                                job["salary_min"], job["salary_max"] = base.parse_salary(det_sal)
                        await base.sleep_jitter()
                    except Exception:
                        pass

                    # Only ever mark/save a job as salary_shown when we actually have
                    # extracted text — being from the salary-filtered feed isn't enough
                    # proof on its own (detail-page extraction can fail).
                    job["salary_shown"] = bool(job.get("salary_text")) and base.is_valid_salary(job["salary_text"])
                    if not job["salary_shown"]:
                        processed += 1
                        continue

                    if base.save_job(conn, job, "posao"):
                        total_saved += 1
                        new_jobs.append({"title": job.get("title"), "url": job.get("url"), "salary_text": job.get("salary_text")})
                        print(f"  ✓ {job['title'][:60]} | {'💰 ' + (job.get('salary_text') or '') if job.get('salary_shown') else '❌ plaća skrivena'}")

                    processed += 1

                except Exception as e:
                    print("  Greška pri parsiranju kandidata:", e)
                    continue

            if caught_up:
                break

            try:
                next_btn = await page.query_selector("a[rel='next'], a:has-text('Sljedeća'), button:has-text('Sljedeća')")
            except Exception:
                next_btn = None
            if not next_btn:
                print("Nema više stranica (ili drugačiji pagination).")
                break

            page_num += 1
            await asyncio.sleep(1.0)

        await http_client.aclose()
        await browser.close()

    deactivated = base.deactivate_expired(conn)
    if deactivated:
        print(f"[expiry] Deaktivirano {deactivated} isteklih oglasa.")

    base.finish_scrape_log(conn, log_id, jobs_found=processed, jobs_saved=total_saved, status="success")
    conn.close()
    print(f"\n✅ Gotovo! Ukupno novih oglasa: {total_saved}")
    return new_jobs


if __name__ == "__main__":
    print("🚀 Pokrećem Posao.hr scraper...")
    asyncio.run(scrape_posao(max_pages=6))
