from fastapi import Depends
from sqlalchemy.orm import Session

from app.db.session import get_db
from app.repositories.job_repository import JobRepository
from app.services.job_service import JobService


def get_job_service(db: Session = Depends(get_db)) -> JobService:
    return JobService(JobRepository(db))
