"""/health/scraper: 503 when a source has gone too long without a run that found ads."""

import sys
from datetime import timedelta
from pathlib import Path

import pytest

sys.path.insert(0, str(Path(__file__).resolve().parent.parent / "backend"))

from fastapi.testclient import TestClient  # noqa: E402
from sqlalchemy import create_engine  # noqa: E402
from sqlalchemy.orm import sessionmaker  # noqa: E402
from sqlalchemy.pool import StaticPool  # noqa: E402

from app.db.session import Base, get_db, utcnow  # noqa: E402
from app.main import app  # noqa: E402
from app.models.scrape_log import ScrapeLog  # noqa: E402


@pytest.fixture
def session():
    engine = create_engine("sqlite://", poolclass=StaticPool, connect_args={"check_same_thread": False})
    Base.metadata.create_all(engine)
    db = sessionmaker(bind=engine)()
    app.dependency_overrides[get_db] = lambda: db
    yield db
    app.dependency_overrides.clear()
    db.close()


def add_log(db, source, hours_ago, *, status="success", found=50):
    db.add(ScrapeLog(source=source, finished_at=utcnow() - timedelta(hours=hours_ago), status=status, jobs_found=found))
    db.commit()


def test_liveness_does_not_touch_the_database():
    assert TestClient(app).get("/health").json() == {"status": "ok"}


def test_all_sources_fresh(session):
    for source in ("posao", "mojposao", "hzz"):
        add_log(session, source, 3)
    res = TestClient(app).get("/health/scraper")
    assert res.status_code == 200
    assert res.json()["status"] == "ok"


def test_failed_empty_and_old_runs_count_as_stale(session):
    add_log(session, "posao", 2, status="error")
    add_log(session, "posao", 30)            # last good run too long ago
    add_log(session, "mojposao", 1, found=0)  # ran, but found nothing
    add_log(session, "hzz", 5)
    res = TestClient(app).get("/health/scraper")
    assert res.status_code == 503
    sources = res.json()["sources"]
    assert sources["posao"]["stale"] and sources["mojposao"]["stale"]
    assert sources["mojposao"]["last_success"] is None
    assert not sources["hzz"]["stale"]
