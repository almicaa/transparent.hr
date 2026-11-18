from datetime import datetime

from sqlalchemy import DateTime, Float, Integer, String
from sqlalchemy.orm import Mapped, mapped_column

from app.db.session import Base, utcnow


class JobArchive(Base):
    """Every ad ever scraped, kept after purge_old_jobs deletes it from `jobs`.

    `jobs` is a sliding window (expired ads go after ~30 days); this keeps the
    salary history for trends and per-role pay pages. Long texts (description,
    ad_text) are left out to keep it small. One row per external_id; the scraper
    upserts the ad's last state right before deleting it.
    """

    __tablename__ = "job_archive"

    id: Mapped[int] = mapped_column(Integer, primary_key=True, autoincrement=True)
    external_id: Mapped[str] = mapped_column(String, unique=True, nullable=False)
    source: Mapped[str | None] = mapped_column(String, index=True)
    title: Mapped[str] = mapped_column(String, nullable=False)
    company: Mapped[str | None] = mapped_column(String)
    location: Mapped[str | None] = mapped_column(String)
    address_region: Mapped[str | None] = mapped_column(String)
    category: Mapped[str | None] = mapped_column(String, index=True)
    category_raw: Mapped[str | None] = mapped_column(String)
    job_type: Mapped[str | None] = mapped_column(String)
    contract_type: Mapped[str | None] = mapped_column(String)
    education: Mapped[str | None] = mapped_column(String)
    experience: Mapped[str | None] = mapped_column(String)
    openings: Mapped[int | None] = mapped_column(Integer)
    salary_shown: Mapped[int] = mapped_column(Integer, default=0)
    salary_min: Mapped[float | None] = mapped_column(Float)
    salary_max: Mapped[float | None] = mapped_column(Float)
    salary_text: Mapped[str | None] = mapped_column(String)
    salary_currency: Mapped[str | None] = mapped_column(String)
    salary_basis: Mapped[str | None] = mapped_column(String)
    salary_type: Mapped[str | None] = mapped_column(String)
    salary_period: Mapped[str | None] = mapped_column(String)
    url: Mapped[str | None] = mapped_column(String)
    posted_at: Mapped[str | None] = mapped_column(String)
    scraped_at: Mapped[datetime | None] = mapped_column(DateTime, index=True)
    expires_at: Mapped[datetime | None] = mapped_column(DateTime)
    archived_at: Mapped[datetime] = mapped_column(DateTime, default=utcnow)
