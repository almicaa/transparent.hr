from pathlib import Path

from pydantic_settings import BaseSettings

BASE_DIR = Path(__file__).resolve().parent.parent.parent


class Settings(BaseSettings):
    app_name: str = "Transparent.hr API"
    database_url: str = f"sqlite:///{BASE_DIR / 'jobs.db'}"
    cors_origins: str = "http://localhost:3000"
    """Comma-separated list of allowed origins."""

    # CV matching (/api/cv-match). Without a key the endpoint answers with a friendly error.
    anthropic_api_key: str | None = None
    cv_match_model: str = "claude-opus-5-5"
    """Set to claude-haiku-5-5 for a much cheaper (and somewhat less careful) match."""
    cv_match_effort: str = "low"
    cv_match_per_hour: int = 5
    """Uploads allowed per visitor IP per hour."""
    cv_match_per_day: int = 300
    """Uploads allowed site-wide per UTC day, as a cost ceiling."""

    @property
    def cors_origins_list(self) -> list[str]:
        return [origin.strip() for origin in self.cors_origins.split(",") if origin.strip()]

    class Config:
        env_file = ".env"


settings = Settings()
