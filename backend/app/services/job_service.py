from statistics import median

from app.models.job import Job
from app.repositories.job_repository import OTHER_CATEGORY, JobRepository
from app.schemas.job import (
    CityCount,
    FilterOption,
    Filters,
    JobList,
    JobOut,
    MarketEstimate,
    SalaryBucket,
    SourceCount,
    Stats,
)

SALARY_BUCKET_SIZE = 250
SALARY_HISTOGRAM_MIN = 500
SALARY_HISTOGRAM_MAX = 4000
"""Everything at or above this lands in one open-ended top bucket."""

# A category median needs this many same-basis peers before we compare against it.
MIN_PEERS = 5


class JobService:
    def __init__(self, repo: JobRepository):
        self.repo = repo

    def list_jobs(
        self,
        *,
        salary_shown: str | None,
        salary_min: float | None = None,
        salary_max: float | None = None,
        city: str | None,
        category: str | None,
        job_type: str | None,
        source: str | None,
        company: str | None = None,
        search: str | None,
        region: str | None = None,
        country: str | None = None,
        sort: str,
        page: int,
        per_page: int,
    ) -> JobList:
        shown = {"yes": True, "no": False}.get(salary_shown)
        total, rows = self.repo.list_jobs(
            salary_shown=shown,
            salary_min=salary_min,
            salary_max=salary_max,
            city=city,
            category=category,
            job_type=job_type,
            source=source,
            company=company,
            search=search,
            region=region,
            country=country,
            sort=sort,
            page=page,
            per_page=per_page,
        )
        return JobList(
            total=total,
            page=page,
            per_page=per_page,
            jobs=self._with_salary_context(rows),
        )

    def get_job(self, job_id: int) -> JobOut | None:
        row = self.repo.get_by_id(job_id)
        return self._with_salary_context([row])[0] if row else None

    def _with_salary_context(self, rows: list[Job]) -> list[JobOut]:
        """Serialize jobs, adding how each salary compares to its category.

        Only compares neto to neto and bruto to bruto — a large share of ads
        don't say which, and mixing them would make every bruto ad look generous."""
        groups: dict[tuple[str, str], list[float]] = {}
        for category, basis, midpoint in self.repo.salary_points():
            if category and basis:
                groups.setdefault((category, basis), []).append(midpoint)
        medians = {key: median(values) for key, values in groups.items() if len(values) >= MIN_PEERS}

        jobs = []
        for row in rows:
            job = JobOut.model_validate(row, from_attributes=True)
            peer_median = medians.get((row.category, row.salary_basis))
            if peer_median and row.salary_min is not None:
                midpoint = (row.salary_min + (row.salary_max if row.salary_max is not None else row.salary_min)) / 2
                job.salary_vs_category = round((midpoint / peer_median - 1) * 100, 1)
            jobs.append(job)
        return jobs

    def get_stats(self) -> Stats:
        total = self.repo.count_all()
        shown = self.repo.count_salary_shown(True)
        hidden = self.repo.count_salary_shown(False)
        new_today = self.repo.count_new_today()
        pct = round(shown / total * 100, 1) if total else 0.0
        return Stats(
            total=total,
            salary_shown=shown,
            salary_hidden=hidden,
            new_today=new_today,
            salary_shown_pct=pct,
            market_estimates=[
                MarketEstimate(source=s, estimated_pct=p) for s, p in self.repo.market_estimates()
            ],
            sources=[SourceCount(source=s, cnt=c) for s, c in self.repo.counts_by_source()],
            top_cities=[CityCount(location=l, cnt=c) for l, c in self.repo.top_cities()],
            last_updated=self.repo.last_scrape_finished(),
        )

    def get_filters(self) -> Filters:
        categories, regions, cities, countries = self.repo.option_counts()
        return Filters(
            cities=self.repo.distinct_cities(),
            locations=self.repo.distinct_locations(),
            categories=self.repo.distinct_categories(),
            job_types=self.repo.distinct_job_types(),
            category_options=_options(categories, last=OTHER_CATEGORY),
            region_options=[FilterOption(value=r, count=regions[r]) for r in ("hr", "foreign")],
            city_options=_options(cities),
            country_options=_options(countries),
            salary_histogram=self._salary_histogram(),
        )

    def _salary_histogram(self) -> list[SalaryBucket]:
        starts = range(SALARY_HISTOGRAM_MIN, SALARY_HISTOGRAM_MAX + 1, SALARY_BUCKET_SIZE)
        counts = dict.fromkeys(starts, 0)
        for _, _, midpoint in self.repo.salary_points():
            clamped = min(max(midpoint, SALARY_HISTOGRAM_MIN), SALARY_HISTOGRAM_MAX)
            start = SALARY_HISTOGRAM_MIN + int((clamped - SALARY_HISTOGRAM_MIN) // SALARY_BUCKET_SIZE) * SALARY_BUCKET_SIZE
            counts[start] += 1
        return [SalaryBucket(start=start, count=count) for start, count in counts.items()]


def _options(counts, last: str | None = None) -> list[FilterOption]:
    # Most jobs first (a catch-all like "Ostalo" pinned last); ties alphabetical
    # so the order is stable between requests.
    ordered = sorted(counts.items(), key=lambda vc: (vc[0] == last, -vc[1], vc[0]))
    return [FilterOption(value=v, count=c) for v, c in ordered]
