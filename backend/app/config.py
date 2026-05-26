"""Centralised configuration via pydantic-settings.

All external-provider keys are OPTIONAL. When a key is missing, the app falls
back to a deterministic offline implementation:
- no ANTHROPIC_API_KEY    -> ScriptedHypnosisEngine (hardcoded per-phase content)
- no ELEVENLABS_API_KEY   -> NullTTSStreamer (client falls back to expo-speech)
- no DEEPGRAM_API_KEY     -> STT disabled (text-only user_utterance messages)
- no SUPABASE_URL         -> InMemoryKnowledgeBase + in-process session store
"""

from functools import lru_cache

from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    model_config = SettingsConfigDict(env_file=".env", env_file_encoding="utf-8", extra="ignore")

    anthropic_api_key: str = ""
    anthropic_model: str = "claude-opus-4-7"
    anthropic_model_fast: str = "claude-haiku-4-5-20251001"

    elevenlabs_api_key: str = ""
    elevenlabs_voice_id: str = "EXAVITQu4vr4xnSDxMaL"
    elevenlabs_model: str = "eleven_multilingual_v2"

    deepgram_api_key: str = ""

    supabase_url: str = ""
    supabase_service_role_key: str = ""
    supabase_anon_key: str = ""

    environment: str = "development"
    log_level: str = "INFO"

    session_max_minutes: int = 30
    rate_limit_session_starts_per_hour: int = 6

    @property
    def has_anthropic(self) -> bool:
        return bool(self.anthropic_api_key)

    @property
    def has_elevenlabs(self) -> bool:
        return bool(self.elevenlabs_api_key)

    @property
    def has_deepgram(self) -> bool:
        return bool(self.deepgram_api_key)

    @property
    def has_supabase(self) -> bool:
        return bool(self.supabase_url and self.supabase_service_role_key)


@lru_cache
def get_settings() -> Settings:
    return Settings()
