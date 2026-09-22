"""Free-text job location normalization, shared between backend and scraper.

Locations are scraped as free text ("Zagreb", "Sesvete", "Opatija, Zagreb",
"Zagreb (Sesvete)", "Zagreb – zapad", "Höchstadt a. d. Aisch, Njemačka", ...)
with no structured city/country field. This maps that noise down to a
canonical Croatian city (or None for foreign/blank locations) so filters and
stats aren't fragmented across suburb names, parenthetical qualifiers, and
multi-location strings.
"""

import re

# Foreign ads are flagged by matching well-known country names, since that's
# how they actually show up in the data; anything else defaults to "hr".
FOREIGN_LOCATION_KEYWORDS = [
    "austrija", "austria", "njemačka", "germany", "deutschland",
    "švicarska", "switzerland", "italija", "italy", "francuska", "france",
    "nizozemska", "netherlands", "holland", "belgija", "belgium",
    "mađarska", "hungary", "irska", "ireland", "švedska", "sweden",
    "norveška", "norway", "danska", "denmark", "velika britanija",
    "united kingdom", "england", "poljska", "poland", "češka", "czech",
    "grčka", "greece", "španjolska", "spain", "malta", "cipar", "cyprus",
    "kanada", "canada", "australija", "australia", "slovenija", "slovenia",
]

# Known Zagreb-area suburbs/neighborhoods/landmarks that show up as their own
# location string without the word "Zagreb" in them. Best-effort — extend as
# more fragmented locations surface.
CITY_ALIASES = {
    "sesvete": "Zagreb",
    "zagreb zapad": "Zagreb",
    "king cross jankomir": "Zagreb",
}


def _is_foreign(location: str) -> bool:
    lower = location.lower()
    return any(kw in lower for kw in FOREIGN_LOCATION_KEYWORDS)


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
