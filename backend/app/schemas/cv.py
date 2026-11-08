from pydantic import BaseModel

from app.schemas.job import JobOut


class CvMatch(BaseModel):
    job: JobOut
    reason: str
    """One sentence on why the job fits the CV."""


class CvMatchResult(BaseModel):
    profile_summary: str
    matches: list[CvMatch]
