"""purge_old_jobs copies ads into job_archive before deleting them."""

from datetime import datetime, timedelta, timezone

import pytest
from sqlalchemy import create_engine, text
from sqlalchemy.pool import StaticPool

from scraper import base_scraper as base


def ago(days):
    return (datetime.now(timezone.utc) - timedelta(days=days)).isoformat()


@pytest.fixture
def conn(monkeypatch):
    engine = create_engine("sqlite://", poolclass=StaticPool, connect_args={"check_same_thread": False})
    monkeypatch.setattr(base, "_engine", engine)
    monkeypatch.setattr(base, "IS_SQLITE", True)
    base.init_db()
    with engine.connect() as c:
        yield c


def add(conn, external_id, *, active, days_old, salary_min=None, title="Kuhar"):
    conn.execute(
        text("""
            INSERT INTO jobs (external_id, title, company, location, category, source,
                              salary_min, salary_max, salary_shown, salary_basis,
                              description, ad_text, scraped_at, is_active)
            VALUES (:id, :title, 'Restoran d.o.o.', 'Split', 'Turizam', 'hzz',
                    :sal, :sal, :shown, 'bruto', 'dugi opis', 'tekst oglasa', :scraped, :active)
        """),
        {"id": external_id, "title": title, "sal": salary_min, "shown": int(salary_min is not None),
         "scraped": ago(days_old), "active": active},
    )
    conn.commit()


def rows(conn, table):
    return conn.execute(text(f"SELECT * FROM {table} ORDER BY external_id")).mappings().all()


def test_purged_jobs_are_archived(conn):
    add(conn, "old-salary", active=False, days_old=45, salary_min=1400)
    add(conn, "old-nosalary", active=False, days_old=45)
    add(conn, "recently-expired", active=False, days_old=10, salary_min=1200)
    add(conn, "live", active=True, days_old=60, salary_min=2000)

    assert base.purge_old_jobs(conn) == 2

    assert [r["external_id"] for r in rows(conn, "jobs")] == ["live", "recently-expired"]
    archived = rows(conn, "job_archive")
    assert [r["external_id"] for r in archived] == ["old-nosalary", "old-salary"]
    a = archived[1]
    assert (a["title"], a["company"], a["location"], a["category"], a["source"]) == ("Kuhar", "Restoran d.o.o.", "Split", "Turizam", "hzz")
    assert (a["salary_min"], a["salary_shown"], a["salary_basis"]) == (1400, 1, "bruto")
    assert a["scraped_at"] and a["archived_at"]
    assert "description" not in a and "ad_text" not in a


def test_rearchiving_keeps_the_latest_state(conn):
    # The migration copied the ad while it was live; it changed before being purged.
    cols = ", ".join(base.ARCHIVE_COLUMNS)
    add(conn, "x1", active=False, days_old=45, salary_min=1500, title="Kuhar/ica")
    conn.execute(text(f"INSERT INTO job_archive ({cols}) SELECT {cols} FROM jobs"))
    conn.execute(text("UPDATE job_archive SET title='Kuhar', salary_min=1000"))
    conn.commit()

    base.purge_old_jobs(conn)

    [a] = rows(conn, "job_archive")
    assert (a["title"], a["salary_min"]) == ("Kuhar/ica", 1500)


def test_nothing_to_purge(conn):
    add(conn, "live", active=True, days_old=1, salary_min=2000)
    assert base.purge_old_jobs(conn) == 0
    assert rows(conn, "job_archive") == []
