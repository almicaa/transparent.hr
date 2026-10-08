"""Map each portal's own category labels onto one shared taxonomy.

posao.hr ("Kategorija:" on the detail page) and mojposao.hr (the Nuxt payload's
`rootPosition`) each use their own, similar-but-not-identical category lists —
e.g. "Informatika i telekomunikacije" vs "IT, telekomunikacije", or one
"Ekonomija, računovodstvo i financije" vs separate "Bankarstvo" and
"Ekonomija, financije i računovodstvo". Matching on keywords (after folding
diacritics) rather than exact strings keeps this working when a portal
rewords a label slightly. The raw label is stored alongside (`category_raw`)
so jobs can be re-mapped later without re-scraping.
"""

import unicodedata

OTHER = "Ostalo"

# (canonical label, keywords) — first match wins, so more specific rules go first.
# Keywords are matched against the lowercased, diacritic-free raw label.
_RULES: list[tuple[str, tuple[str, ...]]] = [
    ("IT i telekomunikacije", ("informatik", " it,", " it ", "telekomunikacij", "softver")),
    ("Ljudski resursi", ("ljudski resursi",)),
    ("Management", ("management", "menadzment", "upravljanje")),
    ("Marketing, PR i mediji", ("marketing", "mediji", " pr ", " pr,")),
    ("Financije i računovodstvo", ("financij", "racunovod", "bankarstv", "ekonomij")),
    ("Pravo", ("pravo",)),
    ("Administracija", ("administrativ", "administracij")),
    ("Državna služba i neprofitne organizacije", ("drzavna", "neprofitn", "uprava")),
    ("Arhitektura, dizajn i umjetnost", ("arhitektur", "dizajn", "umjetnost")),
    ("Elektrotehnika", ("elektrotehnik",)),
    ("Strojarstvo i brodogradnja", ("strojarstv", "brodogradnj")),
    ("Graditeljstvo i geodezija", ("graditeljstv", "gradevinarstv", "geodezij")),
    ("Instalacije, održavanje i popravci", ("instalacij", "odrzavanj", "popravc", "popravak")),
    ("Proizvodnja i zanatstvo", ("proizvodnj", "zanat")),
    ("Skladištenje i logistika", ("skladist", "logistik")),
    ("Promet i transport", ("promet", "transport", "pomorstv")),
    ("Prodaja", ("prodaj", "trgovin")),
    ("Turizam i ugostiteljstvo", ("turizam", "ugostiteljstv")),
    ("Zdravstvo i socijalna skrb", ("zdravstv", "socijaln")),
    ("Farmacija, biotehnologija i kemija", ("farmac", "biotehnolog", "kemij")),
    ("Obrazovanje i znanost", ("obrazovanj", "znanost")),
    ("Ljepota i sport", ("ljepot", "sport", "moda")),
    ("Poljoprivreda, šumarstvo i ribarstvo", ("poljoprivred", "sumarstv", "ribarstv")),
    ("Sigurnost i zaštita", ("sigurnost", "zastitar", "zastita")),
    (OTHER, ("ostalo",)),
]

CATEGORIES: list[str] = [label for label, _ in _RULES]


def _fold(text: str) -> str:
    text = text.lower().replace("đ", "d")
    text = unicodedata.normalize("NFKD", text)
    return "".join(c for c in text if not unicodedata.combining(c))


def normalize_category(raw: str | None) -> str | None:
    """Return the canonical category for a portal's raw label, `OTHER` for a
    label no rule recognizes, or None when there's no label at all."""
    if not raw or not raw.strip():
        return None
    # Pad so keywords like "it " / "pr " only match whole words at the edges too.
    folded = f" {_fold(raw.strip())} "
    for label, keywords in _RULES:
        if any(kw in folded for kw in keywords):
            return label
    return OTHER
