"""Data mapping and ETL pipeline models."""

from datetime import datetime
from enum import Enum
from pydantic import BaseModel, Field
from uuid import uuid4


class PipelineStatus(str, Enum):
    """Pipeline execution status."""
    IDLE = "idle"
    RUNNING = "running"
    COMPLETED = "completed"
    FAILED = "failed"
    PAUSED = "paused"


class SourceType(str, Enum):
    """Data source types."""
    GIT = "git"
    DATABASE = "database"
    API = "api"
    DOCUMENT = "document"
    LOG = "log"
    FILE = "file"


class TargetType(str, Enum):
    """Data target types."""
    GRAPH = "graph"
    VECTOR = "vector"
    DATABASE = "database"
    SEARCH = "search"


class TransformType(str, Enum):
    """Transformation types."""
    FILTER = "filter"
    MAP = "map"
    AGGREGATE = "aggregate"
    JOIN = "join"
    DEDUPLICATE = "deduplicate"
    NORMALIZE = "normalize"
    EMBED = "embed"


class DataSource(BaseModel):
    """A data source configuration."""
    id: str = Field(default_factory=lambda: str(uuid4()))
    name: str
    type: SourceType
    config: dict = Field(default_factory=dict)
    schema_map: dict[str, str] = Field(default_factory=dict)
    created_at: datetime = Field(default_factory=datetime.utcnow)


class DataTarget(BaseModel):
    """A data target configuration."""
    id: str = Field(default_factory=lambda: str(uuid4()))
    name: str
    type: TargetType
    config: dict = Field(default_factory=dict)
    created_at: datetime = Field(default_factory=datetime.utcnow)


class MappingStep(BaseModel):
    """A step in a mapping pipeline."""
    id: str = Field(default_factory=lambda: str(uuid4()))
    name: str
    transform_type: TransformType
    config: dict = Field(default_factory=dict)
    order: int = 0


class MappingPipeline(BaseModel):
    """A complete data mapping pipeline."""
    id: str = Field(default_factory=lambda: str(uuid4()))
    name: str
    description: str = ""
    source: DataSource
    target: DataTarget
    steps: list[MappingStep] = Field(default_factory=list)
    schedule: str | None = None  # Cron expression
    status: PipelineStatus = PipelineStatus.IDLE
    created_at: datetime = Field(default_factory=datetime.utcnow)
    updated_at: datetime = Field(default_factory=datetime.utcnow)


class MappingResult(BaseModel):
    """Result of a pipeline execution."""
    id: str = Field(default_factory=lambda: str(uuid4()))
    pipeline_id: str
    status: PipelineStatus
    records_processed: int = 0
    records_failed: int = 0
    duration_ms: float = 0.0
    error: str | None = None
    started_at: datetime = Field(default_factory=datetime.utcnow)
    completed_at: datetime | None = None
    metadata: dict = Field(default_factory=dict)


class SchemaMap(BaseModel):
    """Schema mapping between source and target."""
    source_field: str
    target_field: str
    transform: str | None = None  # Optional transform expression
    default_value: str | None = None


class EntityResolution(BaseModel):
    """Entity resolution configuration."""
    name: str
    match_fields: list[str]
    similarity_threshold: float = 0.8
    use_embedding: bool = False
    embedding_model: str | None = None


class LineageNode(BaseModel):
    """A node in the data lineage graph."""
    id: str
    name: str
    type: str  # "source", "transform", "target"
    metadata: dict = Field(default_factory=dict)


class LineageEdge(BaseModel):
    """An edge in the data lineage graph."""
    source: str
    target: str
    transform: str | None = None
    field_mappings: list[SchemaMap] = Field(default_factory=list)


class LineageGraph(BaseModel):
    """Complete data lineage graph."""
    nodes: list[LineageNode] = Field(default_factory=list)
    edges: list[LineageEdge] = Field(default_factory=list)
