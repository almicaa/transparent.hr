"""Page parsing for the three sources. The snippets copy the structure of the
real pages (as described in each function's docstring), cut down to what the
parser reads. When a portal changes its markup, update the snippet here to the
new structure and the test shows what broke."""

import json
from datetime import datetime, timedelta, timezone

from scraper import base_scraper as base
from scraper import hzz_hr, mojposao_hr

HR_TZ = timezone(timedelta(hours=1))

# --- posao.hr ---------------------------------------------------------------

POSAO_DETAIL = """
<html><head>
<meta name="description" content="Rok za prijavu: 17.10.2026.. Vrsta posla: Stalni radni odnos">
</head><body>
<div class="ad_mask">
  <main>
    <div class="single_job_ad salary label">Plaća:</div><div class="single_job_ad value">od 3 000 &euro; bruto&nbsp;
      <small><a href="/kalkulator">(Kalkulator plaće)</a></small></div>
    <div class="single_job_ad category label">Kategorija:</div><div class="value">
      <a href="/djelatnosti/instalacije">Instalacije, održavanje, popravak</a>,
      <a href="/djelatnosti/zanatska">Zanatska zanimanja</a></div>
  </main>
  <section class="employer_ad">
    <h2>Električar (m/ž)</h2>
    <p>Opis posla:</p>
    <ul><li>održavanje   instalacija</li><li>rad na terenu</li></ul>
    <script>trackAd(123)</script>
  </section>
  <div class="application">Prijava na oglas</div>
  <div class="similar_jobs">Slični poslovi</div>
</div>
</body></html>
"""


def test_posao_salary_row():
    assert base.extract_posao_salary(POSAO_DETAIL) == "od 3 000 € bruto"


def test_posao_salary_row_without_calculator_link():
    page = '<div class="salary">Placa:</div>\n<div class="value">1.200 € neto</div>'
    assert base.extract_posao_salary(page) == "1.200 € neto"


def test_posao_no_salary_row():
    assert base.extract_posao_salary("<div>Kategorija:</div>") is None


def test_posao_first_category():
    assert base.extract_posao_category(POSAO_DETAIL) == "Instalacije, održavanje, popravak"


def test_posao_deadline_is_end_of_day_croatian_time():
    assert base.parse_posao_deadline(POSAO_DETAIL) == datetime(2026, 10, 17, 23, 59, 59, tzinfo=HR_TZ)
    assert base.parse_posao_deadline("Rok za prijavu: 31.02.2026.") is None
    assert base.parse_posao_deadline("bez roka") is None


def test_posao_ad_text_is_the_employer_ad_only():
    text = base.extract_posao_ad_text(POSAO_DETAIL)
    assert text == "Električar (m/ž)\nOpis posla:\nodržavanje instalacija\nrad na terenu"
    assert base.extract_posao_ad_text("<html></html>") is None


def test_posao_days_to_expiry():
    assert base.parse_days_to_expiry("12 dana do isteka") == 12
    assert base.parse_days_to_expiry("1 dan do isteka") == 1
    assert base.parse_days_to_expiry("Danas ističe") is None
    assert base.parse_days_to_expiry(None) is None


def test_utc_iso_shifts_croatian_time():
    assert base.to_utc_iso(datetime(2026, 10, 17, 23, 59, 59, tzinfo=HR_TZ)) == "2026-10-17T22:59:59+00:00"


# --- mojposao.hr --------------------------------------------------------------


def nuxt_page(job: dict, extra: list) -> str:
    """A devalue-style payload: the job entity at index 4, its values as indexes
    into the flat array."""
    data = [None, None, None, None, job, *extra]
    return (
        '<html><body><div>Osvoji 500€! Preporuči prijatelja.</div>'
        f'<script type="application/json" id="__NUXT_DATA__">{json.dumps(data)}</script></body></html>'
    )


MOJPOSAO_DETAIL = nuxt_page(
    {"title": 5, "description": 6, "requirements": 7, "benefits": 8, "salary": 9,
     "location": 10, "organization": 12, "rootPosition": 14},
    [
        "Konobar/ica",                                   # 5
        "- posluživanje gostiju\n- rad u smjenama",      # 6
        "iskustvo poželjno",                             # 7
        "- Bruto plaća u iznosu od 1.430 €\n- topli obrok",  # 8
        {"from": 15, "to": 16, "currency": 17, "tax": 18},  # 9
        {"summary": 11},                                 # 10
        "Split",                                         # 11
        {"name": 13},                                    # 12
        "Hotel d.o.o.",                                  # 13
        {"id": 19, "name": 20},                          # 14
        1300,                                            # 15
        1600,                                            # 16
        "eur",                                           # 17
        "gross",                                         # 18
        9,                                               # 19
        "Turizam i ugostiteljstvo",                      # 20
    ],
)


def test_mojposao_nuxt_payload_resolves_indexes():
    nuxt = base.extract_nuxt_payload(MOJPOSAO_DETAIL)
    assert nuxt == {
        "title": "Konobar/ica",
        "description": "- posluživanje gostiju\n- rad u smjenama",
        "requirements": "iskustvo poželjno",
        "benefits": "- Bruto plaća u iznosu od 1.430 €\n- topli obrok",
        "salary": {"from": 1300, "to": 1600, "currency": "eur", "tax": "gross"},
        "location": "Split",
        "organization": "Hotel d.o.o.",
        "category": "Turizam i ugostiteljstvo",
    }


def test_mojposao_nuxt_payload_missing_or_broken():
    assert base.extract_nuxt_payload("<html></html>") is None
    assert base.extract_nuxt_payload('<script type="application/json">not json</script>') is None


def test_mojposao_ad_text_joins_sections():
    text = base.mojposao_ad_text(base.extract_nuxt_payload(MOJPOSAO_DETAIL))
    assert text.startswith("Opis posla:\n- posluživanje gostiju")
    assert "\nUvjeti:\niskustvo poželjno\n" in text
    assert text.endswith("Nudimo:\n- Bruto plaća u iznosu od 1.430 €\n- topli obrok")
    assert base.mojposao_ad_text(None) is None


def test_mojposao_structured_salary():
    assert mojposao_hr._structured_salary_text({"from": 1300, "to": 1600, "currency": "eur", "tax": "gross"}) == (
        "od 1300 do 1600 EUR bruto", 1300.0, 1600.0,
    )
    assert mojposao_hr._structured_salary_text({"from": 1500, "to": None, "tax": "net"}) == ("1500 EUR neto", 1500.0, 1500.0)
    assert mojposao_hr._structured_salary_text({"from": None, "to": 2000}) == ("2000 EUR", 2000.0, 2000.0)


def test_mojposao_salary_from_benefits_ignores_referral_banner():
    nuxt = base.extract_nuxt_payload(MOJPOSAO_DETAIL)
    text, low, high = mojposao_hr._text_salary_from_benefits(nuxt)
    assert text == "1.430 € bruto"
    assert low == 1430
    # The banner "Osvoji 500€!" is in the page HTML, not in the payload.
    assert mojposao_hr._text_salary_from_benefits({"description": "Dinamičan posao", "benefits": None}) == (None, None, None)


# --- HZZ -----------------------------------------------------------------------

HZZ_FEED = """<?xml version="1.0" encoding="ISO-8859-2"?>
<rss><channel>
<item><title>KUHAR/KUHARICA</title>
  <link>https://burzarada.hzz.hr/RadnoMjesto_Ispis.aspx?WebSifra=1234567</link>
  <pubDate>5.11.2026 08:00:00</pubDate></item>
<item><title>bez linka</title><pubDate>5.11.2026</pubDate></item>
<item><title>SPREMAČ</title>
  <link>https://burzarada.hzz.hr/RadnoMjesto_Ispis.aspx?WebSifra=7654321</link></item>
</channel></rss>"""

HZZ_DETAIL = """
<h3>KUHAR/KUHARICA
  (m/ž)</h3>
<span id="ctl00_MainContent_lblNazivPoslodavca">RESTORAN &amp; BAR d.o.o.</span>
<span id="ctl00_MainContent_lblMjestoRada">POREČ-PARENZO, ISTARSKA ŽUPANIJA</span>
<span id="ctl00_MainContent_lblVrijediDo">21.10.2026.</span>
<span id="ctl00_MainContent_lblRadnoVrijeme">Puno radno vrijeme</span>
<span id="ctl00_MainContent_lblVrstaZaposlenja">Na određeno; sezonski posao</span>
<span id="ctl00_MainContent_lblOpisPosla">- priprema jela<br/>-   čišćenje   kuhinje<br><br></span>
<span id="ctl00_MainContent_lblRazinaObrazovanja">Srednja škola</span>
<span id="ctl00_MainContent_lblRadnoIskustvo">1 godina</span>
<span id="ctl00_MainContent_lblBrojRadnika">2 radnika</span>
<span id="ctl00_MainContent_lblPlaca">1.400,00 EUR</span>
"""


def test_hzz_feed_items():
    assert hzz_hr._parse_feed(HZZ_FEED, "Ugostitelji, radnici u turizmu") == [
        {"web_id": "1234567", "category_raw": "Ugostitelji, radnici u turizmu", "posted_at": "2026-11-05"},
        {"web_id": "7654321", "category_raw": "Ugostitelji, radnici u turizmu", "posted_at": None},
    ]


def test_hzz_detail_page():
    assert hzz_hr.parse_detail(HZZ_DETAIL) == {
        "title": "KUHAR/KUHARICA (m/ž)",
        "company": "RESTORAN & BAR d.o.o.",
        "location": "Poreč",
        "address_region": "Istarska županija",
        "expires_at": datetime(2026, 10, 21, 23, 59, tzinfo=HR_TZ),
        "job_type": "Puno radno vrijeme",
        "contract_type": "Na određeno; sezonski posao",
        "description": "- priprema jela\n- čišćenje kuhinje",
        "education": "Srednja škola",
        "experience": "1 godina",
        "openings": 2,
        "salary_text": "1.400,00 EUR bruto",
    }


def test_hzz_detail_without_salary():
    page = HZZ_DETAIL.replace("1.400,00 EUR", "po dogovoru")
    assert hzz_hr.parse_detail(page)["salary_text"] is None
    assert hzz_hr.parse_detail("<html></html>")["title"] is None


def test_hzz_places_and_regions():
    assert hzz_hr._place("SLAVONSKI BROD, BRODSKO-POSAVSKA ŽUPANIJA") == "Slavonski Brod"
    assert hzz_hr._place("ROVINJ-ROVIGNO, ISTARSKA ŽUPANIJA") == "Rovinj"
    assert hzz_hr._place("DUGO SELO-OSTRNA, ZAGREBAČKA ŽUPANIJA") == "Dugo Selo-Ostrna"
    assert hzz_hr._region("ZAGREB, GRAD ZAGREB") == "Grad Zagreb"
    assert hzz_hr._region("BOBOVICA, ZAGREBAČKA ŽUPANIJA") == "Zagrebačka županija"
    assert hzz_hr._region("ZAGREB") is None


# --- neto/bruto from the ad body -------------------------------------------------


def test_basis_next_to_the_pay():
    assert base.basis_from_ad_text("Nudimo: početna plaća 1500 EUR neto, topli obrok") == "neto"
    assert base.basis_from_ad_text("bruto plaća: 1.650 €") == "bruto"
    assert base.basis_from_ad_text("Net salary of up to 1.500 euro") == "neto"


def test_basis_word_far_from_the_pay_does_not_count():
    ad = "Plaća 1500 €. " + "Radimo u modernom uredu s timom stručnjaka. " * 3 + "Tvrtka posluje neto profitabilno."
    assert base.basis_from_ad_text(ad) is None
    assert base.missed_basis_hint(ad).endswith("Tvrtka posluje neto profitabilno.")
    assert base.basis_from_ad_text(None) is None
