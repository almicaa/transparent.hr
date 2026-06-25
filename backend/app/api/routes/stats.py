from fastapi import APIRouter, Depends

from app.api.deps import get_job_service
from app.schemas.job import Stats
from app.services.job_service import JobService

router = APIRouter(prefix="/api", tags=["stats"])


@router.get("/stats", response_model=Stats)
def get_stats(service: JobService = Depends(get_job_service)):
    return service.get_stats()
