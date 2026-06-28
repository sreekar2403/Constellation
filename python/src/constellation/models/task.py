"""Task and agent orchestration data models."""

from datetime import datetime
from enum import Enum
from pydantic import BaseModel, Field
from uuid import uuid4


class TaskStatus(str, Enum):
    """Task execution status."""
    PENDING = "pending"
    RUNNING = "running"
    COMPLETED = "completed"
    FAILED = "failed"
    CANCELLED = "cancelled"


class TaskPriority(str, Enum):
    """Task priority levels."""
    LOW = "low"
    MEDIUM = "medium"
    HIGH = "high"
    CRITICAL = "critical"


class TaskInfo(BaseModel):
    """Information about a task."""
    id: str = Field(default_factory=lambda: str(uuid4()))
    name: str
    description: str = ""
    status: TaskStatus = TaskStatus.PENDING
    priority: TaskPriority = TaskPriority.MEDIUM
    agent_id: str | None = None
    provider_id: str | None = None
    input_data: dict = Field(default_factory=dict)
    output_data: dict = Field(default_factory=dict)
    error: str | None = None
    created_at: datetime = Field(default_factory=datetime.utcnow)
    started_at: datetime | None = None
    completed_at: datetime | None = None
    metadata: dict = Field(default_factory=dict)


class SkillStatus(str, Enum):
    """Skill lifecycle status."""
    DRAFT = "draft"
    ACTIVE = "active"
    DEPRECATED = "deprecated"
    ARCHIVED = "archived"


class SkillInfo(BaseModel):
    """Information about a learned skill."""
    id: str = Field(default_factory=lambda: str(uuid4()))
    name: str
    description: str = ""
    status: SkillStatus = SkillStatus.DRAFT
    provider_id: str | None = None
    trigger_embedding: list[float] | None = None
    similarity_threshold: float = 0.75
    usage_count: int = 0
    total_tokens_saved: int = 0
    steps: list[dict] = Field(default_factory=list)
    source_pattern_id: str | None = None
    generation: int = 1
    created_at: datetime = Field(default_factory=datetime.utcnow)
    updated_at: datetime = Field(default_factory=datetime.utcnow)


class ObservationStatus(str, Enum):
    """Observation status."""
    CAPTURED = "captured"
    ANALYZED = "analyzed"
    PATTERN_MATCHED = "pattern_matched"


class ObservationInfo(BaseModel):
    """Information about an agent observation."""
    id: str = Field(default_factory=lambda: str(uuid4()))
    task_id: str
    agent_id: str
    action: str
    input_data: dict = Field(default_factory=dict)
    output_data: dict = Field(default_factory=dict)
    tokens_used: int = 0
    duration_ms: float = 0.0
    status: ObservationStatus = ObservationStatus.CAPTURED
    pattern_id: str | None = None
    created_at: datetime = Field(default_factory=datetime.utcnow)
    metadata: dict = Field(default_factory=dict)
