from datetime import date

from sqlalchemy import func, select
from sqlalchemy.orm import Session

from app.models.job import Job
from app.models.market_stat import MarketStat


class JobRepository:
    def __init__(self, db: Session):
        self.db = db

    def list_jobs(
        self,
        *,
        salary_shown: bool | None = None,
        salary_min: float | None = None,
        salary_max: float | None = None,
        city: str | None = None,
        category: str | None = None,
        job_type: str | None = None,
        source: str | None = None,
        company: str | None = None,
        search: str | None = None,
        sort: str = "newest",
        page: int = 1,
        per_page: int = 21,
    ) -> tuple[int, list[Job]]:
        stmt = select(Job)

        if salary_shown is not None:
            stmt = stmt.where(Job.salary_shown == int(salary_shown))
        if salary_min is not None:
            stmt = stmt.where(Job.salary_max >= salary_min)
        if salary_max is not None:
            stmt = stmt.where(Job.salary_min <= salary_max)
        if city:
            stmt = stmt.where(Job.location.ilike(f"%{city}%"))
        if category:
            stmt = stmt.where(Job.category.ilike(f"%{category}%"))
        if job_type:
            stmt = stmt.where(Job.job_type.ilike(f"%{job_type}%"))
        if source:
            stmt = stmt.where(Job.source == source)
        if company:
            stmt = stmt.where(Job.company.ilike(f"%{company}%"))
        if search:
            term = f"%{search}%"
            stmt = stmt.where(
                Job.title.ilike(term) | Job.company.ilike(term) | Job.description.ilike(term)
            )

        total = self.db.scalar(select(func.count()).select_from(stmt.subquery())) or 0

        order_map = {
            "newest": Job.scraped_at.desc(),
            "salary_desc": Job.salary_max.desc(),
            "salary_asc": Job.salary_min.asc(),
        }
        stmt = stmt.order_by(order_map.get(sort, Job.scraped_at.desc()))
        stmt = stmt.offset((page - 1) * per_page).limit(per_page)

        rows = list(self.db.scalars(stmt))
        return total, rows

    def get_by_id(self, job_id: int) -> Job | None:
        return self.db.get(Job, job_id)

    def count_all(self) -> int:
        return self.db.scalar(select(func.count()).select_from(Job)) or 0

    def count_salary_shown(self, shown: bool) -> int:
        return self.db.scalar(
            select(func.count()).select_from(Job).where(Job.salary_shown == int(shown))
        ) or 0

    def count_new_today(self) -> int:
        return self.db.scalar(
            select(func.count()).select_from(Job).where(func.date(Job.scraped_at) == date.today())
        ) or 0

    def counts_by_source(self) -> list[tuple[str, int]]:
        stmt = select(Job.source, func.count()).group_by(Job.source)
        return [(row[0], row[1]) for row in self.db.execute(stmt)]

    def top_cities(self, limit: int = 10) -> list[tuple[str, int]]:
        stmt = (
            select(Job.location, func.count())
            .where(Job.location.is_not(None))
            .group_by(Job.location)
            .order_by(func.count().desc())
            .limit(limit)
        )
        return [(row[0], row[1]) for row in self.db.execute(stmt)]

    def distinct_locations(self) -> list[str]:
        stmt = select(Job.location).where(Job.location.is_not(None)).distinct().order_by(Job.location)
        return [row[0] for row in self.db.execute(stmt)]

    def distinct_categories(self) -> list[str]:
        stmt = select(Job.category).where(Job.category.is_not(None)).distinct().order_by(Job.category)
        return [row[0] for row in self.db.execute(stmt)]

    def distinct_job_types(self) -> list[str]:
        stmt = select(Job.job_type).where(Job.job_type.is_not(None)).distinct().order_by(Job.job_type)
        return [row[0] for row in self.db.execute(stmt)]

    def market_estimates(self) -> list[tuple[str, float]]:
        stmt = select(MarketStat.source, MarketStat.estimated_pct)
        return [(row[0], row[1]) for row in self.db.execute(stmt)]
