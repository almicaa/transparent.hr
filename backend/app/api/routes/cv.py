import time
from collections import deque

from fastapi import APIRouter, Depends, File, Form, HTTPException, Request, UploadFile
from fastapi.concurrency import run_in_threadpool
from sqlalchemy.orm import Session

from app.core.config import settings
from app.db.session import get_db
from app.repositories.job_repository import JobRepository
from app.schemas.cv import CvMatchResult
from app.services.cv_match import LANGUAGES, MAX_FILE_BYTES, CvError, match_cv

router = APIRouter(prefix="/api", tags=["cv"])

# Each request costs money on the Claude API, so cap it per visitor and per day.
# In memory: fine for one Render instance, and it resets on deploy.
_per_ip: dict[str, deque[float]] = {}
_today: list = [None, 0]  # [day, count]


def _client_ip(request: Request) -> str:
    # Render sits behind a proxy; the first X-Forwarded-For entry is the visitor.
    forwarded = request.headers.get("x-forwarded-for")
    if forwarded:
        return forwarded.split(",")[0].strip()
    return request.client.host if request.client else "unknown"


def _check_limits(ip: str, lang: str) -> None:
    now = time.time()
    hits = _per_ip.setdefault(ip, deque())
    while hits and hits[0] < now - 3600:
        hits.popleft()
    if len(hits) >= settings.cv_match_per_hour:
        raise HTTPException(
            429,
            "Too many attempts. Try again in an hour."
            if lang == "en"
            else "Previše pokušaja. Probaj ponovno za sat vremena.",
        )

    day = time.strftime("%Y-%m-%d", time.gmtime(now))
    if _today[0] != day:
        _today[:] = [day, 0]
        _per_ip.clear()
        _per_ip[ip] = hits
    if _today[1] >= settings.cv_match_per_day:
        raise HTTPException(
            429,
            "Today's limit for CV searches has been reached. Try again tomorrow."
            if lang == "en"
            else "Danas je dosegnut dnevni broj pretraga po životopisu. Probaj ponovno sutra.",
        )

    hits.append(now)
    _today[1] += 1


@router.post("/cv-match", response_model=CvMatchResult)
async def cv_match(
    request: Request,
    file: UploadFile = File(...),
    lang: str = Form("hr"),
    db: Session = Depends(get_db),
):
    """`lang` ("hr" or "en"): the language of the AI's notes and of error messages."""
    lang = lang if lang in LANGUAGES else "hr"
    data = await file.read(MAX_FILE_BYTES + 1)
    _check_limits(_client_ip(request), lang)
    try:
        # The Claude call is blocking and takes several seconds; keep it off the event loop.
        return await run_in_threadpool(match_cv, JobRepository(db), file.filename or "", file.content_type, data, lang)
    except CvError as e:
        raise HTTPException(400, e.message(lang))
