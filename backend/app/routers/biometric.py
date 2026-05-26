"""Biometric ingestion endpoints (REST fallback when WS is not active)."""

from __future__ import annotations

from fastapi import APIRouter
from pydantic import BaseModel
from supabase import create_client

from app.config import get_settings

router = APIRouter()


class BiometricSample(BaseModel):
    session_id: str
    user_id: str
    bpm: int
    hrv_proxy: float | None = None
    ts_ms: int


@router.post("/sample")
async def push_sample(sample: BiometricSample) -> dict[str, str]:
    settings = get_settings()
    db = create_client(settings.supabase_url, settings.supabase_service_role_key)
    db.table("biometric_samples").insert(sample.model_dump()).execute()
    return {"status": "ok"}


@router.get("/session/{session_id}")
async def get_session_biometrics(session_id: str) -> list[dict]:
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
