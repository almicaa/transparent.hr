from datetime import datetime, timezone

from sqlalchemy import create_engine
from sqlalchemy.orm import DeclarativeBase, Session, sessionmaker

from app.core.config import settings

connect_args = {"check_same_thread": False} if settings.database_url.startswith("sqlite") else {}
engine = create_engine(settings.database_url, connect_args=connect_args)
SessionLocal = sessionmaker(bind=engine, autoflush=False, autocommit=False)


class Base(DeclarativeBase):
    pass


def utcnow() -> datetime:
    """Naive UTC now — the DateTime columns are timezone-naive and hold UTC."""
    return datetime.now(timezone.utc).replace(tzinfo=None)


def get_db() -> Session:
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()
