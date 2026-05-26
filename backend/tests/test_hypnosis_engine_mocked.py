"""Unit tests for the live HypnosisEngine that wraps Claude.

We don't hit the network. Instead we patch the AsyncAnthropic client with a
test double that simulates the streaming API and verifies:
- the cached system prompt is sent with cache_control: ephemeral
- the per-turn JSON header is appended to history as a user message
- the streamed text is yielded chunk-by-chunk
- the CRISIS_TOKEN short-circuits the stream
"""

from __future__ import annotations

from typing import Any
from unittest.mock import patch

import pytest

from app.services.types import CRISIS_TOKEN


class FakeTextStream:
    def __init__(self, chunks: list[str]):
        self._chunks = chunks

    def __aiter__(self):
        return self._gen()

    async def _gen(self):
        for c in self._chunks:
            yield c


class FakeStreamContext:
    def __init__(self, chunks: list[str], captured: dict[str, Any]):
        self._chunks = chunks
        self._captured = captured

    async def __aenter__(self):
        return self

    async def __aexit__(self, exc_type, exc, tb):
        return False

    @property
    def text_stream(self):
        return FakeTextStream(self._chunks)


class FakeMessages:
    def __init__(self, chunks: list[str], captured: dict[str, Any]):
        self._chunks = chunks
        self._captured = captured

    def stream(self, **kwargs):
        self._captured.update(kwargs)
        return FakeStreamContext(self._chunks, self._captured)


class FakeAnthropic:
    def __init__(self, chunks: list[str], captured: dict[str, Any]):
        self.messages = FakeMessages(chunks, captured)


@pytest.fixture
def patched_engine(monkeypatch):
    # Provide a dummy key so the engine builds without raising
    monkeypatch.setenv("ANTHROPIC_API_KEY", "test-key")
    # Clear settings cache so the env var takes effect
    from app.config import get_settings

    get_settings.cache_clear()

    captured: dict[str, Any] = {}
    chunks = ["you ", "are ", "noticing ", "the breath."]
    fake = FakeAnthropic(chunks, captured)

    with patch("app.services.hypnosis_engine.AsyncAnthropic", return_value=fake):
        from app.services.hypnosis_engine import HypnosisEngine

        engine = HypnosisEngine()
        yield engine, captured

    get_settings.cache_clear()


@pytest.mark.asyncio
async def test_engine_streams_chunks(patched_engine):
    engine, captured = patched_engine
    out = ""
    async for piece in engine.stream_turn(
        phase="induction",
        goal="layoff_resilience",
        bpm_trend="falling",
        elapsed_min=1.0,
        last_user_utterance="",
    ):
        out += piece
    assert out == "you are noticing the breath."

    # System prompt with ephemeral cache_control is passed
    assert "system" in captured
    sys_payload = captured["system"]
    assert isinstance(sys_payload, list) and len(sys_payload) == 1
    assert sys_payload[0]["type"] == "text"
    assert sys_payload[0]["cache_control"] == {"type": "ephemeral"}
    assert "AI-Mind" in sys_payload[0]["text"]
    # And it actually contains the v2 safety section header
    assert "# 0. SAFETY" in sys_payload[0]["text"]

    # The per-turn JSON header was appended as a user message. Note: the
    # engine appends BOTH the user header and the assistant reply, so the
    # user-role message is the second-to-last entry after one turn.
    messages = captured["messages"]
    assert isinstance(messages, list) and len(messages) >= 1
    user_msg = next(m for m in messages if m["role"] == "user")
    assert "phase" in user_msg["content"]
    assert "induction" in user_msg["content"]


@pytest.mark.asyncio
async def test_engine_short_circuits_on_crisis_token(monkeypatch):
    monkeypatch.setenv("ANTHROPIC_API_KEY", "test-key")
    from app.config import get_settings

    get_settings.cache_clear()

    captured: dict[str, Any] = {}
    chunks = [CRISIS_TOKEN, "should not be yielded"]
    fake = FakeAnthropic(chunks, captured)

    with patch("app.services.hypnosis_engine.AsyncAnthropic", return_value=fake):
        from app.services.hypnosis_engine import HypnosisEngine

        engine = HypnosisEngine()
        emissions: list[str] = []
        async for piece in engine.stream_turn(
            phase="induction",
            goal="layoff_resilience",
            bpm_trend="unknown",
            elapsed_min=0.1,
            last_user_utterance="I want to die",
        ):
            emissions.append(piece)
        assert emissions == [CRISIS_TOKEN]

    get_settings.cache_clear()


@pytest.mark.asyncio
async def test_engine_grows_history_across_turns(patched_engine):
    engine, captured = patched_engine

    async def consume():
        async for _ in engine.stream_turn(
            phase="induction",
            goal="sleep",
            bpm_trend="stable",
            elapsed_min=0.5,
            last_user_utterance="",
        ):
            pass

    await consume()
    first_len = len(captured["messages"])
    await consume()
    second_len = len(captured["messages"])
    # Each turn appends 2 messages (user header + assistant text)
    assert second_len > first_len
