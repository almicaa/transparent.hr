from fastapi import APIRouter, Depends
from sqlalchemy import text
from typing import List
from pydantic import BaseModel

from app.api.deps import get_job_service, get_db
from app.schemas.job import Stats
from app.services.job_service import JobService

router = APIRouter(prefix="/api", tags=["stats"])


@router.get("/stats", response_model=Stats)
def get_stats(service: JobService = Depends(get_job_service)):
    return service.get_stats()


class SalaryStatPoint(BaseModel):
    source: str
    date: str
    total_jobs: int
    jobs_with_salary: int
    pct: float


@router.get("/analitika/transparency", response_model=List[SalaryStatPoint])
def get_transparency(db=Depends(get_db)):
    rows = db.execute(
        text("SELECT source, date::text, total_jobs, jobs_with_salary, pct FROM salary_stats ORDER BY date ASC, source ASC")
    ).fetchall()
    return [SalaryStatPoint(source=r[0], date=r[1], total_jobs=r[2], jobs_with_salary=r[3], pct=r[4]) for r in rows]
