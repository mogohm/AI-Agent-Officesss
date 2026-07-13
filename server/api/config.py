"""Application configuration, loaded from environment variables."""
from __future__ import annotations

from functools import lru_cache

from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    model_config = SettingsConfigDict(env_file=".env", extra="ignore")

    app_name: str = "AI Agent Office API"
    app_version: str = "0.1.0"

    # Database. Defaults to a local SQLite file so the project runs with zero
    # setup. In production set DATABASE_URL to your PostgreSQL instance, e.g.
    #   postgresql+psycopg://user:pass@localhost:5432/ai_office
    database_url: str = "sqlite:///./ai_office.db"

    # Comma-separated list of allowed CORS origins for the web app.
    cors_origins: str = "http://localhost:3000,http://127.0.0.1:3000"

    # Root directory on the VPS where project workspaces live.
    workspaces_root: str = "./workspaces/companies"

    # Auto-create tables and seed demo data on startup when the DB is empty.
    auto_seed: bool = True

    # --- Future integrations (kept blank while using mock engine) ----------
    openai_api_key: str = ""
    anthropic_api_key: str = ""
    gemini_api_key: str = ""
    redis_url: str = ""

    @property
    def cors_origin_list(self) -> list[str]:
        return [o.strip() for o in self.cors_origins.split(",") if o.strip()]


@lru_cache
def get_settings() -> Settings:
    return Settings()


settings = get_settings()
