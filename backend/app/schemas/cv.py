from pydantic import BaseModel

from app.schemas.job import JobOut


class CvMatch(BaseModel):
    job: JobOut
    reason: str
    """One sentence on why the job fits the CV."""
    missing: str | None = None
    """Something the ad would like (e.g. a language) that the CV doesn't show."""


class CvMatchResult(BaseModel):
    profile_summary: str
    matches: list[CvMatch]
