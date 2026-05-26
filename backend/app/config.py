"""Centralised configuration via pydantic-settings."""

from functools import lru_cache

from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    model_config = SettingsConfigDict(env_file=".env", env_file_encoding="utf-8", extra="ignore")

    anthropic_api_key: str
    anthropic_model: str = "claude-opus-4-7"
    anthropic_model_fast: str = "claude-haiku-4-5-20251001"

    elevenlabs_api_key: str
    elevenlabs_voice_id: str = "EXAVITQu4vr4xnSDxMaL"
    elevenlabs_model: str = "eleven_multilingual_v2"

    deepgram_api_key: str

    supabase_url: str
    supabase_service_role_key: str
    supabase_anon_key: str

    environment: str = "development"
    log_level: str = "INFO"

    session_max_minutes: int = 30
    rate_limit_session_starts_per_hour: int = 6


@lru_cache
def get_settings() -> Settings:
    return Settings()  # type: ignore[call-arg]
