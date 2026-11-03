"""EUR-only salary parsing engine, shared between scrapers and backend.

Used so both ingestion (scraper/) and any backend re-parsing rely on
identical salary_min/salary_max/currency semantics.
"""

import re

CURRENCY = "EUR"


def parse_salary(text: str) -> tuple[float | None, float | None]:
    """Parse a free-text salary snippet into (salary_min, salary_max)."""
    if not text:
        return None, None
    clean = text.replace(".", "").replace(",", ".")
    # Croatian salary text groups thousands with a space ("1 450 €") — strip
    # all whitespace so digit groups merge before extracting numbers.
    clean = re.sub(r"\s+", "", clean)
    numbers = re.findall(r"\d+(?:\.\d+)?", clean)
    nums = [float(n) for n in numbers if float(n) > 100]
    if len(nums) >= 2:
        return min(nums[:2]), max(nums[:2])
    elif len(nums) == 1:
        return nums[0], nums[0]
    return None, None


def clean_salary_snippet(text: str | None) -> str | None:
    """Trim a raw scraped salary snippet down to just the salary phrase.

    Scraped detail-page snippets often run on into unrelated sentences
    (e.g. "od 1 200 € neto. - Tematski parkovi ... (8.000 m²)..."), which
    would otherwise feed a second, unrelated number into parse_salary.
    """
    if not text:
        return text
    t = str(text)
    t = re.sub(r"<[^>]*>", "", t)
    t = re.sub(r"&[^;\s]+;", "", t)

    m = re.search(r"-\s*Tražimo", t, re.IGNORECASE)
    if m:
        t = t[: m.start()].strip()

    dot_idx = t.find(". ")
    if dot_idx != -1:
        after = t[dot_idx + 2 : dot_idx + 3]
        if after and not after.isdigit():
            t = t[:dot_idx].strip()

    return t.rstrip(". \t").strip()


def parse_salary_basis(text: str | None) -> str | None:
    """Detect whether a salary snippet states neto or bruto. None if unstated."""
    if not text:
        return None
    if re.search(r"(?i)\bneto\b", text):
        return "neto"
    if re.search(r"(?i)\bbruto\b", text):
        return "bruto"
    return None


def parse_salary_type(text: str | None, salary_min: float | None, salary_max: float | None) -> str | None:
    """Classify a salary as one of: range, fixed, from, up_to, above.

    - "above": an explicit "X+" ceiling-less floor (e.g. "3000+ EUR")
    - "range": two distinct numbers ("od 1500 do 2000 EUR")
    - "from": Croatian listings phrase a single floor as "od X EUR" — a stated
      minimum, not a fixed amount
    - "up_to": "do X EUR" — a stated maximum; the pay may be lower
    - "fixed": a single number with no "od" prefix — an exact stated amount
    """
    if salary_min is None:
        return None
    if text and re.search(r"\d\s*\+", text):
        return "above"
    if salary_min != salary_max:
        return "range"
    if text and re.match(r"(?i)^\s*od\b", text):
        return "from"
    if text and re.match(r"(?i)^\s*do\b", text):
        return "up_to"
    return "fixed"


# A currency right after the amount ("1.450 €", "1.500 eura", "3000+ EUR") or right before it
# ("€1500", "EUR 2.000"). Requiring the two to touch keeps stray numbers and
# currencies elsewhere in a sentence from counting as a salary.
_AMOUNT_WITH_CURRENCY = re.compile(
    r"\d+\s*\+?\s*(?:€|(?:EUR\w*|HRK|kn)\b)|(?:EUR|€)\s*\d",
    re.IGNORECASE,
)


def is_valid_salary(text: str) -> bool:
    """A salary snippet only counts if it has a number with an explicit currency."""
    if not text:
        return False
    return bool(_AMOUNT_WITH_CURRENCY.search(text))



_YEARLY_WORDS = re.compile(r"(?i)godišnj|godisnj|/\s*god\b|per\s+year|per\s+annum|annual|yearly")

# No monthly salary is under 100 €. Above 20.000 € it is a year's pay; with
# the text saying so ("Annual salary"), above 10.000 €. Words alone don't
# decide: "1.500 € + godišnji bonus" is still monthly.
_MAX_HOURLY = 100
_MIN_YEARLY = 20000
_MIN_YEARLY_STATED = 10000


def parse_salary_period(text: str | None, salary_min: float | None, salary_max: float | None) -> str | None:
    """'hour' or 'year' when the pay isn't monthly; None for monthly (the default).

    MojPosao's structured salary has no period field, so an ad for "3–4 EUR"
    reaches us as plain numbers that can only mean per hour.
    """
    if salary_min is None and salary_max is None:
        return None
    top = salary_max if salary_max is not None else salary_min
    low = salary_min if salary_min is not None else top
    if top < _MAX_HOURLY:
        return "hour"
    if low >= _MIN_YEARLY:
        return "year"
    if low >= _MIN_YEARLY_STATED and text and _YEARLY_WORDS.search(text):
        return "year"
    return None
