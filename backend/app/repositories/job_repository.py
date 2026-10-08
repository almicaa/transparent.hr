import os
import sys
from collections import Counter
from datetime import date

from sqlalchemy import and_, func, or_, select
from sqlalchemy.orm import Session

from app.db.session import utcnow
from app.models.job import Job
from app.models.market_stat import MarketStat

sys.path.insert(0, os.path.normpath(os.path.join(os.path.dirname(__file__), "..", "..", "..")))
from shared.category_normalizer import OTHER as OTHER_CATEGORY  # noqa: E402
from shared.location_normalizer import (  # noqa: E402
    CITY_ALIASES,
    FOREIGN_LOCATION_KEYWORDS,
    country_keywords,
    match_countries,
    normalize_city,
    split_cities,
)


def _live():
    """Active and not past its deadline. The scraper deactivates expired jobs on
    each run; this also hides ones that expired since the last run."""
    return and_(Job.is_active.is_(True), or_(Job.expires_at.is_(None), Job.expires_at > utcnow()))


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
        country: str | None = None,
        sort: str = "newest",
        page: int = 1,
        per_page: int = 21,
    ) -> tuple[int, list[Job]]:
        stmt = select(Job).where(_live())

        # "from"-type salaries ("od 2000 €") only have a lower bound, so fall back to it.
        salary_top = func.coalesce(Job.salary_max, Job.salary_min)

        if salary_shown is not None:
            stmt = stmt.where(Job.salary_shown == int(salary_shown))
        if salary_min is not None:
            stmt = stmt.where(salary_top >= salary_min)
        if salary_max is not None:
            stmt = stmt.where(Job.salary_min <= salary_max)
        if city:
            if city.lower() == "cijela hrvatska":
                variants = ["hrvatska"]
            else:
                variants = [city] + [raw for raw, canon in CITY_ALIASES.items() if canon.lower() == city.lower()]
            stmt = stmt.where(or_(*(Job.location.ilike(f"%{v}%") for v in variants)))
        if country:
            stmt = stmt.where(or_(*(Job.location.ilike(f"%{kw}%") for kw in country_keywords(country) or [country])))
        if region == "foreign":
            stmt = stmt.where(or_(*(Job.location.ilike(f"%{kw}%") for kw in FOREIGN_LOCATION_KEYWORDS)))
        elif region == "hr":
            stmt = stmt.where(~or_(*(Job.location.ilike(f"%{kw}%") for kw in FOREIGN_LOCATION_KEYWORDS)))
        if category:
            stmt = stmt.where(Job.category == category)
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

        # nulls_last: Postgres puts NULLs first on DESC, which floated jobs
        # without a parsed amount to the top of "highest salary".
        order_map = {
            "newest": Job.scraped_at.desc(),
            "salary_desc": salary_top.desc().nulls_last(),
            "salary_asc": Job.salary_min.asc().nulls_last(),
        }
        stmt = stmt.order_by(order_map.get(sort, Job.scraped_at.desc()), Job.id.desc())
        stmt = stmt.offset((page - 1) * per_page).limit(per_page)

        rows = list(self.db.scalars(stmt))
        return total, rows

    def get_by_id(self, job_id: int) -> Job | None:
        # Expired jobs 404 like deleted ones. Their rows stay until purge_old_jobs
        # so the scraper still recognizes them — portals keep listing ads for
        # weeks past the deadline, and a deleted row would get re-scraped as new.
        return self.db.scalar(select(Job).where(Job.id == job_id, _live()))

    def count_all(self) -> int:
        return self.db.scalar(select(func.count()).select_from(Job).where(_live())) or 0

    def count_salary_shown(self, shown: bool) -> int:
        return self.db.scalar(
            select(func.count())
            .select_from(Job)
            .where(_live(), Job.salary_shown == int(shown))
        ) or 0

    def count_new_today(self) -> int:
        return self.db.scalar(
            select(func.count())
            .select_from(Job)
            .where(_live(), func.date(Job.scraped_at) == date.today())
        ) or 0

    def counts_by_source(self) -> list[tuple[str, int]]:
        stmt = select(Job.source, func.count()).where(_live()).group_by(Job.source)
        return [(row[0], row[1]) for row in self.db.execute(stmt)]

    def top_cities(self, limit: int = 10) -> list[tuple[str, int]]:
        stmt = (
            select(Job.location, func.count())
            .where(_live(), Job.location.is_not(None))
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
            .where(_live(), Job.location.is_not(None))
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
            .where(_live(), Job.category.is_not(None))
            .distinct()
        )
        # Alphabetical, but the catch-all "Ostalo" goes last.
        return sorted((row[0] for row in self.db.execute(stmt)), key=lambda c: (c == OTHER_CATEGORY, c))

    def distinct_job_types(self) -> list[str]:
        stmt = (
            select(Job.job_type)
            .where(_live(), Job.job_type.is_not(None))
            .distinct()
            .order_by(Job.job_type)
        )
        return [row[0] for row in self.db.execute(stmt)]

    def option_counts(self) -> tuple[Counter, Counter, Counter]:
        """Per-category, per-city and per-country counts of active jobs with a
        salary — the set the job browser lists — for filter dropdowns. A job
        listing several cities counts toward each, matching the city filter's
        substring match."""
        stmt = select(Job.category, Job.location).where(_live(), Job.salary_shown == 1)
        categories, cities, countries = Counter(), Counter(), Counter()
        for category, location in self.db.execute(stmt):
            if category:
                categories[category] += 1
            cities.update(split_cities(location))
            countries.update(match_countries(location))
        return categories, cities, countries

    def market_estimates(self) -> list[tuple[str, float]]:
        stmt = select(MarketStat.source, MarketStat.estimated_pct)
        return [(row[0], row[1]) for row in self.db.execute(stmt)]
