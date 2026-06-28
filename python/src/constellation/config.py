"""Configuration module using Pydantic Settings."""

from pathlib import Path
from pydantic_settings import BaseSettings
from pydantic import Field


class Settings(BaseSettings):
    """Application settings loaded from environment variables."""

    # API Configuration
    PYTHON_API_PORT: int = Field(default=8000, description="Port for the Python API server")
    PYTHON_API_HOST: str = Field(default="0.0.0.0", description="Host for the Python API server")
    DEBUG: bool = Field(default=False, description="Enable debug mode")

    # Vector Store (Qdrant)
    QDRANT_URL: str = Field(default="http://localhost:6333", description="Qdrant server URL")
    QDRANT_COLLECTION: str = Field(default="constellation", description="Qdrant collection name")

    # Ollama
    OLLAMA_BASE_URL: str = Field(default="http://localhost:11434", description="Ollama server URL")

    # Embeddings
    EMBEDDING_MODEL: str = Field(default="all-MiniLM-L6-v2", description="Sentence-transformers model name")
    EMBEDDING_DIMENSION: int = Field(default=384, description="Embedding vector dimension")

    # Graph Database
    GRAPH_DB_PATH: str = Field(default="./data/constellation_graph.db", description="SQLite path for graph persistence")

    # Logging
    LOG_LEVEL: str = Field(default="INFO", description="Logging level")

    # CORS
    CORS_ORIGINS: list[str] = Field(
        default=["http://localhost:5173", "http://localhost:3000"],
        description="Allowed CORS origins"
    )

    # LiteLLM
    LITELLM_LOG: bool = Field(default=False, description="Enable LiteLLM logging")

    model_config = {"env_prefix": "", "env_file": ".env", "env_file_encoding": "utf-8"}


def get_settings() -> Settings:
    """Get application settings singleton."""
    return Settings()
