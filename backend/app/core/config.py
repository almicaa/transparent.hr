from pathlib import Path

from pydantic_settings import BaseSettings

BASE_DIR = Path(__file__).resolve().parent.parent.parent


class Settings(BaseSettings):
    app_name: str = "Transparent.hr API"
    database_url: str = f"sqlite:///{BASE_DIR / 'jobs.db'}"
    cors_origins: str = "http://localhost:3000"
    """Comma-separated list of allowed origins."""

    @property
    def cors_origins_list(self) -> list[str]:
        return [origin.strip() for origin in self.cors_origins.split(",") if origin.strip()]

    class Config:
        env_file = ".env"


settings = Settings()
