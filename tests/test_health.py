"""/health is liveness only and must not touch the database."""

import sys
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parent.parent / "backend"))

from fastapi.testclient import TestClient  # noqa: E402

from app.db.session import get_db  # noqa: E402
from app.main import app  # noqa: E402


def test_liveness_does_not_touch_the_database():
    def no_db():
        raise AssertionError("/health opened a database session")

    app.dependency_overrides[get_db] = no_db
    try:
        assert TestClient(app).get("/health").json() == {"status": "ok"}
    finally:
        app.dependency_overrides.clear()


def test_scraper_health_endpoint_is_gone():
    # It read the database on every call; an uptime monitor polling it kept
    # Neon awake all month. Replaced by HEARTBEAT_URL.
    assert TestClient(app).get("/health/scraper").status_code == 404
