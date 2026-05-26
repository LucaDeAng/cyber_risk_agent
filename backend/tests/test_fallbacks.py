"""Verify the offline fallback path: no API keys -> scripted engine + null TTS + in-memory KB."""

import json

import pytest
from fastapi.testclient import TestClient

from app.config import get_settings
from app.main import app
from app.services.factory import (
    InMemoryKnowledgeBase,
    NullTTSStreamer,
    make_hypnosis_engine,
    make_knowledge_base,
    make_tts_streamer,
)
from app.services.scripted_hypnosis import ScriptedHypnosisEngine


def test_no_keys_means_no_external_providers():
    settings = get_settings()
    assert not settings.has_anthropic
    assert not settings.has_elevenlabs
    assert not settings.has_supabase


def test_factory_returns_offline_implementations():
    assert isinstance(make_hypnosis_engine(), ScriptedHypnosisEngine)
    assert isinstance(make_tts_streamer(), NullTTSStreamer)
    assert isinstance(make_knowledge_base(), InMemoryKnowledgeBase)


@pytest.mark.asyncio
async def test_scripted_engine_yields_content():
    eng = ScriptedHypnosisEngine()
    text = ""
    async for piece in eng.stream_turn(
        phase="induction",
        goal="layoff_resilience",
        bpm_trend="falling",
        elapsed_min=0.1,
        last_user_utterance="",
    ):
        text += piece
    assert "comoda" in text or "respiro" in text
    assert "<pause:" in text


def test_start_session_offline_advertises_fallback_modes():
    client = TestClient(app)
    r = client.post(
        "/api/session/start",
        json={
            "user_id": "test-user",
            "goal": "layoff_resilience",
            "duration_minutes": 5,
            "language": "it",
        },
    )
    assert r.status_code == 200
    body = r.json()
    assert body["fallback_mode"]["scripted_engine"] is True
    assert body["fallback_mode"]["client_tts"] is True
    assert body["fallback_mode"]["in_memory_kb"] is True


def test_ws_session_emits_ready_and_first_turn():
    client = TestClient(app)
    sid = client.post(
        "/api/session/start",
        json={
            "user_id": "test-user",
            "goal": "layoff_resilience",
            "duration_minutes": 1,
            "language": "it",
        },
    ).json()["session_id"]

    with client.websocket_connect(f"/api/session/{sid}/stream") as ws:
        first = json.loads(ws.receive_text())
        assert first["type"] == "ready"
        assert first["client_tts_required"] is True

        # Wait for a turn_complete (scripted engine yields ~20 word tokens then completes)
        got_turn_complete = False
        for _ in range(80):
            msg = json.loads(ws.receive_text())
            if msg["type"] == "turn_complete":
                assert "text" in msg and len(msg["text"]) > 20
                got_turn_complete = True
                break
        assert got_turn_complete

        ws.send_text(json.dumps({"type": "end"}))
