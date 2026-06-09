"""FastAPI entrypoint for AI-Mind backend."""

from collections.abc import AsyncIterator
from contextlib import asynccontextmanager

import structlog
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from app.config import get_settings
from app.routers import biometric, knowledge, session

log = structlog.get_logger()


@asynccontextmanager
async def lifespan(app: FastAPI) -> AsyncIterator[None]:
    settings = get_settings()
    log.info("startup", env=settings.environment, model=settings.anthropic_model)
    yield
    log.info("shutdown")


app = FastAPI(
    title="AI-Mind Backend",
    description="Adaptive hypnosis orchestrator. Voice + biometrics + Claude.",
    version="0.1.0",
    lifespan=lifespan,
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(session.router, prefix="/api/session", tags=["session"])
app.include_router(biometric.router, prefix="/api/biometric", tags=["biometric"])
app.include_router(knowledge.router, prefix="/api/knowledge", tags=["knowledge"])


@app.get("/health")
async def health() -> dict[str, str]:
    return {"status": "ok"}
