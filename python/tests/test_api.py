"""Tests for the API endpoints."""

import pytest
from httpx import AsyncClient, ASGITransport
from constellation.main import app


class TestHealthAPI:
    """Tests for health check endpoints."""

    @pytest.mark.asyncio
    async def test_health_check(self):
        """Test the health check endpoint."""
        async with AsyncClient(transport=ASGITransport(app=app), base_url="http://test") as client:
            response = await client.get("/api/health")
            assert response.status_code == 200
            data = response.json()
            assert data["status"] == "healthy"
            assert "version" in data

    @pytest.mark.asyncio
    async def test_readiness_check(self):
        """Test the readiness check endpoint."""
        async with AsyncClient(transport=ASGITransport(app=app), base_url="http://test") as client:
            response = await client.get("/api/health/ready")
            assert response.status_code == 200
            data = response.json()
            assert "status" in data
            assert "checks" in data


class TestRootAPI:
    """Tests for root endpoints."""

    @pytest.mark.asyncio
    async def test_root(self):
        """Test the root endpoint."""
        async with AsyncClient(transport=ASGITransport(app=app), base_url="http://test") as client:
            response = await client.get("/")
            assert response.status_code == 200
            data = response.json()
            assert data["service"] == "constellation-python"
            assert "version" in data


class TestGraphAPI:
    """Tests for graph endpoints."""

    @pytest.mark.asyncio
    async def test_graph_status(self):
        """Test the graph status endpoint."""
        async with AsyncClient(transport=ASGITransport(app=app), base_url="http://test") as client:
            response = await client.get("/api/graph/status")
            assert response.status_code == 200
            data = response.json()
            assert data["status"] == "idle"


class TestProviderAPI:
    """Tests for provider endpoints."""

    @pytest.mark.asyncio
    async def test_list_providers(self):
        """Test listing providers."""
        async with AsyncClient(transport=ASGITransport(app=app), base_url="http://test") as client:
            response = await client.get("/api/providers")
            assert response.status_code == 200
            data = response.json()
            assert "providers" in data


class TestTaskAPI:
    """Tests for task endpoints."""

    @pytest.mark.asyncio
    async def test_list_tasks(self):
        """Test listing tasks."""
        async with AsyncClient(transport=ASGITransport(app=app), base_url="http://test") as client:
            response = await client.get("/api/tasks")
            assert response.status_code == 200
            data = response.json()
            assert "tasks" in data


class TestMappingAPI:
    """Tests for mapping endpoints."""

    @pytest.mark.asyncio
    async def test_list_pipelines(self):
        """Test listing pipelines."""
        async with AsyncClient(transport=ASGITransport(app=app), base_url="http://test") as client:
            response = await client.get("/api/mappings/pipelines")
            assert response.status_code == 200
            data = response.json()
            assert "pipelines" in data
