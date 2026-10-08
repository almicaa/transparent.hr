from datetime import datetime

from pydantic import BaseModel, ConfigDict


class JobOut(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: int
    external_id: str | None = None
    title: str
    company: str | None = None
    location: str | None = None
    job_type: str | None = None
    category: str | None = None
    salary_min: float | None = None
    salary_max: float | None = None
    salary_text: str | None = None
    salary_shown: bool
    salary_currency: str | None = None
    salary_basis: str | None = None
    salary_type: str | None = None
    description: str | None = None
    url: str | None = None
    source: str | None = None
    posted_at: str | None = None
    scraped_at: datetime | None = None
    expires_at: datetime | None = None
    is_active: bool = True
    salary_vs_category: float | None = None
    """How far this job's salary midpoint is from the median of its category's
    jobs with the same neto/bruto basis, in percent (+18.0 = 18% above). Only
    set when that peer group is big enough to mean something."""


class JobList(BaseModel):
    total: int
    page: int
    per_page: int
    jobs: list[JobOut]


class SourceCount(BaseModel):
    source: str
    cnt: int


class CityCount(BaseModel):
    location: str
    cnt: int


class MarketEstimate(BaseModel):
    source: str
    estimated_pct: float


class Stats(BaseModel):
    total: int
    salary_shown: int
    salary_hidden: int
    new_today: int
    # Share of OUR indexed jobs that show a salary — not a market-wide figure,
    # since we deliberately only scrape salary-filtered feeds.
    salary_shown_pct: float
    # Page-count-derived estimate of what share of each portal's ads show a
    # salary, independent of what we've actually indexed.
    market_estimates: list[MarketEstimate]
    sources: list[SourceCount]
    top_cities: list[CityCount]
    last_updated: datetime | None = None
    """When the most recent successful scraper run finished (UTC)."""


class FilterOption(BaseModel):
    value: str
    count: int


class SalaryBucket(BaseModel):
    start: int
    """Lower bound in EUR; each bucket spans SALARY_BUCKET_SIZE, the last one is open-ended."""
    count: int


class Filters(BaseModel):
    cities: list[str]
    locations: list[str]
    categories: list[str]
    job_types: list[str]
    # Same dimensions with job counts, most common first — what the filter UI uses.
    category_options: list[FilterOption] = []
    region_options: list[FilterOption] = []
    """'hr' and 'foreign' job counts."""
    city_options: list[FilterOption] = []
    country_options: list[FilterOption] = []
    salary_histogram: list[SalaryBucket] = []
