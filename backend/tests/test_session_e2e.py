"""End-to-end session lifecycle tests over WebSocket.

These exercise the full router → state machine → engine pipeline using the
offline fallback stack (ScriptedHypnosisEngine + NullTTS + InMemoryKB), with
synthesised BPM input pushed through the WS to validate phase advancement.
"""

from __future__ import annotations

import json
import time

from fastapi.testclient import TestClient

from app.main import app
from app.services import factory


def _drain_until(ws, predicate, max_msgs: int = 400) -> tuple[bool, list[dict]]:
    """Read WS messages until predicate returns true or we hit the cap."""
    msgs: list[dict] = []
    for _ in range(max_msgs):
        try:
            raw = ws.receive_text()
        except Exception:
            return False, msgs
        msg = json.loads(raw)
        msgs.append(msg)
        if predicate(msg):
            return True, msgs
    return False, msgs


def test_session_emits_ready_then_speaks_at_least_one_full_turn():
    client = TestClient(app)
    sid = client.post(
        "/api/session/start",
        json={
            "user_id": "e2e-user",
            "goal": "layoff_resilience",
            "duration_minutes": 1,
            "language": "it",
        },
    ).json()["session_id"]

    with client.websocket_connect(f"/api/session/{sid}/stream") as ws:
        ok, msgs = _drain_until(ws, lambda m: m["type"] == "turn_complete")
        assert ok, f"never saw turn_complete; got {[m['type'] for m in msgs[:30]]}"
        types = [m["type"] for m in msgs]
        assert types[0] == "ready"
        assert "text" in types
        turn = next(m for m in msgs if m["type"] == "turn_complete")
        # Scripted induction text is in Italian and includes pause markers
        assert len(turn["text"]) > 60
        assert "<pause:" in turn["text"]
        ws.send_text(json.dumps({"type": "end"}))


def test_bpm_samples_are_recorded_in_kb():
    factory._kb_singleton = None  # reset in-memory KB
    client = TestClient(app)
    sid = client.post(
        "/api/session/start",
        json={
            "user_id": "bpm-user",
            "goal": "sleep",
            "duration_minutes": 1,
            "language": "it",
        },
    ).json()["session_id"]

    ts = int(time.time() * 1000)
    with client.websocket_connect(f"/api/session/{sid}/stream") as ws:
        ws.receive_text()  # consume "ready"
        for offset in range(10):
            ws.send_text(
                json.dumps({"type": "bpm", "bpm": 78 - offset, "ts_ms": ts + offset * 1000})
            )
        # Give the server one event loop tick to persist
        _drain_until(ws, lambda m: m["type"] == "turn_complete", max_msgs=60)
        ws.send_text(json.dumps({"type": "end"}))

    kb = factory.make_knowledge_base()
    samples = [s for s in getattr(kb, "biometrics", []) if s["session_id"] == sid]
    assert len(samples) >= 10
    assert all(s["user_id"] == "bpm-user" for s in samples)
    assert samples[0]["bpm"] == 78
    assert samples[-1]["bpm"] == 69


def test_user_utterance_is_persisted_to_kb():
    factory._kb_singleton = None
    client = TestClient(app)
    sid = client.post(
        "/api/session/start",
        json={
            "user_id": "utt-user",
            "goal": "layoff_resilience",
            "duration_minutes": 1,
            "language": "it",
        },
    ).json()["session_id"]

    with client.websocket_connect(f"/api/session/{sid}/stream") as ws:
        ws.receive_text()
        ws.send_text(
            json.dumps(
                {
                    "type": "user_utterance",
                    "text": "I want to see my future self in eighteen months",
                }
            )
        )
        _drain_until(ws, lambda m: m["type"] == "turn_complete", max_msgs=60)
        ws.send_text(json.dumps({"type": "end"}))

    kb = factory.make_knowledge_base()
    user_utts = [
        u
        for u in getattr(kb, "utterances", [])
        if u["session_id"] == sid and u["role"] == "user"
    ]
    assert len(user_utts) == 1
    assert "future self" in user_utts[0]["text"]


def test_session_returns_404_on_unknown_id():
    client = TestClient(app)
    # /end is the simplest 404 surface; WS would close with 4404 instead
    r = client.post("/api/session/does-not-exist/end")
    assert r.status_code == 404
