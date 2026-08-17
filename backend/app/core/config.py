from pydantic_settings import BaseSettings, SettingsConfigDict
import logging


class Settings(BaseSettings):
    """Application settings loaded from backend/.env."""

    # Database
    DATABASE_URL: str

    # JWT
    JWT_SECRET: str
    JWT_ALGORITHM: str = "HS256"
    ACCESS_TOKEN_EXPIRE_MINUTES: int = 480

    # CORS
    FRONTEND_ORIGIN: str = "http://localhost:3000"

    # AI / LLM Model
    GEMINI_API_KEY: str | None = None
    GEMINI_MODEL: str = "google/gemma-4-31B-it"

    model_config = SettingsConfigDict(
        env_file=".env",
        env_file_encoding="utf-8",
        case_sensitive=True,
        extra="ignore",
    )


settings = Settings()

def _mask_db_url(url: str) -> str:
    try:
        parts = url.split('@')
        if len(parts) == 2:
            auth_part = parts[0]
            host_part = parts[1]
            scheme_user = auth_part.split(':')
            if len(scheme_user) >= 3:
                return f"{scheme_user[0]}:{scheme_user[1]}:***@{host_part}"
        return "***masked***"
    except Exception:
        return "***masked***"

logging.info(f"Loaded DATABASE_URL successfully: {_mask_db_url(settings.DATABASE_URL)}")
