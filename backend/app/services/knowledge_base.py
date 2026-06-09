"""Knowledge Base writer — persists utterances + embeddings to Supabase.

CRITICAL: audio raw is NEVER written here. Only transcript text + embeddings.
See docs/DATA_STRATEGY.md.
"""

from __future__ import annotations

from anthropic import AsyncAnthropic
from supabase import Client, create_client

from app.config import get_settings


class KnowledgeBaseWriter:
    def __init__(self) -> None:
        settings = get_settings()
        self._db: Client = create_client(
            settings.supabase_url,
            settings.supabase_service_role_key,
        )
        self._anthropic = AsyncAnthropic(api_key=settings.anthropic_api_key)

    async def record_utterance(
        self,
        *,
        session_id: str,
        user_id: str,
        role: str,
        text: str,
        phase: str,
    ) -> None:
        embedding = await self._embed(text)
        self._db.table("utterances").insert(
            {
                "session_id": session_id,
                "user_id": user_id,
                "role": role,
                "text": text,
                "embedding": embedding,
                "phase": phase,
            }
        ).execute()

    def record_biometric_sample(
        self,
        *,
        session_id: str,
        user_id: str,
        bpm: int,
        hrv_proxy: float | None,
        timestamp_ms: int,
    ) -> None:
        self._db.table("biometric_samples").insert(
            {
                "session_id": session_id,
                "user_id": user_id,
                "bpm": bpm,
                "hrv_proxy": hrv_proxy,
                "ts_ms": timestamp_ms,
            }
        ).execute()

    def record_phase_transition(
        self,
        *,
        session_id: str,
        from_phase: str | None,
        to_phase: str,
        bpm_at_transition: int | None,
    ) -> None:
        self._db.table("session_phases").insert(
            {
                "session_id": session_id,
                "from_phase": from_phase,
                "to_phase": to_phase,
                "bpm_at_transition": bpm_at_transition,
            }
        ).execute()

    async def _embed(self, text: str) -> list[float]:
        # Placeholder: production uses a dedicated embedding endpoint
        # (text-embedding-3-large or Voyage). Anthropic does not expose embeddings,
        # so this is a stub returning zero-vector. Wire to OpenAI/Voyage in Phase 1.
        return [0.0] * 3072
