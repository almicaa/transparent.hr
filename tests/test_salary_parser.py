"""Tests for shared/salary_parser.py.

The cases are real formats seen on posao.hr, MojPosao and HZZ: Croatian
thousand separators (dot or space), decimal commas, ranges, "od X",
"X+" and currency written before or after the amount.
"""

import pytest

from shared.salary_parser import (
    clean_salary_snippet,
    is_valid_salary,
    parse_salary,
    parse_salary_basis,
    parse_salary_type,
)


@pytest.mark.parametrize(
    "text, expected",
    [
        ("1.450 €", (1450, 1450)),
        ("1 450 €", (1450, 1450)),  # space as thousand separator
        ("1.234,56 EUR", (1234.56, 1234.56)),  # decimal comma
        ("800 eura", (800, 800)),
        ("€1500", (1500, 1500)),
        ("EUR 2.000", (2000, 2000)),
        ("3000+ EUR", (3000, 3000)),
        ("od 1.500 do 2.000 EUR neto", (1500, 2000)),
        ("1500-2000 EUR bruto", (1500, 2000)),
        # Small numbers (13. plaća, 2 smjene…) are not salary amounts.
        ("1.200 - 1.500 € + 13. plaća", (1200, 1500)),
        # Only the first two amounts count.
        ("1.500 – 2.000 – 2.500 €", (1500, 2000)),
    ],
)
def test_parse_salary(text, expected):
    assert parse_salary(text) == expected


@pytest.mark.parametrize("text", ["", None, "Plaća po dogovoru", "100 €"])
def test_parse_salary_without_amount(text):
    assert parse_salary(text) == (None, None)


@pytest.mark.parametrize(
    "text, expected",
    [
        ("1.450 €", "fixed"),
        ("€1500", "fixed"),
        ("od 1 200 € neto", "from"),
        ("Od 900 EUR", "from"),
        # "do X" is a ceiling: the pay may be lower, so it is not a fixed amount.
        ("do 2.500 €", "up_to"),
        ("Do 1.800 EUR neto", "up_to"),
        ("od 1.500 do 2.000 EUR", "range"),
        ("1500-2000 EUR", "range"),
        ("3000+ EUR", "above"),
        ("3000 + EUR", "above"),
        ("Plaća po dogovoru", None),
    ],
)
def test_parse_salary_type(text, expected):
    salary_min, salary_max = parse_salary(text)
    assert parse_salary_type(text, salary_min, salary_max) == expected


@pytest.mark.parametrize(
    "text, expected",
    [
        ("od 1 200 € neto", "neto"),
        ("1500-2000 EUR BRUTO", "bruto"),
        ("1.450 €", None),
        (None, None),
        # Whole words only.
        ("1.450 € netovrijednost", None),
    ],
)
def test_parse_salary_basis(text, expected):
    assert parse_salary_basis(text) == expected


@pytest.mark.parametrize(
    "text",
    ["1.450 €", "1 450 €", "800 eura", "3000+ EUR", "€1500", "EUR 2.000", "1.500 EUR neto"],
)
def test_is_valid_salary_accepts_amount_with_currency(text):
    assert is_valid_salary(text)


@pytest.mark.parametrize(
    "text",
    [
        "",
        None,
        "Plaća po dogovoru",
        "1.500",  # amount without currency
        "Plaća u EUR, 2 smjene od 8 sati",  # currency not next to the amount
        "Europski projekt 2024",
    ],
)
def test_is_valid_salary_rejects_text_without_amount_and_currency(text):
    assert not is_valid_salary(text)


@pytest.mark.parametrize(
    "raw, expected",
    [
        # Text after the sentence ends is dropped.
        ("od 1 200 € neto. - Tematski parkovi ... (8.000 m²)", "od 1 200 € neto"),
        # HTML tags and entities are stripped, the "- Tražimo" tail is cut.
        ("<b>1.500 €</b>&nbsp; - Tražimo konobara", "1.500 €"),
        # ". " followed by a digit is a thousand separator, not a sentence end.
        ("1. 500 €", "1. 500 €"),
        ("1.500 €.", "1.500 €"),
        (None, None),
        ("", ""),
    ],
)
def test_clean_salary_snippet(raw, expected):
    assert clean_salary_snippet(raw) == expected


def test_cleaning_keeps_unrelated_numbers_out_of_the_salary():
    raw = "od 1 200 € neto. - Tematski parkovi (8.000 m²)"
    # Without cleaning, the park area would be read as the top of a range.
    assert parse_salary(raw) == (1200, 8000)
    assert parse_salary(clean_salary_snippet(raw)) == (1200, 1200)
