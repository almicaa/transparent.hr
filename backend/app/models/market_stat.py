from datetime import datetime

from sqlalchemy import DateTime, Float, Integer, String
from sqlalchemy.orm import Mapped, mapped_column

from app.db.session import Base, utcnow


class MarketStat(Base):
    """Page-count-derived estimate of what share of a portal's ads show salary.

    We deliberately only scrape salary-filtered feeds, so a DB-based
    percentage would be meaningless. Instead the scraper reads the
    '(page/total_pages)' indicator from the filtered vs. unfiltered listing
    and stores the resulting estimate here, one row per source.
    """

    __tablename__ = "market_stats"

    source: Mapped[str] = mapped_column(String, primary_key=True)
    total_pages: Mapped[int] = mapped_column(Integer)
    salary_pages: Mapped[int] = mapped_column(Integer)
    estimated_pct: Mapped[float] = mapped_column(Float)
    computed_at: Mapped[datetime] = mapped_column(DateTime, default=utcnow)
