"""Provider API endpoints for AI provider management."""

from fastapi import APIRouter, HTTPException
from fastapi.responses import StreamingResponse
from constellation.models.provider import (
    ProviderInfo, ModelInfo, CompletionRequest, CompletionResponse, ProviderHealth
)

router = APIRouter(prefix="/api/providers", tags=["providers"])

# Provider registry will be injected
_registry = None


def get_registry():
    global _registry
    if _registry is None:
        from constellation.services.provider_registry import ProviderRegistry
        _registry = ProviderRegistry()
    return _registry


@router.get("")
async def list_providers():
    """List all available AI providers."""
    registry = get_registry()
    return {"providers": await registry.list_providers()}


@router.get("/{provider_id}")
async def get_provider(provider_id: str):
    """Get provider details."""
    registry = get_registry()
    provider = await registry.get_provider(provider_id)
    if not provider:
        raise HTTPException(status_code=404, detail="Provider not found")
    return provider


@router.get("/{provider_id}/models")
async def list_models(provider_id: str):
    """List available models for a provider."""
    registry = get_registry()
    models = await registry.list_models(provider_id)
    return {"models": models}


@router.post("/{provider_id}/complete")
async def complete(provider_id: str, request: CompletionRequest):
    """Text completion via provider."""
    registry = get_registry()
    try:
        response = await registry.complete(provider_id, request)
        return response
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@router.post("/{provider_id}/stream")
async def stream(provider_id: str, request: CompletionRequest):
    """Streaming text completion via provider."""
    registry = get_registry()
    # TODO: Implement streaming response
    raise HTTPException(status_code=501, detail="Streaming not yet implemented")


@router.post("/{provider_id}/embed")
async def embed(provider_id: str, texts: list[str], model: str | None = None):
    """Generate embeddings via provider."""
    registry = get_registry()
    try:
        embeddings = await registry.embed(provider_id, texts, model)
        return {"embeddings": embeddings}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@router.get("/{provider_id}/health")
async def health_check(provider_id: str):
    """Check provider health status."""
    registry = get_registry()
    health = await registry.health_check(provider_id)
    return health


@router.get("/stats")
async def provider_stats():
    """Get provider usage and cost statistics."""
    return {"stats": {}, "total_cost": 0.0}
