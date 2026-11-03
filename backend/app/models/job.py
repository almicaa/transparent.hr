from datetime import datetime

from sqlalchemy import Boolean, DateTime, Float, Integer, String
from sqlalchemy.orm import Mapped, mapped_column

from app.db.session import Base, utcnow


class Job(Base):
    __tablename__ = "jobs"

    id: Mapped[int] = mapped_column(Integer, primary_key=True, autoincrement=True)
    external_id: Mapped[str | None] = mapped_column(String, unique=True)
    title: Mapped[str] = mapped_column(String, nullable=False)
    company: Mapped[str | None] = mapped_column(String)
    location: Mapped[str | None] = mapped_column(String)
    job_type: Mapped[str | None] = mapped_column(String)
    category: Mapped[str | None] = mapped_column(String, index=True)
    """Canonical category from shared.category_normalizer — what the filter matches on."""
    category_raw: Mapped[str | None] = mapped_column(String)
    """The portal's own label, kept so categories can be re-mapped without re-scraping."""
    salary_min: Mapped[float | None] = mapped_column(Float)
    salary_max: Mapped[float | None] = mapped_column(Float)
    salary_text: Mapped[str | None] = mapped_column(String)
    salary_shown: Mapped[int] = mapped_column(Integer, default=0)
    salary_currency: Mapped[str | None] = mapped_column(String, default="EUR")
    salary_basis: Mapped[str | None] = mapped_column(String)
    """'neto' | 'bruto' | None (unstated)"""
    salary_type: Mapped[str | None] = mapped_column(String)
    """'range' | 'fixed' | 'from' | 'up_to' | 'above' | None"""
    salary_period: Mapped[str | None] = mapped_column(String)
    """'hour' | 'year' | None (monthly). Only monthly amounts feed salary filters, sorting and stats."""
    description: Mapped[str | None] = mapped_column(String)
    url: Mapped[str | None] = mapped_column(String)
    source: Mapped[str | None] = mapped_column(String)
    posted_at: Mapped[str | None] = mapped_column(String)
    scraped_at: Mapped[datetime] = mapped_column(DateTime, default=utcnow)
    expires_at: Mapped[datetime | None] = mapped_column(DateTime)
    """Parsed from the portal's own 'N dana do isteka' countdown, when available."""
    is_active: Mapped[bool] = mapped_column(Boolean, default=True, server_default="true")
    """Set False once expires_at has passed — hidden from the API by default."""

    # Details as the portal states them (HZZ for now); all optional.
    address_region: Mapped[str | None] = mapped_column(String)
    """County, e.g. 'Zagrebačka županija'."""
    contract_type: Mapped[str | None] = mapped_column(String)
    """'Na određeno' / 'Na neodređeno' …"""
    education: Mapped[str | None] = mapped_column(String)
    """Required education level, e.g. 'Završena osnovna škola'."""
    experience: Mapped[str | None] = mapped_column(String)
    """Required experience, e.g. 'Nije važno', '1 godina'."""
    openings: Mapped[int | None] = mapped_column(Integer)
    """How many people the employer is hiring."""
