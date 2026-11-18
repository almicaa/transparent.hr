from datetime import datetime, timedelta, timezone

from fastapi import APIRouter, Depends
from fastapi.responses import JSONResponse
from sqlalchemy import func, select
from sqlalchemy.orm import Session

from app.core.config import settings
from app.db.session import get_db, utcnow
from app.models.scrape_log import ScrapeLog

router = APIRouter(tags=["health"])

SOURCES = ("posao", "mojposao", "hzz")


@router.get("/health")
def health():
    """Liveness only: the platform restarts the instance when this fails, so it
    must not depend on the scraper."""
    return {"status": "ok"}


def _naive_utc(value) -> datetime | None:
    # The scraper writes ISO strings with "+00:00"; on SQLite they come back as text.
    if value is None:
        return None
    if isinstance(value, str):
        value = datetime.fromisoformat(value)
    if value.tzinfo is not None:
        value = value.astimezone(timezone.utc).replace(tzinfo=None)
    return value


@router.get("/health/scraper")
def scraper_health(db: Session = Depends(get_db)):
    """503 when a source has had no successful run that found ads for
    `scraper_stale_hours`. Meant for an uptime monitor, not the platform's
    health check."""
    rows = db.execute(
        select(ScrapeLog.source, func.max(ScrapeLog.finished_at))
        .where(ScrapeLog.status == "success", ScrapeLog.jobs_found > 0)
        .group_by(ScrapeLog.source)
    ).all()
    last_ok = {source: _naive_utc(finished) for source, finished in rows}

    limit = timedelta(hours=settings.scraper_stale_hours)
    now = utcnow()
    sources = {}
    for source in SOURCES:
        finished = last_ok.get(source)
        sources[source] = {
            "last_success": finished.isoformat() + "Z" if finished else None,
            "stale": finished is None or now - finished > limit,
        }

    stale = [s for s, info in sources.items() if info["stale"]]
    body = {"status": "stale" if stale else "ok", "stale_hours": settings.scraper_stale_hours, "sources": sources}
    return JSONResponse(body, status_code=503 if stale else 200)
