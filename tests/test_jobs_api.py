"""GET /api/jobs and /api/jobs/{id}: filters, grouping, salary sort, expiry."""

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
from app.models.job import Job  # noqa: E402


def job(id, title, *, company="Firma d.o.o.", location="Zagreb", salary_min=None, salary_max=None,
        period=None, days_old=1, source="posao", category="IT", shown=1, **kw):
    return Job(
        id=id, external_id=f"x{id}", title=title, company=company, location=location,
        salary_min=salary_min, salary_max=salary_max, salary_period=period, salary_shown=shown,
        source=source, category=category, scraped_at=utcnow() - timedelta(days=days_old), **kw,
    )


@pytest.fixture
def client():
    engine = create_engine("sqlite://", poolclass=StaticPool, connect_args={"check_same_thread": False})
    Base.metadata.create_all(engine)
    db = sessionmaker(bind=engine)()
    db.add_all([
        job(1, "Programer", salary_min=2000, salary_max=3000, days_old=5),
        job(2, "Prodavač", company="Lanac d.d.", location="Split", salary_min=1000, category="Trgovina", days_old=2),
        job(3, "Prodavač", company="Lanac d.d.", location="Zadar", salary_min=1000, category="Trgovina", days_old=1),
        job(4, "Konobar", location="Splitsko-dalmatinska županija", salary_min=1400, category="Turizam", source="hzz"),
        job(5, "Student", salary_min=8, period="hour", category="Ostalo"),
        job(6, "Istekao", salary_min=5000, expires_at=utcnow() - timedelta(days=1)),
        job(7, "Ugašen", salary_min=5000, is_active=False),
        job(8, "Skladištar", location="München, Njemačka", salary_min=2500, category="Logistika", days_old=10),
    ])
    db.commit()
    app.dependency_overrides[get_db] = lambda: db
    yield TestClient(app)
    app.dependency_overrides.clear()
    db.close()


def ids(res):
    assert res.status_code == 200, res.text
    return [j["id"] for j in res.json()["jobs"]]


def test_hides_expired_and_inactive(client):
    assert set(ids(client.get("/api/jobs", params={"grouped": False}))) == {1, 2, 3, 4, 5, 8}
    assert client.get("/api/jobs/6").status_code == 404
    assert client.get("/api/jobs/7").status_code == 404
    assert client.get("/api/jobs/1").json()["title"] == "Programer"


def test_chain_ads_group_into_one_card(client):
    res = client.get("/api/jobs")
    body = res.json()
    assert body["total"] == 5
    card = next(j for j in body["jobs"] if j["title"] == "Prodavač")
    assert card["id"] == 3  # the newest ad represents the group
    assert card["group_count"] == 2
    assert sorted(card["group_locations"]) == ["Split", "Zadar"]


def test_newest_first(client):
    assert ids(client.get("/api/jobs")) == [5, 4, 3, 1, 8]


def test_salary_sort_puts_hourly_pay_last(client):
    assert ids(client.get("/api/jobs", params={"sort": "salary_desc"})) == [1, 8, 4, 3, 5]
    assert ids(client.get("/api/jobs", params={"sort": "salary_asc"})) == [3, 4, 1, 8, 5]


def test_salary_range_filter_ignores_hourly_pay(client):
    assert ids(client.get("/api/jobs", params={"salary_min": 1500, "sort": "salary_asc"})) == [1, 8]
    assert ids(client.get("/api/jobs", params={"salary_max": 1200})) == [3]


def test_city_is_a_whole_city_not_a_substring(client):
    # "Split" must not match "Splitsko-dalmatinska županija".
    assert ids(client.get("/api/jobs", params={"city": "Split"})) == [2]


def test_region_and_country(client):
    assert ids(client.get("/api/jobs", params={"region": "foreign"})) == [8]
    assert 8 not in ids(client.get("/api/jobs", params={"region": "hr"}))
    assert ids(client.get("/api/jobs", params={"country": "Njemačka"})) == [8]


def test_category_source_search_and_new_only(client):
    assert ids(client.get("/api/jobs", params={"category": "Turizam"})) == [4]
    assert ids(client.get("/api/jobs", params={"source": "hzz"})) == [4]
    assert ids(client.get("/api/jobs", params={"search": "program"})) == [1]
    assert ids(client.get("/api/jobs", params={"new_only": True})) == [5, 4, 3]


def test_paging(client):
    first = client.get("/api/jobs", params={"per_page": 2, "page": 1}).json()
    second = client.get("/api/jobs", params={"per_page": 2, "page": 2}).json()
    assert first["total"] == second["total"] == 5
    assert [j["id"] for j in first["jobs"]] == [5, 4]
    assert [j["id"] for j in second["jobs"]] == [3, 1]
    assert client.get("/api/jobs", params={"per_page": 500}).status_code == 422
