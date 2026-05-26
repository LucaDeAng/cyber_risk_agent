"""Session orchestration endpoints.

The session lifecycle:
1. POST /api/session/start → creates a row in `sessions`, returns session_id + WS URL.
2. WS /api/session/{id}/stream → bi-directional audio + control events.
3. POST /api/session/{id}/end → finalises, triggers post-session insight job.
"""

from __future__ import annotations

import asyncio
import json
import uuid
from typing import Literal

from fastapi import APIRouter, HTTPException, WebSocket, WebSocketDisconnect
from pydantic import BaseModel
from supabase import create_client

from app.config import get_settings
from app.services.adaptive_narrative import SessionState
from app.services.hypnosis_engine import CRISIS_TOKEN, HypnosisEngine
from app.services.knowledge_base import KnowledgeBaseWriter
from app.services.tts import TTSStreamer
from app.services.types import Goal

router = APIRouter()


class StartSessionRequest(BaseModel):
    user_id: str
    goal: Goal
    duration_minutes: int = 30
    language: Literal["it", "en", "es", "de", "fr"] = "it"


class StartSessionResponse(BaseModel):
    session_id: str
    ws_url: str


@router.post("/start", response_model=StartSessionResponse)
async def start_session(req: StartSessionRequest) -> StartSessionResponse:
    settings = get_settings()
    db = create_client(settings.supabase_url, settings.supabase_service_role_key)

    session_id = str(uuid.uuid4())
    db.table("sessions").insert(
        {
            "id": session_id,
            "user_id": req.user_id,
            "goal": req.goal,
            "language": req.language,
            "duration_target_min": req.duration_minutes,
            "status": "active",
        }
    ).execute()

    return StartSessionResponse(
        session_id=session_id,
        ws_url=f"/api/session/{session_id}/stream",
    )


@router.websocket("/{session_id}/stream")
async def session_stream(websocket: WebSocket, session_id: str) -> None:
    """Bi-directional session loop.

    Client → server messages (JSON):
      { "type": "bpm", "bpm": 78, "ts_ms": 1716740000000 }
      { "type": "user_utterance", "text": "I want to see my future self" }
      { "type": "skip_phase" }
      { "type": "end" }

    Server → client messages:
      { "type": "phase", "phase": "deepening", "elapsed_min": 4.2 }
      { "type": "audio_chunk", "b64": "..." }
      { "type": "text", "text": "you are noticing..." }  # for captioning
      { "type": "crisis_handoff", "resources": [...] }
      { "type": "session_complete" }
    """
    await websocket.accept()

    settings = get_settings()
    db = create_client(settings.supabase_url, settings.supabase_service_role_key)
    row = db.table("sessions").select("*").eq("id", session_id).single().execute()
    if not row.data:
        await websocket.close(code=4404, reason="session not found")
        return

    user_id: str = row.data["user_id"]
    goal: Goal = row.data["goal"]

    engine = HypnosisEngine()
    tts = TTSStreamer()
    kb = KnowledgeBaseWriter()
    state = SessionState(goal=goal)

    kb.record_phase_transition(
        session_id=session_id,
        from_phase=None,
        to_phase=state.phase,
        bpm_at_transition=None,
    )

    stop_event = asyncio.Event()

    async def speak_one_turn() -> None:
        async def claude_chunks():
            async for piece in engine.stream_turn(
                phase=state.phase,
                goal=state.goal,
                bpm_trend=state.biometrics.trend(),
                elapsed_min=state.elapsed_min(),
                last_user_utterance=state.last_user_utterance,
            ):
                if piece == CRISIS_TOKEN:
                    await websocket.send_text(
                        json.dumps(
                            {
                                "type": "crisis_handoff",
                                "resources": [
                                    {"label": "Telefono Amico (IT)", "phone": "02 2327 2327"},
                                    {"label": "Samaritans (UK)", "phone": "116 123"},
                                    {"label": "988 Suicide & Crisis (US)", "phone": "988"},
                                ],
                            }
                        )
                    )
                    stop_event.set()
                    return
                await websocket.send_text(json.dumps({"type": "text", "text": piece}))
                yield piece
            state.last_user_utterance = ""

        async for audio_chunk in tts.stream(claude_chunks()):
            import base64

            await websocket.send_text(
                json.dumps(
                    {"type": "audio_chunk", "b64": base64.b64encode(audio_chunk).decode("ascii")}
                )
            )

    async def receiver() -> None:
        while not stop_event.is_set():
            try:
                raw = await websocket.receive_text()
            except WebSocketDisconnect:
                stop_event.set()
                return
            msg = json.loads(raw)
            mtype = msg.get("type")
            if mtype == "bpm":
                state.biometrics.push(int(msg["bpm"]))
                kb.record_biometric_sample(
                    session_id=session_id,
                    user_id=user_id,
                    bpm=int(msg["bpm"]),
                    hrv_proxy=msg.get("hrv_proxy"),
                    timestamp_ms=int(msg["ts_ms"]),
                )
            elif mtype == "user_utterance":
                state.last_user_utterance = msg.get("text", "")
                await kb.record_utterance(
                    session_id=session_id,
                    user_id=user_id,
                    role="user",
                    text=state.last_user_utterance,
                    phase=state.phase,
                )
            elif mtype == "skip_phase":
                state.phase_started_at -= 9999.0  # forces advance on next check
            elif mtype == "end":
                stop_event.set()
                return

    async def driver() -> None:
        while not stop_event.is_set():
            await speak_one_turn()
            if state.is_finished():
                await websocket.send_text(json.dumps({"type": "session_complete"}))
                stop_event.set()
                return
            advanced = state.maybe_advance_phase()
            if advanced:
                kb.record_phase_transition(
                    session_id=session_id,
                    from_phase=None,
                    to_phase=state.phase,
                    bpm_at_transition=(
                        state.biometrics.samples[-1][1] if state.biometrics.samples else None
                    ),
                )
                await websocket.send_text(
                    json.dumps(
                        {
                            "type": "phase",
                            "phase": state.phase,
                            "elapsed_min": state.elapsed_min(),
                        }
                    )
                )
            await asyncio.sleep(2.0)

    try:
        await asyncio.gather(receiver(), driver())
    finally:
        db.table("sessions").update({"status": "completed"}).eq("id", session_id).execute()
        await websocket.close()


@router.post("/{session_id}/end")
async def end_session(session_id: str) -> dict[str, str]:
    settings = get_settings()
    db = create_client(settings.supabase_url, settings.supabase_service_role_key)
    res = db.table("sessions").update({"status": "completed"}).eq("id", session_id).execute()
    if not res.data:
        raise HTTPException(404, "session not found")
    return {"status": "ok"}
