"""Knowledge Base endpoints — personal insights + (gated) aggregated trends."""

from __future__ import annotations

from fastapi import APIRouter, HTTPException
from supabase import create_client

from app.config import get_settings

router = APIRouter()


@router.get("/me/{user_id}/themes")
async def personal_themes(user_id: str) -> dict:
    """Return the user's top recurring themes (Phase 3 will compute these properly)."""
    settings = get_settings()
    db = create_client(settings.supabase_url, settings.supabase_service_role_key)
    rows = (
        db.table("utterances")
        .select("text, phase")
        .eq("user_id", user_id)
        .eq("role", "user")
        .limit(200)
        .execute()
    )
    return {
        "user_id": user_id,
        "utterance_count": len(rows.data or []),
        "note": "Theme clustering becomes active in Phase 3 (see ROADMAP.md).",
    }


@router.get("/aggregate/cohort/{cohort_key}")
async def aggregate_cohort(cohort_key: str) -> dict:
    """B2B-facing aggregate insight endpoint.

    Currently locked — exposed only to service-role callers. Differential
    privacy layer arrives in Phase 3.
    """
    raise HTTPException(status_code=403, detail="Aggregate endpoint locked until DP layer ships.")
