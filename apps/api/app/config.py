from __future__ import annotations

from pydantic import field_validator
from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    """
    Application settings loaded from environment variables.
    All values with defaults are safe to use without configuration.
    Values without defaults MUST be set in the environment or .env file.
    """

    model_config = SettingsConfigDict(
        env_file=".env",
        env_file_encoding="utf-8",
        case_sensitive=False,
        extra="ignore",  # Ignore env vars not declared here
    )

    # ---- Application ----
    APP_NAME: str = "NovaCP API"
    APP_VERSION: str = "0.1.0"
    DEBUG: bool = False

    # ---- Database ----
    DATABASE_URL: str
    # Connection pool settings — tuned for 10K users on a single instance
    DB_POOL_SIZE: int = 10
    DB_MAX_OVERFLOW: int = 20
    DB_POOL_TIMEOUT: int = 30
    DB_POOL_RECYCLE: int = 3600  # Recycle connections every hour

    # ---- Redis ----
    REDIS_URL: str
    REDIS_MAX_CONNECTIONS: int = 20
    # Default TTL for cached contest lists (30 minutes)
    REDIS_CONTEST_CACHE_TTL: int = 1800

    # ---- Security ----
    # Shared secret between Next.js (BFF) and FastAPI
    # Used to verify requests originate from our own frontend
    INTERNAL_API_KEY: str
    # Algorithm for any internal JWT operations
    ALGORITHM: str = "HS256"

    # ---- CORS ----
    # Comma-separated list of allowed origins
    # Example: "http://localhost:3000,https://novacp.app"
    ALLOWED_ORIGINS: str = "http://localhost:3000"

    @field_validator("ALLOWED_ORIGINS", mode="before")
    @classmethod
    def parse_allowed_origins(cls, v: str) -> str:
        # Allow the validator to receive the raw string; we parse it in the property
        return v

    @property
    def allowed_origins_list(self) -> list[str]:
        """Parse the comma-separated ALLOWED_ORIGINS into a list."""
        return [origin.strip() for origin in self.ALLOWED_ORIGINS.split(",") if origin.strip()]

    CF_API_KEY: str | None = None
    CF_API_SECRET: str | None = None

    # ---- AI Provider ----
    GEMINI_API_KEY: str | None = None
    GEMINI_MODEL: str = "gemini-3.5-flash"
    REDIS_HINT_CACHE_TTL: int = 86400  # 24 hours


# Singleton settings instance — import this everywhere
settings = Settings()  # type: ignore[call-arg]
