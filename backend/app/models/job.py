from datetime import datetime

from sqlalchemy import Boolean, DateTime, Float, Integer, String
from sqlalchemy.orm import Mapped, mapped_column

from app.db.session import Base


class Job(Base):
    __tablename__ = "jobs"

    id: Mapped[int] = mapped_column(Integer, primary_key=True, autoincrement=True)
    external_id: Mapped[str | None] = mapped_column(String, unique=True)
    title: Mapped[str] = mapped_column(String, nullable=False)
    company: Mapped[str | None] = mapped_column(String)
    location: Mapped[str | None] = mapped_column(String)
    job_type: Mapped[str | None] = mapped_column(String)
    category: Mapped[str | None] = mapped_column(String)
    salary_min: Mapped[float | None] = mapped_column(Float)
    salary_max: Mapped[float | None] = mapped_column(Float)
    salary_text: Mapped[str | None] = mapped_column(String)
    salary_shown: Mapped[int] = mapped_column(Integer, default=0)
    salary_currency: Mapped[str | None] = mapped_column(String, default="EUR")
    salary_basis: Mapped[str | None] = mapped_column(String)
    """'neto' | 'bruto' | None (unstated)"""
    salary_type: Mapped[str | None] = mapped_column(String)
    """'range' | 'fixed' | 'from' | 'above' | None"""
    description: Mapped[str | None] = mapped_column(String)
    url: Mapped[str | None] = mapped_column(String)
    source: Mapped[str | None] = mapped_column(String)
    posted_at: Mapped[str | None] = mapped_column(String)
    scraped_at: Mapped[datetime] = mapped_column(DateTime, default=datetime.utcnow)
    expires_at: Mapped[datetime | None] = mapped_column(DateTime)
    """Parsed from the portal's own 'N dana do isteka' countdown, when available."""
    is_active: Mapped[bool] = mapped_column(Boolean, default=True, server_default="true")
    """Set False once expires_at has passed — hidden from the API by default."""
