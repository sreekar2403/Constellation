"""Tests for the provider registry service."""

import pytest
from constellation.services.provider_registry import ProviderRegistry
from constellation.models.provider import CompletionRequest, Message


class TestProviderRegistry:
    """Tests for ProviderRegistry class."""

    def setup_method(self):
        """Set up test fixtures."""
        self.registry = ProviderRegistry()

    @pytest.mark.asyncio
    async def test_list_providers(self):
        """Test listing available providers."""
        providers = await self.registry.list_providers()
        assert len(providers) >= 1
        assert any(p.id == "ollama" for p in providers)

    @pytest.mark.asyncio
    async def test_get_provider(self):
        """Test getting a specific provider."""
        provider = await self.registry.get_provider("ollama")
        assert provider is not None
        assert provider.name == "Ollama (Local)"

    @pytest.mark.asyncio
    async def test_get_provider_not_found(self):
        """Test getting a non-existent provider."""
        provider = await self.registry.get_provider("nonexistent")
        assert provider is None

    @pytest.mark.asyncio
    async def test_health_check(self):
        """Test provider health check."""
        health = await self.registry.health_check("ollama")
        assert health.provider_id == "ollama"
        assert health.status in ("healthy", "unhealthy", "unknown")
