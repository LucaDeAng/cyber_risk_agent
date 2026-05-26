"""Hypnosis Engine — Claude orchestrator with prompt caching.

The engine receives a phase + biometric context and streams the next spoken
utterance. The system prompt is cached (Anthropic ephemeral cache) to keep
TTFT under 350ms and cut cost by ~90% across a session.
"""

from __future__ import annotations

import json
from collections.abc import AsyncIterator
from pathlib import Path

from anthropic import AsyncAnthropic

from app.config import get_settings
from app.services.types import CRISIS_TOKEN, BpmTrend, Goal, Phase

__all__ = ["CRISIS_TOKEN", "HypnosisEngine"]

_PROMPT_PATH = Path(__file__).resolve().parent.parent / "prompts" / "system_hypnotic.md"


def _load_system_prompt() -> str:
    return _PROMPT_PATH.read_text(encoding="utf-8")


class HypnosisEngine:
    """Wraps Claude with cached system prompt and per-turn phase context."""

    def __init__(self) -> None:
        settings = get_settings()
        self._client = AsyncAnthropic(api_key=settings.anthropic_api_key)
        self._model = settings.anthropic_model
        self._system_prompt = _load_system_prompt()
        self._history: list[dict] = []

    def reset(self) -> None:
        self._history = []

    async def stream_turn(
        self,
        *,
        phase: Phase,
        goal: Goal,
        bpm_trend: BpmTrend,
        elapsed_min: float,
        last_user_utterance: str,
    ) -> AsyncIterator[str]:
        """Yield text chunks for the next spoken utterance.

        Crisis token is detected before the first user-facing chunk is yielded;
        callers should pipe the chunks straight into the TTS layer.
        """
        phase_header = json.dumps(
            {
                "phase": phase,
                "goal": goal,
                "bpm_trend": bpm_trend,
                "elapsed_min": round(elapsed_min, 2),
                "last_user_utterance": last_user_utterance,
            },
            ensure_ascii=False,
        )

        self._history.append({"role": "user", "content": phase_header})

        assistant_text = ""
        async with self._client.messages.stream(
            model=self._model,
            max_tokens=600,
            system=[
                {
                    "type": "text",
                    "text": self._system_prompt,
                    "cache_control": {"type": "ephemeral"},
                }
            ],
            messages=self._history,
        ) as stream:
            async for chunk in stream.text_stream:
                assistant_text += chunk
                if CRISIS_TOKEN in assistant_text:
                    yield CRISIS_TOKEN
                    return
                yield chunk

        self._history.append({"role": "assistant", "content": assistant_text})

    def estimate_phase_duration_sec(self, phase: Phase) -> float:
        return {
            "induction": 240.0,
            "deepening": 360.0,
            "suggestion": 900.0,
            "integration": 240.0,
            "awakening": 90.0,
        }[phase]
