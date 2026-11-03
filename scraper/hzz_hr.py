"""
HZZ (Hrvatski zavod za zapošljavanje) burza rada scraper
Pokreni: python hzz_hr.py

HZZ publishes an RSS feed per occupation category (rss/rsskat1001.xml …
rsskat1020.xml) listing every open vacancy in it, so the full current set is
20 small requests instead of paging through the ASP.NET search form. The feed
has no salary, but every detail page (RadnoMjesto_Ispis.aspx?WebSifra=…) has a
"Bruto plaća" field employers fill in, read here by its stable element id.

The site answers the first request with a cookie-support redirect
(?AspxAutoDetectCookieSupport=1); a client that keeps cookies sails through.
Feeds are ISO-8859-2, detail pages UTF-8. No robots.txt (404).
"""

import asyncio
import html
import re
from datetime import datetime, timedelta, timezone

try:
    from scraper import base_scraper as base
except Exception:
    import base_scraper as base

SITE = "https://burzarada.hzz.hr"
DETAIL_URL = SITE + "/RadnoMjesto_Ispis.aspx?WebSifra={id}"

# Feed id -> HZZ's own category label (kept as category_raw; the shared
# normalizer maps it onto our grane).
CATEGORIES = {
    1001: "Informatički, računalni i stručnjaci za Internet",
    1002: "Ekonomisti, pravnici, administrativci",
    1003: "Umjetnici, dizajneri, stručnjaci u kulturi",
    1004: "Građevinari, arhitekti, geodete",
    1005: "Trgovci, promotori, oglašivači",
    1006: "Ugostitelji, radnici u turizmu",
    1007: "Geolozi, rudari, metalurzi",
    1008: "Strojari i brodograditelji",
    1009: "Stručnjaci za elektrotehniku",
    1010: "Kemijski i prehrambeni stručnjaci",
    1011: "Obrađivači drva, proizvođači papira, grafičari",
    1012: "Tekstilci i kožari",
    1013: "Stručnjaci u prometu",
    1014: "Učitelji, nastavnici, profesori",
    1015: "Društveno-humanistički stručnjaci",
    1016: "Prirodoslovno-matematički stručnjaci",
    1017: "Zdravstvo, socijalna skrb, njega",
    1018: "Poljoprivredni, šumarski, ribarski stručnjaci",
    1019: "Usluge u kući, komunalne usluge i ostala zanimanja",
    1020: "Direktori, ravnatelji, čelnici",
}

# Istrian towns are listed bilingually ("POREČ-PARENZO"); keep the Croatian name
# so they line up with the same city from other portals.
BILINGUAL_PLACES = {
    "POREČ-PARENZO": "Poreč",
    "ROVINJ-ROVIGNO": "Rovinj",
    "PULA-POLA": "Pula",
    "UMAG-UMAGO": "Umag",
    "NOVIGRAD-CITTANOVA": "Novigrad",
    "BUJE-BUIE": "Buje",
    "VODNJAN-DIGNANO": "Vodnjan",
    "FAŽANA-FASANA": "Fažana",
    "BRTONIGLA-VERTENEGLIO": "Brtonigla",
    "GROŽNJAN-GRISIGNANA": "Grožnjan",
    "VIŽINADA-VISINADA": "Vižinada",
    "OPRTALJ-PORTOLE": "Oprtalj",
    "TAR-VABRIGA-TORRE-ABREGA": "Tar-Vabriga",
    "KAŠTELIR-LABINCI-CASTELLIERE-S. DOMENICA": "Kaštelir-Labinci",
}

# A detail page is about 35 KB from a public-sector server; stay gentle.
DETAIL_DELAY = (0.8, 1.6)
# HZZ lists ~9,000 vacancies and only ~5% carry a salary, so the first fill
# reads thousands of pages. Capping each run (~30 min) spreads that over a few
# scheduled runs; afterwards only new ads are read and runs are short.
MAX_DETAILS_PER_RUN = 1500
_HR_TZ = timezone(timedelta(hours=1))


def _parse_feed(xml: str, category: str) -> list[dict]:
    items = []
    for block in re.findall(r"<item>(.*?)</item>", xml, re.S):
        link = re.search(r"WebSifra=(\d+)", block)
        if not link:
            continue
        pub = re.search(r"<pubDate>\s*(\d{1,2})\.(\d{1,2})\.(\d{4})", block)
        items.append(
            {
                "web_id": link.group(1),
                "category_raw": category,
                "posted_at": f"{pub.group(3)}-{int(pub.group(2)):02d}-{int(pub.group(1)):02d}" if pub else None,
            }
        )
    return items


def _span(page: str, element_id: str, multiline: bool = False) -> str | None:
    """Text of a detail-page field. With `multiline`, keeps the employer's line
    breaks (job descriptions are usually "- task" lists)."""
    m = re.search(rf'id="ctl00_MainContent_{element_id}"[^>]*>(.*?)</span>', page, re.S)
    if not m:
        return None
    value = html.unescape(re.sub(r"<br\s*/?>", "\n", m.group(1)))
    value = re.sub(r"<[^>]+>", " ", value)
    if not multiline:
        return re.sub(r"\s+", " ", value).strip() or None
    lines = (re.sub(r"[ \t\r\f\v]+", " ", line).strip() for line in value.split("\n"))
    return "\n".join(line for line in lines if line) or None


def _region(raw: str | None) -> str | None:
    """'BOBOVICA, ZAGREBAČKA ŽUPANIJA' -> 'Zagrebačka županija'; 'ZAGREB, GRAD ZAGREB' -> 'Grad Zagreb'."""
    if not raw or "," not in raw:
        return None
    region = raw.split(",", 1)[1].strip()
    if not region:
        return None
    if region.upper() == "GRAD ZAGREB":
        return "Grad Zagreb"
    lower = region.lower()
    return lower[0].upper() + lower[1:]


def _int(raw: str | None) -> int | None:
    m = re.match(r"\d+", raw or "")
    return int(m.group(0)) if m else None


def _place(raw: str | None) -> str | None:
    """'POREČ-PARENZO, ISTARSKA ŽUPANIJA' -> 'Poreč'; 'SLAVONSKI BROD, …' -> 'Slavonski Brod'."""
    if not raw:
        return None
    city = raw.split(",")[0].strip()
    if city.upper() in BILINGUAL_PLACES:
        return BILINGUAL_PLACES[city.upper()]
    return "-".join(" ".join(w.capitalize() for w in part.split()) for part in city.split("-"))


def _deadline(raw: str | None) -> datetime | None:
    """'21.10.2026.' -> end of that day, Croatian time."""
    m = re.match(r"(\d{1,2})\.(\d{1,2})\.(\d{4})", raw or "")
    if not m:
        return None
    day = datetime(int(m.group(3)), int(m.group(2)), int(m.group(1)), 23, 59, tzinfo=_HR_TZ)
    return day


def parse_detail(page: str) -> dict:
    title = re.search(r"<h3>(.*?)</h3>", page, re.S)
    salary = _span(page, "lblPlaca")
    place = _span(page, "lblMjestoRada")
    return {
        "title": re.sub(r"\s+", " ", html.unescape(title.group(1))).strip() if title else None,
        "company": _span(page, "lblNazivPoslodavca"),
        "location": _place(place),
        "address_region": _region(place),
        "expires_at": _deadline(_span(page, "lblVrijediDo")),
        "job_type": _span(page, "lblRadnoVrijeme"),
        "contract_type": _span(page, "lblVrstaZaposlenja"),
        "description": _span(page, "lblOpisPosla", multiline=True),
        "education": _span(page, "lblRazinaObrazovanja"),
        "experience": _span(page, "lblRadnoIskustvo"),
        "openings": _int(_span(page, "lblBrojRadnika")),
        # The field is labelled "Bruto plaća", so the basis is always bruto.
        "salary_text": f"{salary} bruto" if salary and re.search(r"\d", salary) else None,
    }


# Columns parse_detail fills that backfill may set on jobs saved before the
# scraper read them.
DETAIL_FIELDS = ("company", "address_region", "contract_type", "description", "education", "experience", "openings")


async def _fetch_feeds(http_client) -> list[dict] | None:
    """Every open vacancy across all category feeds, or None if any feed failed
    (so reconciliation never deactivates a whole category by mistake)."""
    jobs: dict[str, dict] = {}
    for feed_id, category in CATEGORIES.items():
        try:
            resp = await base.retry_with_backoff(http_client.get, f"{SITE}/rss/rsskat{feed_id}.xml")
            xml = resp.content.decode("iso-8859-2", errors="replace")
        except Exception as e:
            print(f"[hzz] Feed {feed_id} nije dostupan: {e}")
            return None
        for item in _parse_feed(xml, category):
            jobs.setdefault(item["web_id"], item)
        await base.sleep_jitter(0.3, 0.8)
    return list(jobs.values())


def _reconcile(conn, current_ids: set[str]) -> int:
    """Deactivate HZZ jobs that are no longer in any feed."""
    from sqlalchemy import text

    rows = conn.execute(text("SELECT external_id FROM jobs WHERE source = 'hzz' AND is_active = :active"), {"active": True})
    gone = {r[0] for r in rows.fetchall()} - current_ids
    for eid in gone:
        conn.execute(text("UPDATE jobs SET is_active = :inactive WHERE external_id = :eid"), {"inactive": False, "eid": eid})
    conn.commit()
    return len(gone)


async def scrape_hzz(max_jobs=None):
    base.init_db()
    base.check_robots(SITE)

    db = base.ReconnectingDB()
    db.run(base.register_source, "hzz", "HZZ", SITE)
    log_id = db.run(base.start_scrape_log, "hzz")
    new_jobs = []
    saved = processed = with_salary = 0

    http_client = base.new_http_client()
    try:
        # Prime the cookie-support redirect once; the client keeps the cookie.
        await base.retry_with_backoff(http_client.get, SITE + "/RSS.aspx")
        feed_items = await _fetch_feeds(http_client)
        if feed_items is None:
            raise RuntimeError("HZZ feedovi nisu dostupni")
        print(f"[hzz] U feedovima je {len(feed_items)} otvorenih radnih mjesta.")

        limit = min(max_jobs or MAX_DETAILS_PER_RUN, MAX_DETAILS_PER_RUN)
        for item in feed_items:
            if processed >= limit:
                print(f"[hzz] Dosegnut limit od {limit} stranica za ovo pokretanje — nastavljam idući put.")
                break
            external_id = f"hzz-{item['web_id']}"
            if db.run(base.job_exists, external_id):
                continue

            url = DETAIL_URL.format(id=item["web_id"])
            try:
                resp = await base.retry_with_backoff(http_client.get, url)
                detail = parse_detail(resp.text)
            except Exception as e:
                print(f"  ✗ {url}: {e}")
                continue
            finally:
                processed += 1
                await base.sleep_jitter(*DETAIL_DELAY)

            if not detail["title"]:
                continue
            salary_min, salary_max = base.parse_salary(detail["salary_text"]) if detail["salary_text"] else (None, None)

            job = {
                **detail,
                "external_id": external_id,
                "url": url,
                "category_raw": item["category_raw"],
                "posted_at": item["posted_at"] or datetime.now().isoformat(),
            }
            if salary_min is None:
                # Saved hidden (the site only lists salary_shown jobs) so the next
                # run's job_exists() skips it instead of re-reading the page —
                # public-sector posts rarely fill the salary field, and there
                # are thousands of them.
                job.update(salary_text=None, salary_shown=False)
                db.run(base.save_job, job, "hzz")
                continue

            with_salary += 1
            job.update(salary_min=salary_min, salary_max=salary_max, salary_shown=True)
            if db.run(base.save_job, job, "hzz"):
                saved += 1
                new_jobs.append({"title": job["title"], "url": url, "salary_text": job["salary_text"]})
                print(f"  ✓ {job['title'][:50]} | 💰 {job['salary_text']}")

        # Share of ads with a salary, from the detail pages read this run.
        if processed >= 50:
            db.run(base.save_salary_stat, "hzz", processed, with_salary)

        if not max_jobs:
            gone = db.run(_reconcile, {f"hzz-{i['web_id']}" for i in feed_items})
            if gone:
                print(f"[reconcile] Deaktivirano {gone} HZZ oglasa kojih više nema u feedovima.")
    finally:
        await http_client.aclose()

    deactivated = db.run(base.deactivate_expired)
    if deactivated:
        print(f"[expiry] Deaktivirano {deactivated} isteklih oglasa.")

    db.run(base.finish_scrape_log, log_id, jobs_found=processed, jobs_saved=saved, status="success")
    db.close()
    print(f"\n✅ HZZ gotovo! Pregledano {processed}, s plaćom {with_salary}, novih {saved}.")
    return new_jobs


if __name__ == "__main__":
    print("🚀 Pokrećem HZZ scraper...")
    asyncio.run(scrape_hzz())
