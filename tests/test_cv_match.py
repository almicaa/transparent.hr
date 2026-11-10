"""Tests for the CV upload → job matches flow (backend/app/services/cv_match.py).

The Claude API is replaced by a fake client, so these run offline and free.
"""

import io
import sys
import zipfile
from pathlib import Path
from types import SimpleNamespace

import pytest

sys.path.insert(0, str(Path(__file__).resolve().parent.parent / "backend"))

from sqlalchemy import create_engine  # noqa: E402
from sqlalchemy.orm import sessionmaker  # noqa: E402
from sqlalchemy.pool import StaticPool  # noqa: E402

from app.db.session import Base  # noqa: E402
from app.models.job import Job  # noqa: E402
from app.repositories.job_repository import JobRepository  # noqa: E402
from app.services import cv_match  # noqa: E402
from app.services.cv_match import CvError, _Answer, _Gap, _Match, _Shortlist, detect_type, docx_text, match_cv  # noqa: E402


def make_docx(paragraphs: list[str]) -> bytes:
    ns = "http://schemas.openxmlformats.org/wordprocessingml/2006/main"
    body = "".join(f"<w:p><w:r><w:t>{p}</w:t></w:r></w:p>" for p in paragraphs)
    xml = f'<?xml version="1.0"?><w:document xmlns:w="{ns}"><w:body>{body}</w:body></w:document>'
    buf = io.BytesIO()
    with zipfile.ZipFile(buf, "w") as zf:
        zf.writestr("word/document.xml", xml)
    return buf.getvalue()


CV_DOCX = make_docx(["Ana Anić", "Iskustvo: 4 godine kao skladištarka u Zagrebu", "Vozačka B, viličarist"])


@pytest.fixture
def repo():
    engine = create_engine("sqlite://", connect_args={"check_same_thread": False}, poolclass=StaticPool)
    Base.metadata.create_all(engine)
    db = sessionmaker(bind=engine)()
    db.add_all(
        [
            Job(id=1, title="Skladištar", company="A d.o.o.", location="Zagreb", category="Logistika",
                salary_min=1200, salary_max=1400, salary_shown=1, salary_basis="neto",
                ad_text="Uvjeti:\n- položen ispit za viličar"),
            Job(id=2, title="Programer", company="B d.o.o.", location="Split", category="IT",
                salary_min=2500, salary_shown=1),
            Job(id=3, title="Inaktivan", company="C", location="Zagreb", salary_min=1000, salary_shown=1, is_active=False),
        ]
    )
    db.commit()
    return JobRepository(db)


class FakeClient:
    """Stands in for anthropic.Anthropic: records each request and returns the
    next of `answers` (round 1 shortlist, round 2 final picks)."""

    def __init__(self, *answers, stop_reason="end_turn"):
        self.calls = []
        self.beta = SimpleNamespace(messages=SimpleNamespace(parse=self._parse))
        self._answers, self._stop = list(answers), stop_reason

    def _parse(self, **params):
        self.calls.append(params)
        return SimpleNamespace(parsed_output=self._answers.pop(0), stop_reason=self._stop)


def use_fake(monkeypatch, *answers, **kw) -> FakeClient:
    fake = FakeClient(*answers, **kw)
    monkeypatch.setattr(cv_match, "_client", lambda: fake)
    return fake


def shortlist(*ids, is_cv=True):
    return _Shortlist(is_cv=is_cv, profile_summary="Skladištarka s 4 godine iskustva.", candidate_ids=list(ids))


def test_docx_text_reads_paragraphs():
    assert docx_text(CV_DOCX).splitlines() == ["Ana Anić", "Iskustvo: 4 godine kao skladištarka u Zagrebu", "Vozačka B, viličarist"]


def test_detect_type():
    assert detect_type("cv.pdf", "application/pdf", b"%PDF-1.7 ...") == cv_match.PDF
    assert detect_type("cv.docx", None, CV_DOCX) == cv_match.DOCX
    with pytest.raises(CvError):
        detect_type("cv.png", "image/png", b"\x89PNG....")
    with pytest.raises(CvError):  # a zip that isn't named .docx
        detect_type("stuff.zip", "application/zip", b"PK\x03\x04")


def test_two_rounds(monkeypatch, repo):
    final = _Answer(
        matches=[
            _Match(job_id=1, reason="Imaš 4 godine u skladištu."),
            _Match(job_id=2, reason="Nije bio u užem izboru."),  # not shortlisted: dropped
            _Match(job_id=1, reason="Duplikat."),  # repeat: dropped
        ]
    )
    # 999 is made up and 3 is inactive: neither reaches round 2.
    fake = use_fake(monkeypatch, shortlist(999, 1, 3, 1), final)

    result = match_cv(repo, "cv.docx", None, CV_DOCX)

    assert [m.job.id for m in result.matches] == [1]
    assert result.matches[0].reason == "Imaš 4 godine u skladištu."
    assert result.matches[0].missing is None
    assert result.profile_summary == "Skladištarka s 4 godine iskustva."

    round1, round2 = fake.calls
    job_list = round1["system"][1]["text"]
    assert "Skladištar" in job_list and "Programer" in job_list and "Inaktivan" not in job_list
    assert "skladištarka" in round1["messages"][0]["content"][0]["text"]
    # Round 2 gets the full ad text of the shortlisted job only.
    ads = round2["messages"][0]["content"][1]["text"]
    assert '<oglas id="1">' in ads and "položen ispit za viličar" in ads and "Programer" not in ads


def test_missing_note_only_for_gaps_the_cv_doesnt_cover(monkeypatch, repo):
    gaps = [
        _Gap(requirement="Poželjan njemački jezik", cv_evidence=None, note="Poželjan njemački jezik."),
        _Gap(requirement="AI alati (ChatGPT, Claude, Cursor ili slični)", cv_evidence="Gemini, Claude", note="Oglas traži AI alate."),
    ]
    use_fake(monkeypatch, shortlist(1), _Answer(matches=[_Match(job_id=1, reason="Odgovara.", gaps=gaps)]))
    assert match_cv(repo, "cv.docx", None, CV_DOCX).matches[0].missing == "Poželjan njemački jezik."


def test_empty_shortlist_skips_round_two(monkeypatch, repo):
    fake = use_fake(monkeypatch, shortlist())
    assert match_cv(repo, "cv.docx", None, CV_DOCX).matches == []
    assert len(fake.calls) == 1


def test_pdf_is_sent_as_document(monkeypatch, repo):
    fake = use_fake(monkeypatch, shortlist())
    match_cv(repo, "cv.pdf", "application/pdf", b"%PDF-1.4 fake")
    block = fake.calls[0]["messages"][0]["content"][0]
    assert block["type"] == "document" and block["source"]["media_type"] == "application/pdf"


def test_not_a_cv(monkeypatch, repo):
    use_fake(monkeypatch, shortlist(is_cv=False))
    with pytest.raises(CvError, match="životopis"):
        match_cv(repo, "cv.docx", None, CV_DOCX)


def test_refusal(monkeypatch, repo):
    use_fake(monkeypatch, None, stop_reason="refusal")
    with pytest.raises(CvError):
        match_cv(repo, "cv.docx", None, CV_DOCX)


def test_file_size_limit(repo):
    with pytest.raises(CvError, match="5 MB"):
        match_cv(repo, "cv.pdf", None, b"%PDF" + b"0" * cv_match.MAX_FILE_BYTES)


def test_missing_api_key(monkeypatch, repo):
    monkeypatch.setattr(cv_match.settings, "anthropic_api_key", None)
    with pytest.raises(CvError, match="nije dostupna"):
        match_cv(repo, "cv.docx", None, CV_DOCX)


# Ad text extraction in the scrapers (scraper/base_scraper.py).
from scraper import base_scraper  # noqa: E402

POSAO_PAGE = """<html><body><div class="ad_mask">
<main class="radial_single_job">Pogonski radnik Poslodavac: X</main>
<div><p>Opis posla:</p><ul><li>rad na stroju</li></ul><p>Uvjeti:</p><ul><li>njemački jezik B1</li></ul>
<script>var x = 1;</script></div>
<div class="application radial_single_job">Brza prijava</div>
<div class="similar_jobs">Možda će vas zanimati</div>
</div></body></html>"""


def test_posao_ad_text():
    text = base_scraper.extract_posao_ad_text(POSAO_PAGE)
    assert text == "Opis posla:\nrad na stroju\nUvjeti:\nnjemački jezik B1"
    assert base_scraper.extract_posao_ad_text("<html></html>") is None


def test_mojposao_ad_text():
    nuxt = {"description": "- traženje kandidata\r\n", "requirements": "- poželjan njemački", "benefits": ""}
    assert base_scraper.mojposao_ad_text(nuxt) == "Opis posla:\n- traženje kandidata\nUvjeti:\n- poželjan njemački"
    assert base_scraper.mojposao_ad_text(None) is None


def test_posao_salary_row():
    page = ('<div class="single_job_ad salary single_job_ad_left">Plaća:</div><div class="date single_job_ad">'
            'od 3 000 € bruto&nbsp; <small><a href="/kalkulator-place-brutto-netto/">(Kalkulator plaće)</a></small></div>')
    assert base_scraper.extract_posao_salary(page) == "od 3 000 € bruto"
    assert base_scraper.clean_salary_snippet("od 3 000 € bruto").endswith("bruto")
    assert base_scraper.extract_posao_salary("<html></html>") is None


def test_basis_from_ad_text():
    assert base_scraper.basis_from_ad_text("Nudimo:\n- početna plaća 1500 EUR neto, dalje po dogovoru") == "neto"
    assert base_scraper.basis_from_ad_text("3.940 – 4.730 EUR bruto mjesečno") == "bruto"
    assert base_scraper.basis_from_ad_text("Mjesečna bruto plaća iznosi 2.000 €") == "bruto"
    # "neto" far from any pay figure doesn't count
    assert base_scraper.basis_from_ad_text("Plaća po dogovoru. " + "x " * 40 + "neto rezultat tima") is None
    assert base_scraper.basis_from_ad_text(None) is None
