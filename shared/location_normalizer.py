"""Free-text job location normalization, shared between backend and scraper.

Locations are scraped as free text ("Zagreb", "Sesvete", "Opatija, Zagreb",
"Zagreb (Sesvete)", "Zagreb – zapad", "Höchstadt a. d. Aisch, Njemačka", ...)
with no structured city/country field. This maps that noise down to a
canonical Croatian city (or None for foreign/blank locations) so filters and
stats aren't fragmented across suburb names, parenthetical qualifiers, and
multi-location strings.
"""

import re

# Foreign ads are recognized by well-known country names in the free text,
# since that's how they actually show up in the data; anything else is "hr".
# keyword -> canonical (Croatian) country name.
COUNTRY_KEYWORDS = {
    "austrija": "Austrija", "austria": "Austrija",
    "njemačka": "Njemačka", "germany": "Njemačka", "deutschland": "Njemačka",
    "berlin": "Njemačka", "münchen": "Njemačka",
    "švicarska": "Švicarska", "switzerland": "Švicarska",
    "italija": "Italija", "italy": "Italija",
    "francuska": "Francuska", "france": "Francuska",
    "nizozemska": "Nizozemska", "netherlands": "Nizozemska", "holland": "Nizozemska",
    "belgija": "Belgija", "belgium": "Belgija",
    "mađarska": "Mađarska", "hungary": "Mađarska",
    "irska": "Irska", "ireland": "Irska",
    "švedska": "Švedska", "sweden": "Švedska",
    "norveška": "Norveška", "norway": "Norveška",
    "danska": "Danska", "denmark": "Danska",
    "velika britanija": "Velika Britanija", "united kingdom": "Velika Britanija", "england": "Velika Britanija",
    "poljska": "Poljska", "poland": "Poljska",
    "češka": "Češka", "czech": "Češka",
    "grčka": "Grčka", "greece": "Grčka",
    "španjolska": "Španjolska", "spain": "Španjolska",
    "malta": "Malta",
    "cipar": "Cipar", "cyprus": "Cipar",
    "kanada": "Kanada", "canada": "Kanada",
    "australija": "Australija", "australia": "Australija",
    "slovenija": "Slovenija", "slovenia": "Slovenija",
}
FOREIGN_LOCATION_KEYWORDS = list(COUNTRY_KEYWORDS)

# Known Zagreb-area suburbs/neighborhoods/landmarks that show up as their own
# location string without the word "Zagreb" in them. Best-effort — extend as
# more fragmented locations surface.
CITY_ALIASES = {
    "sesvete": "Zagreb",
    "zagreb zapad": "Zagreb",
    "king cross jankomir": "Zagreb",
    "jankomir": "Zagreb",
    "novi zagreb": "Zagreb",
    "črnomerec": "Zagreb",
    "lučko": "Zagreb",
    "žitnjak": "Zagreb",
}


def _is_foreign(location: str) -> bool:
    lower = location.lower()
    return any(kw in lower for kw in FOREIGN_LOCATION_KEYWORDS)


def match_countries(raw: str | None) -> set[str]:
    """Every foreign country named in a raw location ("Njemačka, Švicarska, ...")."""
    lower = (raw or "").lower()
    return {country for kw, country in COUNTRY_KEYWORDS.items() if kw in lower}


def country_keywords(country: str) -> list[str]:
    """All keywords that map to a canonical country — what a country filter matches on."""
    return [kw for kw, c in COUNTRY_KEYWORDS.items() if c.lower() == country.lower()]


def normalize_city(raw: str | None) -> str | None:
    """Collapse a raw scraped location into a canonical domestic city name.

    Returns None for blank or foreign locations.
    """
    if not raw or not raw.strip():
        return None
    cleaned = raw.strip()
    if _is_foreign(cleaned):
        return None
    # Drop parenthetical qualifiers entirely: "Zagreb (Sesvete)" -> "Zagreb".
    cleaned = re.sub(r"\s*\(.*", "", cleaned).strip()
    # Multi-location strings ("Opatija, Zagreb", "Zagreb - Jankomir",
    # "Zagreb – zapad", "Sveta Nedelja i Jastrebarsko") all list the primary
    # location first.
    for sep in (",", " - ", " – ", " i "):
        idx = cleaned.find(sep)
        if idx != -1:
            cleaned = cleaned[:idx].strip()
            break
    if not cleaned:
        return None
    lower = cleaned.lower()
    if lower in ("hrvatska", "cijela hrvatska"):
        return "Cijela Hrvatska"
    return CITY_ALIASES.get(lower, cleaned)


def split_cities(raw: str | None) -> set[str]:
    """Every domestic city a raw location lists, for per-city counts.

    Unlike normalize_city (primary city only), "Osijek, Zadar, Rijeka" counts
    toward all three. Parenthetical/dash detail ("Zagreb (Sesvete)",
    "Zagreb – više lokacija ...") is dropped, and county-level entries
    ("Istarska županija") are skipped since they aren't cities.
    """
    if not raw or _is_foreign(raw):
        return set()
    cleaned = re.sub(r"\s*\([^)]*\)?", "", raw)
    cities = set()
    # Commas/semicolons/" i " separate cities; a dash or slash within one part
    # adds a neighborhood or site ("Zagreb - Jankomir", "Zagreb / Kamp Šimuni").
    for part in re.split(r"[,;]| i ", cleaned):
        part = re.split(r" - | – | / ", part)[0].strip()
        lower = part.lower()
        if (
            not part
            or part.endswith("...")  # truncated by the portal ("Kašt...")
            or "županij" in lower
            or re.fullmatch(r"\w+-\w+sk[ae]", lower)  # bare county name ("Ličko-senjska")
            or "lokacij" in lower
            or lower.startswith("okolica")
        ):
            continue
        if lower in ("hrvatska", "cijela hrvatska"):
            cities.add("Cijela Hrvatska")
            continue
        cities.add(CITY_ALIASES.get(lower, part[0].upper() + part[1:]))
    return cities
