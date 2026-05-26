"""Crisis handoff is a safety-critical path.

The scripted engine never emits the crisis token, so we monkeypatch the
factory to return a deterministic crisis-emitter. This validates that the
router stops the session and surfaces resources to the client.
"""

from __future__ import annotations

import json
from collections.abc import AsyncIterator

import pytest
from fastapi.testclient import TestClient

from app.main import app
from app.services import factory
from app.services.types import CRISIS_TOKEN, BpmTrend, Goal, Phase


class CrisisEmittingEngine:
    """Test double: emits a normal opening sentence, then the crisis token."""

    def reset(self) -> None: ...

    async def stream_turn(
        self,
        *,
        phase: Phase,  # noqa: ARG002
        goal: Goal,  # noqa: ARG002
        bpm_trend: BpmTrend,  # noqa: ARG002
        elapsed_min: float,  # noqa: ARG002
        last_user_utterance: str,
    ) -> AsyncIterator[str]:
        if "want to die" in last_user_utterance.lower():
            yield CRISIS_TOKEN
            return
        for word in "you are noticing the breath ".split(" "):
            yield word + " "


@pytest.fixture
def crisis_engine(monkeypatch):
    # Router imported make_hypnosis_engine into its own namespace, patch there.
    monkeypatch.setattr(
        "app.routers.session.make_hypnosis_engine", lambda: CrisisEmittingEngine()
    )
    factory._kb_singleton = None
    yield


def test_crisis_token_triggers_handoff_event_and_closes_session(crisis_engine):
    client = TestClient(app)
    sid = client.post(
        "/api/session/start",
        json={
            "user_id": "crisis-user",
            "goal": "layoff_resilience",
            "duration_minutes": 1,
            "language": "it",
        },
    ).json()["session_id"]

    with client.websocket_connect(f"/api/session/{sid}/stream") as ws:
        # consume ready + opening turn_complete
        for _ in range(80):
            msg = json.loads(ws.receive_text())
            if msg["type"] == "turn_complete":
                break

        ws.send_text(
            json.dumps({"type": "user_utterance", "text": "I want to die tonight"})
        )

        got_crisis = False
        for _ in range(120):
            try:
                msg = json.loads(ws.receive_text())
            except Exception:
                break
            if msg["type"] == "crisis_handoff":
                got_crisis = True
                assert isinstance(msg["resources"], list) and len(msg["resources"]) >= 2
                # Phone numbers should look like phone numbers (not URLs etc.)
                for r in msg["resources"]:
                    assert "phone" in r and "label" in r
                break
        assert got_crisis, "no crisis_handoff event delivered"


def test_normal_speech_does_not_trigger_crisis(crisis_engine):
    client = TestClient(app)
    sid = client.post(
        "/api/session/start",
        json={
            "user_id": "ok-user",
            "goal": "focus_recovery",
            "duration_minutes": 1,
            "language": "it",
        },
    ).json()["session_id"]
    with client.websocket_connect(f"/api/session/{sid}/stream") as ws:
        for _ in range(80):
            msg = json.loads(ws.receive_text())
            if msg["type"] == "turn_complete":
                break
        ws.send_text(json.dumps({"type": "user_utterance", "text": "I want to rest"}))
        # We must NOT see crisis_handoff. Drain a bit and confirm.
        for _ in range(40):
            try:
                msg = json.loads(ws.receive_text())
            except Exception:
                break
            assert msg["type"] != "crisis_handoff"
            if msg["type"] == "turn_complete":
                break
        ws.send_text(json.dumps({"type": "end"}))
