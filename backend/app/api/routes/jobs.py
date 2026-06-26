from fastapi import APIRouter, Depends, HTTPException, Query

from app.api.deps import get_job_service
from app.schemas.job import Filters, JobList, JobOut
from app.services.job_service import JobService

router = APIRouter(prefix="/api", tags=["jobs"])


@router.get("/jobs", response_model=JobList)
def get_jobs(
    salary_shown: str | None = Query(None, description="'yes', 'no', ili None za sve"),
    salary_min: float | None = Query(None, description="minimalna plaća u EUR"),
    salary_max: float | None = Query(None, description="maksimalna plaća u EUR"),
    city: str | None = Query(None),
    category: str | None = Query(None),
    job_type: str | None = Query(None),
    source: str | None = Query(None),
    company: str | None = Query(None),
    search: str | None = Query(None),
    region: str | None = Query(None, description="'hr' | 'foreign' | None za sve"),
    sort: str = Query("newest", description="newest | salary_desc | salary_asc"),
    page: int = Query(1, ge=1),
    per_page: int = Query(21, ge=1, le=100),
    service: JobService = Depends(get_job_service),
):
    return service.list_jobs(
        salary_shown=salary_shown,
        salary_min=salary_min,
        salary_max=salary_max,
        city=city,
        category=category,
        job_type=job_type,
        source=source,
        company=company,
        search=search,
        region=region,
        sort=sort,
        page=page,
        per_page=per_page,
    )


@router.get("/jobs/{job_id}", response_model=JobOut)
def get_job(job_id: int, service: JobService = Depends(get_job_service)):
    job = service.get_job(job_id)
    if not job:
        raise HTTPException(status_code=404, detail="Job not found")
    return job


@router.get("/filters", response_model=Filters)
def get_filters(service: JobService = Depends(get_job_service)):
    return service.get_filters()
