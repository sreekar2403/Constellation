"""Provider and AI model data models."""

from datetime import datetime
from enum import Enum
from pydantic import BaseModel, Field
from uuid import uuid4


class ProviderStatus(str, Enum):
    """Provider health status."""
    HEALTHY = "healthy"
    DEGRADED = "degraded"
    UNHEALTHY = "unhealthy"
    UNKNOWN = "unknown"


class ProviderCategory(str, Enum):
    """Provider categories."""
    OPENAI = "openai"
    ANTHROPIC = "anthropic"
    GOOGLE = "google"
    OLLAMA = "ollama"
    TOGETHER = "together"
    GROQ = "groq"
    AZURE = "azure"
    BEDROCK = "bedrock"
    VERTEX = "vertex"
    CUSTOM = "custom"


class ProviderInfo(BaseModel):
    """Information about an AI provider."""
    id: str
    name: str
    category: ProviderCategory
    status: ProviderStatus = ProviderStatus.UNKNOWN
    base_url: str | None = None
    api_key_env: str | None = None
    models_count: int = 0
    last_health_check: datetime | None = None
    metadata: dict = Field(default_factory=dict)


class ModelInfo(BaseModel):
    """Information about an AI model."""
    id: str
    provider_id: str
    name: str
    display_name: str = ""
    context_length: int = 4096
    input_cost_per_1k: float = 0.0
    output_cost_per_1k: float = 0.0
    supports_streaming: bool = True
    supports_tools: bool = False
    supports_vision: bool = False
    metadata: dict = Field(default_factory=dict)


class Message(BaseModel):
    """A chat message."""
    role: str  # "system", "user", "assistant", "tool"
    content: str
    name: str | None = None
    tool_call_id: str | None = None


class ToolDefinition(BaseModel):
    """A tool definition for function calling."""
    name: str
    description: str
    parameters: dict = Field(default_factory=dict)


class CompletionRequest(BaseModel):
    """Request for text completion."""
    messages: list[Message]
    model: str | None = None
    temperature: float = 0.7
    max_tokens: int = 1024
    top_p: float = 1.0
    stream: bool = False
    tools: list[ToolDefinition] | None = None
    response_format: dict | None = None


class CompletionResponse(BaseModel):
    """Response from text completion."""
    id: str = Field(default_factory=lambda: str(uuid4()))
    model: str
    choices: list[dict] = Field(default_factory=list)
    usage: dict = Field(default_factory=dict)
    finish_reason: str = "stop"
    created: datetime = Field(default_factory=datetime.utcnow)


class StreamChunk(BaseModel):
    """A chunk from streaming completion."""
    id: str
    delta: dict
    finish_reason: str | None = None


class ProviderHealth(BaseModel):
    """Health status of a provider."""
    provider_id: str
    status: ProviderStatus
    latency_ms: float = 0.0
    error: str | None = None
    checked_at: datetime = Field(default_factory=datetime.utcnow)


class CostInfo(BaseModel):
    """Cost tracking information."""
    provider_id: str
    model: str
    input_tokens: int = 0
    output_tokens: int = 0
    input_cost: float = 0.0
    output_cost: float = 0.0
    total_cost: float = 0.0
    timestamp: datetime = Field(default_factory=datetime.utcnow)
