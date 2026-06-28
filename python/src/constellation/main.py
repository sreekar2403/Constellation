"""FastAPI application entry point."""

from contextlib import asynccontextmanager
from datetime import datetime, timezone

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from constellation import __version__
from constellation.config import get_settings
from constellation.utils.logger import setup_logging, get_logger

# API Routers
from constellation.api.health import router as health_router
from constellation.api.graph import router as graph_router
from constellation.api.providers import router as providers_router
from constellation.api.tasks import router as tasks_router
from constellation.api.mappings import router as mappings_router


settings = get_settings()
setup_logging(settings.LOG_LEVEL)
logger = get_logger(__name__)

_start_time: datetime | None = None


@asynccontextmanager
async def lifespan(app: FastAPI):
    """Application lifespan manager for startup/shutdown events."""
    global _start_time
    _start_time = datetime.now(timezone.utc)
    logger.info("constellation_python_starting", version=__version__)

    # Startup: initialize services here
    yield

    # Shutdown: cleanup services here
    logger.info("constellation_python_shutdown")


app = FastAPI(
    title="Constellation Python Backend",
    description="AI provider orchestration, knowledge graph computations, and data mapping for Constellation",
    version=__version__,
    lifespan=lifespan,
    docs_url="/docs",
    redoc_url="/redoc",
)

# CORS middleware
app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.CORS_ORIGINS,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Include routers
app.include_router(health_router)
app.include_router(graph_router)
app.include_router(providers_router)
app.include_router(tasks_router)
app.include_router(mappings_router)


@app.get("/")
async def root():
    """Root endpoint with service information."""
    return {
        "service": "constellation-python",
        "version": __version__,
        "status": "running",
        "docs": "/docs",
        "health": "/api/health",
    }


def run():
    """Run the server with uvicorn."""
    import uvicorn
    uvicorn.run(
        "constellation.main:app",
        host=settings.PYTHON_API_HOST,
        port=settings.PYTHON_API_PORT,
        reload=settings.DEBUG,
    )


if __name__ == "__main__":
    run()
