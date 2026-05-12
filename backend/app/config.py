"""Application configuration loaded from environment variables."""
from __future__ import annotations

from functools import lru_cache
from typing import List

from pydantic import Field, field_validator
from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    """Runtime configuration. Values come from environment or `.env`."""

    model_config = SettingsConfigDict(env_file=".env", env_file_encoding="utf-8", extra="ignore")

    project_name: str = "DEEP-SIGN"
    api_v1_prefix: str = "/api"

    # --- Security ---
    secret_key: str = Field(default="dev-insecure-change-me")
    algorithm: str = "HS256"
    access_token_expire_minutes: int = 60 * 24

    # --- Database ---
    database_url: str = "sqlite:///./deepsign.db"

    # --- CORS ---
    cors_origins: List[str] = Field(default_factory=lambda: ["http://localhost:5173"])

    # --- Detector ---
    min_confidence: float = 0.55

    @field_validator("cors_origins", mode="before")
    @classmethod
    def _split_origins(cls, value):
        if isinstance(value, str):
            return [v.strip() for v in value.split(",") if v.strip()]
        return value


@lru_cache
def get_settings() -> Settings:
    """Return cached settings instance."""
    return Settings()


settings = get_settings()
