import os
import sys
from collections import Counter
from datetime import date, datetime, timedelta

from sqlalchemy import and_, case, func, or_, select
from sqlalchemy.orm import Session

from app.db.session import utcnow
from app.models.job import Job
from app.models.market_stat import MarketStat
from app.models.scrape_log import ScrapeLog

sys.path.insert(0, os.path.normpath(os.path.join(os.path.dirname(__file__), "..", "..", "..")))
from shared.category_normalizer import OTHER as OTHER_CATEGORY  # noqa: E402
from shared.location_normalizer import (  # noqa: E402
    FOREIGN_LOCATION_KEYWORDS,
    country_keywords,
    match_countries,
    normalize_city,
    split_cities,
)


# How recent a job must be to count as "new" — the "Samo novi oglasi" toggle.
NEW_JOB_DAYS = 3


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
        new_only: bool = False,
        sort: str = "newest",
        page: int = 1,
        per_page: int = 21,
        grouped: bool = True,
    ) -> tuple[int, list[tuple[Job, int, list[str]]]]:
        """Returns (total, page) where each entry is (job, how many ads it stands
        for, their locations). With `grouped`, ads that differ only by location
        (a chain posting one ad per store) collapse into one entry, and the total
        and paging count those entries."""
        stmt = select(Job).where(_live())

        # "from"-type salaries ("od 2000 €") only have a lower bound, so fall back to it.
        # Hourly and yearly pay don't compare with monthly amounts: they match
        # no salary filter and sort as if no amount were given.
        monthly = Job.salary_period.is_(None)
        salary_top = case((monthly, func.coalesce(Job.salary_max, Job.salary_min)))
        salary_low = case((monthly, Job.salary_min))

        if salary_shown is not None:
            stmt = stmt.where(Job.salary_shown == int(salary_shown))
        if salary_min is not None:
            stmt = stmt.where(salary_top >= salary_min)
        if salary_max is not None:
            stmt = stmt.where(salary_low <= salary_max)
        if city:
            # Same parsing as the per-city counts (option_counts), so "Split (11)"
            # in the dropdown gives 11 results — a plain ILIKE '%Split%' would
            # also catch "Splitsko-dalmatinska županija".
            stmt = stmt.where(Job.id.in_(self._ids_in_city(city)))
        if new_only:
            stmt = stmt.where(Job.scraped_at >= utcnow() - timedelta(days=NEW_JOB_DAYS))
        if country:
            stmt = stmt.where(or_(*(Job.location.ilike(f"%{kw}%") for kw in country_keywords(country) or [country])))
        if region == "foreign":
            stmt = stmt.where(or_(*(Job.location.ilike(f"%{kw}%") for kw in FOREIGN_LOCATION_KEYWORDS)))
        elif region == "hr":
            # Jobs with no location come from Croatian portals — count them as domestic
            # (a bare NOT ILIKE would drop them, since it's NULL for a NULL location).
            stmt = stmt.where(
                or_(Job.location.is_(None), ~or_(*(Job.location.ilike(f"%{kw}%") for kw in FOREIGN_LOCATION_KEYWORDS)))
            )
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

        if grouped:
            return self._grouped_page(stmt, sort=sort, page=page, per_page=per_page)

        total = self.db.scalar(select(func.count()).select_from(stmt.subquery())) or 0

        # nulls_last: Postgres puts NULLs first on DESC, which floated jobs
        # without a parsed amount to the top of "highest salary".
        order_map = {
            "newest": Job.scraped_at.desc(),
            "salary_desc": salary_top.desc().nulls_last(),
            "salary_asc": salary_low.asc().nulls_last(),
        }
        stmt = stmt.order_by(order_map.get(sort, Job.scraped_at.desc()), Job.id.desc())
        stmt = stmt.offset((page - 1) * per_page).limit(per_page)

        rows = list(self.db.scalars(stmt))
        return total, [(row, 1, [row.location] if row.location else []) for row in rows]

    def _grouped_page(self, stmt, *, sort: str, page: int, per_page: int):
        """Group the filtered jobs in Python: the live set is a few thousand rows
        at most, and doing it here keeps it the same on SQLite and Postgres."""
        rows = self.db.execute(
            stmt.with_only_columns(
                Job.id, Job.title, Job.company, Job.salary_min, Job.salary_max,
                Job.salary_basis, Job.salary_period, Job.source, Job.scraped_at, Job.location,
            )
        ).all()

        groups: dict[tuple, list] = {}
        for r in rows:
            key = (
                " ".join((r.title or "").lower().split()),
                (r.company or "").strip().lower(),
                r.salary_min, r.salary_max, r.salary_basis, r.salary_period, r.source,
            )
            groups.setdefault(key, []).append(r)

        oldest = datetime.min
        entries = []
        for members in groups.values():
            # The newest ad represents the group (its link, deadline and "Novo").
            rep = max(members, key=lambda r: (r.scraped_at or oldest, r.id))
            # City names, not raw strings like "Zagreb (Ilica, Savica)".
            locations = list(dict.fromkeys(c for r in members if r.location for c in sorted(split_cities(r.location))))
            entries.append((rep, len(members), locations))

        def top(r):
            if r.salary_period is not None:
                return None
            return r.salary_max if r.salary_max is not None else r.salary_min

        def low(r):
            return None if r.salary_period is not None else r.salary_min

        # Missing amounts sort last either way; ties go to the newer ad.
        if sort == "salary_desc":
            entries.sort(key=lambda e: (top(e[0]) is None, -(top(e[0]) or 0), -e[0].id))
        elif sort == "salary_asc":
            entries.sort(key=lambda e: (low(e[0]) is None, low(e[0]) or 0, -e[0].id))
        else:
            entries.sort(key=lambda e: (e[0].scraped_at or oldest, e[0].id), reverse=True)

        page_entries = entries[(page - 1) * per_page : page * per_page]
        jobs = {j.id: j for j in self.db.scalars(select(Job).where(Job.id.in_([e[0].id for e in page_entries])))}
        return len(entries), [(jobs[rep.id], count, locations) for rep, count, locations in page_entries]

    def _ids_in_city(self, city: str) -> list[int]:
        wanted = city.lower()
        rows = self.db.execute(select(Job.id, Job.location).where(_live(), Job.location.is_not(None)))
        return [job_id for job_id, location in rows if wanted in {c.lower() for c in split_cities(location)}]

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

    def last_scrape_finished(self):
        return self.db.scalar(select(func.max(ScrapeLog.finished_at)).where(ScrapeLog.status == "success"))

    def salary_points(self) -> list[tuple[str | None, str | None, float, bool]]:
        """(category, salary_basis, monthly midpoint, is_foreign) for every live
        job with a parsed monthly amount — the raw material for the histogram and
        category medians."""
        stmt = select(Job.category, Job.salary_basis, Job.salary_min, Job.salary_max, Job.location).where(
            _live(), Job.salary_shown == 1, Job.salary_min.is_not(None), Job.salary_period.is_(None)
        )
        return [
            (category, basis, (lo + (hi if hi is not None else lo)) / 2, bool(match_countries(location)))
            for category, basis, lo, hi, location in self.db.execute(stmt)
        ]

    def option_counts(self) -> tuple[Counter, Counter, Counter, Counter]:
        """Per-category, per-region ('hr' / 'foreign'), per-city and per-country
        counts of live jobs with a salary — the set the job browser lists — for
        filter dropdowns. A job listing several cities counts toward each,
        matching the city filter's substring match."""
        stmt = select(Job.category, Job.location).where(_live(), Job.salary_shown == 1)
        categories, regions, cities, countries = Counter(), Counter(), Counter(), Counter()
        for category, location in self.db.execute(stmt):
            if category:
                categories[category] += 1
            job_countries = match_countries(location)
            # Same split as the API's region filter: foreign iff a country is named.
            regions["foreign" if job_countries else "hr"] += 1
            cities.update(split_cities(location))
            countries.update(job_countries)
        return categories, regions, cities, countries

    def market_estimates(self) -> list[tuple[str, float]]:
        stmt = select(MarketStat.source, MarketStat.estimated_pct)
        return [(row[0], row[1]) for row in self.db.execute(stmt)]
