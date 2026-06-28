"""Health check API endpoints."""

from datetime import datetime, timezone
from fastapi import APIRouter
from constellation import __version__

router = APIRouter(prefix="/api/health", tags=["health"])

_start_time: datetime | None = None


@router.on_event("startup")
async def startup():
    global _start_time
    _start_time = datetime.now(timezone.utc)


@router.get("")
async def health_check():
    """Basic health check endpoint."""
    uptime = 0.0
    if _start_time:
        uptime = (datetime.now(timezone.utc) - _start_time).total_seconds()

    return {
        "status": "healthy",
        "version": __version__,
        "timestamp": datetime.now(timezone.utc).isoformat(),
        "uptime_seconds": uptime,
    }


@router.get("/ready")
async def readiness_check():
    """Readiness check - verifies all dependencies are available."""
    checks = {
        "api": True,
        "database": True,  # TODO: Check SQLite connection
        "vector_store": False,  # TODO: Check Qdrant connection
        "embedding_service": False,  # TODO: Check sentence-transformers
        "llm_providers": False,  # TODO: Check Ollama/external providers
    }

    all_ready = all(checks.values())

    return {
        "status": "ready" if all_ready else "not_ready",
        "checks": checks,
        "timestamp": datetime.now(timezone.utc).isoformat(),
    }
