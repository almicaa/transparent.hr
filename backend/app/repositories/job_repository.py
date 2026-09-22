import os
import sys
from collections import Counter
from datetime import date

from sqlalchemy import func, or_, select
from sqlalchemy.orm import Session

from app.models.job import Job
from app.models.market_stat import MarketStat

sys.path.insert(0, os.path.normpath(os.path.join(os.path.dirname(__file__), "..", "..", "..")))
from shared.location_normalizer import CITY_ALIASES, FOREIGN_LOCATION_KEYWORDS, normalize_city  # noqa: E402


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
        region: str | None = None,
        sort: str = "newest",
        page: int = 1,
        per_page: int = 21,
    ) -> tuple[int, list[Job]]:
        stmt = select(Job).where(Job.is_active.is_(True))

        if salary_shown is not None:
            stmt = stmt.where(Job.salary_shown == int(salary_shown))
        if salary_min is not None:
            stmt = stmt.where(Job.salary_max >= salary_min)
        if salary_max is not None:
            stmt = stmt.where(Job.salary_min <= salary_max)
        if city:
            variants = [raw for raw, canon in CITY_ALIASES.items() if canon.lower() == city.lower()]
            stmt = stmt.where(
                or_(Job.location.ilike(f"%{city}%"), *(Job.location.ilike(f"%{v}%") for v in variants))
            )
        if region == "foreign":
            stmt = stmt.where(or_(*(Job.location.ilike(f"%{kw}%") for kw in FOREIGN_LOCATION_KEYWORDS)))
        elif region == "hr":
            stmt = stmt.where(~or_(*(Job.location.ilike(f"%{kw}%") for kw in FOREIGN_LOCATION_KEYWORDS)))
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
        return self.db.scalar(select(func.count()).select_from(Job).where(Job.is_active.is_(True))) or 0

    def count_salary_shown(self, shown: bool) -> int:
        return self.db.scalar(
            select(func.count())
            .select_from(Job)
            .where(Job.is_active.is_(True), Job.salary_shown == int(shown))
        ) or 0

    def count_new_today(self) -> int:
        return self.db.scalar(
            select(func.count())
            .select_from(Job)
            .where(Job.is_active.is_(True), func.date(Job.scraped_at) == date.today())
        ) or 0

    def counts_by_source(self) -> list[tuple[str, int]]:
        stmt = select(Job.source, func.count()).where(Job.is_active.is_(True)).group_by(Job.source)
        return [(row[0], row[1]) for row in self.db.execute(stmt)]

    def top_cities(self, limit: int = 10) -> list[tuple[str, int]]:
        stmt = (
            select(Job.location, func.count())
            .where(Job.is_active.is_(True), Job.location.is_not(None))
            .group_by(Job.location)
        )
        counts = Counter()
        for raw, cnt in self.db.execute(stmt):
            city = normalize_city(raw)
            if city:
                counts[city] += cnt
        return counts.most_common(limit)

    def distinct_locations(self) -> list[str]:
        stmt = (
            select(Job.location)
            .where(Job.is_active.is_(True), Job.location.is_not(None))
            .distinct()
            .order_by(Job.location)
        )
        return [row[0] for row in self.db.execute(stmt)]

    def distinct_cities(self) -> list[str]:
        cities = {normalize_city(loc) for loc in self.distinct_locations()}
        return sorted(c for c in cities if c)

    def distinct_categories(self) -> list[str]:
        stmt = (
            select(Job.category)
            .where(Job.is_active.is_(True), Job.category.is_not(None))
            .distinct()
            .order_by(Job.category)
        )
        return [row[0] for row in self.db.execute(stmt)]

    def distinct_job_types(self) -> list[str]:
        stmt = (
            select(Job.job_type)
            .where(Job.is_active.is_(True), Job.job_type.is_not(None))
            .distinct()
            .order_by(Job.job_type)
        )
        return [row[0] for row in self.db.execute(stmt)]

    def market_estimates(self) -> list[tuple[str, float]]:
        stmt = select(MarketStat.source, MarketStat.estimated_pct)
        return [(row[0], row[1]) for row in self.db.execute(stmt)]
