"""Session orchestration endpoints with offline-fallback support.

Lifecycle:
1. POST /api/session/start → row in sessions (Supabase or in-memory), returns id + WS url.
2. WS  /api/session/{id}/stream → bi-directional audio + control events.
3. POST /api/session/{id}/end → finalises status.
"""

from __future__ import annotations

import asyncio
import base64
import json
import uuid
from typing import Literal

from fastapi import APIRouter, HTTPException, WebSocket, WebSocketDisconnect
from pydantic import BaseModel

from app.config import get_settings
from app.services.adaptive_narrative import SessionState
from app.services.factory import (
    get_session_store,
    make_hypnosis_engine,
    make_knowledge_base,
    make_tts_streamer,
)
from app.services.types import CRISIS_TOKEN, Goal

router = APIRouter()


class StartSessionRequest(BaseModel):
    user_id: str
    goal: Goal
    duration_minutes: int = 30
    language: Literal["it", "en", "es", "de", "fr"] = "it"


class StartSessionResponse(BaseModel):
    session_id: str
    ws_url: str
    fallback_mode: dict[str, bool]


def _session_row(row_id: str, req: StartSessionRequest) -> dict:
    return {
        "id": row_id,
        "user_id": req.user_id,
        "goal": req.goal,
        "language": req.language,
        "duration_target_min": req.duration_minutes,
        "status": "active",
    }


def _persist_session(row: dict) -> None:
    settings = get_settings()
    if settings.has_supabase:
        from supabase import create_client

        db = create_client(settings.supabase_url, settings.supabase_service_role_key)
        db.table("sessions").insert(row).execute()
    else:
        get_session_store().insert(row)


def _load_session(session_id: str) -> dict | None:
    settings = get_settings()
    if settings.has_supabase:
        from supabase import create_client

        db = create_client(settings.supabase_url, settings.supabase_service_role_key)
        res = db.table("sessions").select("*").eq("id", session_id).limit(1).execute()
        rows = res.data or []
        return rows[0] if rows else None
    return get_session_store().get(session_id)


def _update_status(session_id: str, status: str) -> None:
    settings = get_settings()
    if settings.has_supabase:
        from supabase import create_client

        db = create_client(settings.supabase_url, settings.supabase_service_role_key)
        db.table("sessions").update({"status": status}).eq("id", session_id).execute()
    else:
        get_session_store().update_status(session_id, status)


@router.post("/start", response_model=StartSessionResponse)
async def start_session(req: StartSessionRequest) -> StartSessionResponse:
    settings = get_settings()
    session_id = str(uuid.uuid4())
    _persist_session(_session_row(session_id, req))
    return StartSessionResponse(
        session_id=session_id,
        ws_url=f"/api/session/{session_id}/stream",
        fallback_mode={
            "scripted_engine": not settings.has_anthropic,
            "client_tts": not settings.has_elevenlabs,
            "in_memory_kb": not settings.has_supabase,
        },
    )


@router.websocket("/{session_id}/stream")
async def session_stream(websocket: WebSocket, session_id: str) -> None:
    await websocket.accept()

    row = _load_session(session_id)
    if row is None:
        await websocket.close(code=4404, reason="session not found")
        return

    user_id: str = row["user_id"]
    goal: Goal = row["goal"]

    settings = get_settings()
    engine = make_hypnosis_engine()
    tts = make_tts_streamer()
    kb = make_knowledge_base()
    state = SessionState(goal=goal)

    kb.record_phase_transition(
        session_id=session_id, from_phase=None, to_phase=state.phase, bpm_at_transition=None
    )

    # Announce fallback modes to the client so it knows whether to speak locally.
    await websocket.send_text(
        json.dumps(
            {
                "type": "ready",
                "client_tts_required": not settings.has_elevenlabs,
                "scripted_engine": not settings.has_anthropic,
            }
        )
    )

    stop_event = asyncio.Event()

    async def speak_one_turn() -> None:
        accumulated_text = ""

        async def claude_chunks():
            nonlocal accumulated_text
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
                accumulated_text += piece
                await websocket.send_text(json.dumps({"type": "text", "text": piece}))
                yield piece
            state.last_user_utterance = ""

        async for audio_chunk in tts.stream(claude_chunks()):
            await websocket.send_text(
                json.dumps(
                    {"type": "audio_chunk", "b64": base64.b64encode(audio_chunk).decode("ascii")}
                )
            )

        if accumulated_text.strip():
            await kb.record_utterance(
                session_id=session_id,
                user_id=user_id,
                role="assistant",
                text=accumulated_text.strip(),
                phase=state.phase,
            )
            # Signal end-of-turn so the client knows the full utterance is ready
            # to speak via expo-speech (when in client_tts mode).
            await websocket.send_text(
                json.dumps({"type": "turn_complete", "text": accumulated_text.strip()})
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
                state.phase_started_at -= 9999.0
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
        _update_status(session_id, "completed")
        if websocket.client_state.value != 3:  # not already disconnected
            await websocket.close()


@router.post("/{session_id}/end")
async def end_session(session_id: str) -> dict[str, str]:
    if _load_session(session_id) is None:
        raise HTTPException(404, "session not found")
    _update_status(session_id, "completed")
    return {"status": "ok"}
