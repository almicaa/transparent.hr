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
from app.services.cv_match import CvError, _Answer, _Match, detect_type, docx_text, match_cv  # noqa: E402


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
                salary_min=1200, salary_max=1400, salary_shown=1, salary_basis="neto"),
            Job(id=2, title="Programer", company="B d.o.o.", location="Split", category="IT",
                salary_min=2500, salary_shown=1),
            Job(id=3, title="Inaktivan", company="C", location="Zagreb", salary_min=1000, salary_shown=1, is_active=False),
        ]
    )
    db.commit()
    return JobRepository(db)


class FakeClient:
    """Stands in for anthropic.Anthropic; records the request and returns `answer`."""

    def __init__(self, answer, stop_reason="end_turn"):
        self.calls = []
        messages = SimpleNamespace(parse=self._parse)
        self.beta = SimpleNamespace(messages=messages)
        self._answer, self._stop = answer, stop_reason

    def _parse(self, **params):
        self.calls.append(params)
        return SimpleNamespace(parsed_output=self._answer, stop_reason=self._stop)


def use_fake(monkeypatch, answer, **kw) -> FakeClient:
    fake = FakeClient(answer, **kw)
    monkeypatch.setattr(cv_match, "_client", lambda: fake)
    return fake


def test_docx_text_reads_paragraphs():
    assert docx_text(CV_DOCX).splitlines() == ["Ana Anić", "Iskustvo: 4 godine kao skladištarka u Zagrebu", "Vozačka B, viličarist"]


def test_detect_type():
    assert detect_type("cv.pdf", "application/pdf", b"%PDF-1.7 ...") == cv_match.PDF
    assert detect_type("cv.docx", None, CV_DOCX) == cv_match.DOCX
    with pytest.raises(CvError):
        detect_type("cv.png", "image/png", b"\x89PNG....")
    with pytest.raises(CvError):  # a zip that isn't named .docx
        detect_type("stuff.zip", "application/zip", b"PK\x03\x04")


def test_match_returns_jobs_with_reasons(monkeypatch, repo):
    answer = _Answer(
        is_cv=True,
        profile_summary="Skladištarka s 4 godine iskustva.",
        matches=[
            _Match(job_id=1, reason="Imaš 4 godine u skladištu."),
            _Match(job_id=999, reason="Ne postoji."),  # made-up id: dropped
            _Match(job_id=3, reason="Neaktivan."),  # not in the live list: dropped
            _Match(job_id=1, reason="Duplikat."),  # repeat: dropped
        ],
    )
    fake = use_fake(monkeypatch, answer)

    result = match_cv(repo, "cv.docx", None, CV_DOCX)

    assert [m.job.id for m in result.matches] == [1]
    assert result.matches[0].reason == "Imaš 4 godine u skladištu."
    assert result.profile_summary == "Skladištarka s 4 godine iskustva."

    sent = fake.calls[0]
    job_list = sent["system"][1]["text"]
    assert "Skladištar" in job_list and "Programer" in job_list and "Inaktivan" not in job_list
    assert "skladištarka" in sent["messages"][0]["content"][0]["text"]


def test_pdf_is_sent_as_document(monkeypatch, repo):
    fake = use_fake(monkeypatch, _Answer(is_cv=True, profile_summary="x", matches=[]))
    match_cv(repo, "cv.pdf", "application/pdf", b"%PDF-1.4 fake")
    block = fake.calls[0]["messages"][0]["content"][0]
    assert block["type"] == "document" and block["source"]["media_type"] == "application/pdf"


def test_not_a_cv(monkeypatch, repo):
    use_fake(monkeypatch, _Answer(is_cv=False, profile_summary="", matches=[]))
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
