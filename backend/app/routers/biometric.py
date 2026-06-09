"""Biometric ingestion endpoints (REST fallback when WS is not active)."""

from __future__ import annotations

from fastapi import APIRouter
from pydantic import BaseModel
from supabase import create_client

from app.config import get_settings
from app.services.factory import make_knowledge_base

router = APIRouter()


class BiometricSample(BaseModel):
    session_id: str
    user_id: str
    bpm: int
    hrv_proxy: float | None = None
    ts_ms: int


@router.post("/sample")
async def push_sample(sample: BiometricSample) -> dict[str, str]:
    kb = make_knowledge_base()
    kb.record_biometric_sample(
        session_id=sample.session_id,
        user_id=sample.user_id,
        bpm=sample.bpm,
        hrv_proxy=sample.hrv_proxy,
        timestamp_ms=sample.ts_ms,
    )
    return {"status": "ok"}


@router.get("/session/{session_id}")
async def get_session_biometrics(session_id: str) -> list[dict]:
    kb = make_knowledge_base()
    # In-memory KB exposes the list directly; live KB uses Supabase query.
    samples = getattr(kb, "biometrics", None)
    if samples is not None:
        return [s for s in samples if s["session_id"] == session_id]

    settings = get_settings()
    db = create_client(settings.supabase_url, settings.supabase_service_role_key)
    rows = (
        db.table("biometric_samples")
        .select("*")
        .eq("session_id", session_id)
        .order("ts_ms")
        .execute()
    )
    return rows.data or []
