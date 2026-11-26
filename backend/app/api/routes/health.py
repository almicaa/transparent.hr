from fastapi import APIRouter

router = APIRouter(tags=["health"])


@router.get("/health")
def health():
    """Liveness only, and it must not touch the database: uptime monitors call
    it every few minutes, and a query each time would keep Neon from scaling
    to zero. Scraper health is watched by the heartbeat in run_all_scrapers.py."""
    return {"status": "ok"}
