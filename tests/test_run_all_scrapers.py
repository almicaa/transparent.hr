"""run_all_scrapers: one failing source must not stop the others, and a source
whose last two runs failed or found no ads must trigger an alert email."""

import asyncio

import pytest
from sqlalchemy import create_engine, text
from sqlalchemy.pool import StaticPool

import run_all_scrapers as runner
from scraper import base_scraper as base

ALERT = "Transparent.hr: problem sa scraperom"


@pytest.fixture
def db(monkeypatch):
    engine = create_engine("sqlite://", poolclass=StaticPool, connect_args={"check_same_thread": False})
    with engine.begin() as conn:
        conn.execute(text("""
            CREATE TABLE scrape_logs (
                id INTEGER PRIMARY KEY AUTOINCREMENT, source TEXT, started_at TEXT,
                finished_at TEXT, jobs_found INTEGER, jobs_saved INTEGER,
                status TEXT, error_message TEXT
            )
        """))
    monkeypatch.setattr(base, "_engine", engine)
    return engine


def fake_scraper(source, *, found=0, saved=0, new=(), crash=False):
    """Behaves like a real scraper: opens a log, then finishes it or raises."""

    async def scrape(**_):
        conn = base.get_connection()
        log_id = base.start_scrape_log(conn, source)
        if crash:
            conn.close()
            raise RuntimeError(f"{source} selector not found")
        base.finish_scrape_log(conn, log_id, jobs_found=found, jobs_saved=saved)
        conn.close()
        return list(new)

    return scrape


@pytest.fixture
def emails(monkeypatch):
    sent = []
    monkeypatch.setattr(runner, "send_notification", lambda subject, body: sent.append((subject, body)))
    return sent


def use(monkeypatch, posao, mojposao, hzz):
    monkeypatch.setattr(runner.posao_hr, "scrape_posao", posao)
    monkeypatch.setattr(runner.mojposao_hr, "scrape_jobs", mojposao)
    monkeypatch.setattr(runner.hzz_hr, "scrape_hzz", hzz)


def run():
    return asyncio.run(runner.run_all())


def alerts(emails):
    return [body for subject, body in emails if subject.startswith(ALERT)]


def logs(engine):
    with engine.connect() as conn:
        rows = conn.execute(text("SELECT source, status, error_message FROM scrape_logs ORDER BY id")).all()
    return [(r.source, r.status, r.error_message) for r in rows]


def test_failing_source_does_not_stop_the_others(db, emails, monkeypatch):
    job = {"title": "Kuhar", "salary_text": "1.200 €", "url": "https://example.com/1"}
    use(monkeypatch,
        fake_scraper("posao", crash=True),
        fake_scraper("mojposao", found=40, saved=1, new=[job]),
        fake_scraper("hzz", found=300))

    assert run() is True  # first failure: no alert yet

    statuses = logs(db)
    assert [(s, st) for s, st, _ in statuses] == [("posao", "error"), ("mojposao", "success"), ("hzz", "success")]
    assert "selector not found" in statuses[0][2]
    assert [s for s, _ in emails] == ["Transparent.hr: 1 novih oglasa s plaćom"]


def test_two_failures_in_a_row_alert(db, emails, monkeypatch):
    use(monkeypatch, fake_scraper("posao", crash=True), fake_scraper("mojposao", found=40), fake_scraper("hzz", found=300))
    run()
    assert alerts(emails) == []

    assert run() is False
    [body] = alerts(emails)
    assert "Posao.hr: scraper je pao (2 runa zaredom)" in body
    assert "selector not found" in body


def test_two_empty_runs_in_a_row_alert(db, emails, monkeypatch):
    use(monkeypatch, fake_scraper("posao", found=25), fake_scraper("mojposao", found=0), fake_scraper("hzz", found=300))
    run()
    assert alerts(emails) == []

    assert run() is False
    [body] = alerts(emails)
    assert "MojPosao: scraper nije pronašao nijedan oglas (2 runa zaredom)" in body


def test_crash_then_empty_counts_as_two_failures(db, emails, monkeypatch):
    use(monkeypatch, fake_scraper("posao", found=25), fake_scraper("mojposao", found=40), fake_scraper("hzz", crash=True))
    run()
    use(monkeypatch, fake_scraper("posao", found=25), fake_scraper("mojposao", found=40), fake_scraper("hzz", found=0))
    assert run() is False
    [body] = alerts(emails)
    assert "HZZ: scraper nije pronašao nijedan oglas" in body


def test_good_run_in_between_resets(db, emails, monkeypatch):
    for posao in (fake_scraper("posao", crash=True), fake_scraper("posao", found=25), fake_scraper("posao", crash=True)):
        use(monkeypatch, posao, fake_scraper("mojposao", found=40), fake_scraper("hzz", found=300))
        assert run() is True
    assert alerts(emails) == []
