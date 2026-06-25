from app.repositories.job_repository import JobRepository
from app.schemas.job import CityCount, Filters, JobList, JobOut, MarketEstimate, SourceCount, Stats


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
            sort=sort,
            page=page,
            per_page=per_page,
        )
        return JobList(
            total=total,
            page=page,
            per_page=per_page,
            jobs=[JobOut.model_validate(row, from_attributes=True) for row in rows],
        )

    def get_job(self, job_id: int) -> JobOut | None:
        row = self.repo.get_by_id(job_id)
        return JobOut.model_validate(row, from_attributes=True) if row else None

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
        )

    def get_filters(self) -> Filters:
        return Filters(
            cities=self.repo.distinct_locations(),
            categories=self.repo.distinct_categories(),
            job_types=self.repo.distinct_job_types(),
        )
