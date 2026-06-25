from sqlalchemy import String
from sqlalchemy.orm import Mapped, mapped_column

from app.db.session import Base


class JobSource(Base):
    """Registry of portals we scrape — centralizes display names/base URLs
    that used to be hardcoded in multiple frontend files."""

    __tablename__ = "job_sources"

    name: Mapped[str] = mapped_column(String, primary_key=True)
    display_name: Mapped[str] = mapped_column(String, nullable=False)
    base_url: Mapped[str | None] = mapped_column(String)
