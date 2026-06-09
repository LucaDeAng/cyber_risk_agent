"""Service factories with offline fallbacks.

The session router never imports concrete provider classes — it always asks
the factory. This keeps fallback logic in one place.
"""

from __future__ import annotations

from collections.abc import AsyncIterator
from typing import Protocol

import structlog

from app.config import get_settings
from app.services.scripted_hypnosis import ScriptedHypnosisEngine
from app.services.types import BpmTrend, Goal, Phase

log = structlog.get_logger()


class HypnosisEngineProtocol(Protocol):
    def reset(self) -> None: ...
    def stream_turn(
        self,
        *,
        phase: Phase,
        goal: Goal,
        bpm_trend: BpmTrend,
        elapsed_min: float,
        last_user_utterance: str,
    ) -> AsyncIterator[str]: ...


class TTSStreamerProtocol(Protocol):
    def stream(self, text_chunks: AsyncIterator[str]) -> AsyncIterator[bytes]: ...


class KnowledgeBaseProtocol(Protocol):
    async def record_utterance(
        self, *, session_id: str, user_id: str, role: str, text: str, phase: str
    ) -> None: ...
    def record_biometric_sample(
        self,
        *,
        session_id: str,
        user_id: str,
        bpm: int,
        hrv_proxy: float | None,
        timestamp_ms: int,
    ) -> None: ...
    def record_phase_transition(
        self,
        *,
        session_id: str,
        from_phase: str | None,
        to_phase: str,
        bpm_at_transition: int | None,
    ) -> None: ...


class NullTTSStreamer:
    """No-op TTS. The client falls back to expo-speech for offline narration."""

    async def stream(self, text_chunks: AsyncIterator[str]) -> AsyncIterator[bytes]:
        # Drain the text stream so the upstream engine progresses; emit nothing.
        async for _ in text_chunks:
            pass
        if False:  # make this a generator
            yield b""


class InMemoryKnowledgeBase:
    """Drop-in KB used when Supabase isn't configured. Lives for one process."""

    def __init__(self) -> None:
        self.utterances: list[dict] = []
        self.biometrics: list[dict] = []
        self.phase_transitions: list[dict] = []

    async def record_utterance(
        self, *, session_id: str, user_id: str, role: str, text: str, phase: str
    ) -> None:
        self.utterances.append(
            {
                "session_id": session_id,
                "user_id": user_id,
                "role": role,
                "text": text,
                "phase": phase,
            }
        )

    def record_biometric_sample(
        self,
        *,
        session_id: str,
        user_id: str,
        bpm: int,
        hrv_proxy: float | None,
        timestamp_ms: int,
    ) -> None:
        self.biometrics.append(
            {
                "session_id": session_id,
                "user_id": user_id,
                "bpm": bpm,
                "hrv_proxy": hrv_proxy,
                "ts_ms": timestamp_ms,
            }
        )

    def record_phase_transition(
        self,
        *,
        session_id: str,
        from_phase: str | None,
        to_phase: str,
        bpm_at_transition: int | None,
    ) -> None:
        self.phase_transitions.append(
            {
                "session_id": session_id,
                "from_phase": from_phase,
                "to_phase": to_phase,
                "bpm_at_transition": bpm_at_transition,
            }
        )


_kb_singleton: KnowledgeBaseProtocol | None = None


def make_hypnosis_engine() -> HypnosisEngineProtocol:
    settings = get_settings()
    if settings.has_anthropic:
        from app.services.hypnosis_engine import HypnosisEngine

        log.info("hypnosis_engine.live", model=settings.anthropic_model)
        return HypnosisEngine()
    log.warning("hypnosis_engine.fallback", reason="no ANTHROPIC_API_KEY")
    return ScriptedHypnosisEngine()


def make_tts_streamer() -> TTSStreamerProtocol:
    settings = get_settings()
    if settings.has_elevenlabs:
        from app.services.tts import TTSStreamer

        log.info("tts.live", voice=settings.elevenlabs_voice_id)
        return TTSStreamer()
    log.warning("tts.fallback", reason="no ELEVENLABS_API_KEY")
    return NullTTSStreamer()


def make_knowledge_base() -> KnowledgeBaseProtocol:
    global _kb_singleton
    if _kb_singleton is not None:
        return _kb_singleton
    settings = get_settings()
    if settings.has_supabase:
        from app.services.knowledge_base import KnowledgeBaseWriter

        log.info("knowledge_base.live")
        _kb_singleton = KnowledgeBaseWriter()
    else:
        log.warning("knowledge_base.fallback", reason="no SUPABASE_URL")
        _kb_singleton = InMemoryKnowledgeBase()
    return _kb_singleton


class InMemorySessionStore:
    """Used when Supabase is offline. Maps session_id -> session dict."""

    def __init__(self) -> None:
        self._sessions: dict[str, dict] = {}

    def insert(self, row: dict) -> None:
        self._sessions[row["id"]] = row

    def get(self, session_id: str) -> dict | None:
        return self._sessions.get(session_id)

    def update_status(self, session_id: str, status: str) -> None:
        if session_id in self._sessions:
            self._sessions[session_id]["status"] = status


_session_store: InMemorySessionStore | None = None


def get_session_store() -> InMemorySessionStore:
    global _session_store
    if _session_store is None:
        _session_store = InMemorySessionStore()
    return _session_store
