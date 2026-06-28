"""Graph data models for knowledge graph operations."""

from datetime import datetime
from enum import Enum
from pydantic import BaseModel, Field
from uuid import uuid4


class NodeType(str, Enum):
    """Types of graph nodes."""
    FILE = "file"
    DIRECTORY = "directory"
    FUNCTION = "function"
    CLASS = "class"
    INTERFACE = "interface"
    MODULE = "module"
    AGENT = "agent"
    CONCEPT = "concept"


class EdgeType(str, Enum):
    """Types of graph edges."""
    IMPORTS = "imports"
    CALLS = "calls"
    EXTENDS = "extends"
    IMPLEMENTS = "implements"
    SIMILARITY = "similarity"
    CONTAINS = "contains"
    DEPENDS_ON = "depends_on"
    REFERENCES = "references"


class GraphNode(BaseModel):
    """A node in the knowledge graph."""
    id: str = Field(default_factory=lambda: str(uuid4()))
    name: str
    type: NodeType
    extension: str = ""
    size: int = 0
    embedding: list[float] | None = None
    agent_activity: str | None = None
    metadata: dict = Field(default_factory=dict)
    created_at: datetime = Field(default_factory=datetime.utcnow)
    updated_at: datetime = Field(default_factory=datetime.utcnow)

    class Config:
        json_encoders = {datetime: lambda v: v.isoformat()}


class GraphEdge(BaseModel):
    """An edge in the knowledge graph."""
    id: str = Field(default_factory=lambda: str(uuid4()))
    source: str
    target: str
    type: EdgeType
    weight: float = 1.0
    metadata: dict = Field(default_factory=dict)
    created_at: datetime = Field(default_factory=datetime.utcnow)

    class Config:
        json_encoders = {datetime: lambda v: v.isoformat()}


class GraphStats(BaseModel):
    """Statistics about a knowledge graph."""
    total_nodes: int = 0
    total_edges: int = 0
    node_type_counts: dict[str, int] = Field(default_factory=dict)
    edge_type_counts: dict[str, int] = Field(default_factory=dict)
    avg_connectivity: float = 0.0


class KnowledgeGraph(BaseModel):
    """A complete knowledge graph."""
    id: str = Field(default_factory=lambda: str(uuid4()))
    root_path: str
    nodes: list[GraphNode] = Field(default_factory=list)
    edges: list[GraphEdge] = Field(default_factory=list)
    stats: GraphStats = Field(default_factory=GraphStats)
    last_indexed: datetime | None = None
    metadata: dict = Field(default_factory=dict)


class GraphQuery(BaseModel):
    """Query parameters for graph operations."""
    node_types: list[NodeType] | None = None
    edge_types: list[EdgeType] | None = None
    max_depth: int = 3
    limit: int = 100
    offset: int = 0
    search_term: str | None = None


class Community(BaseModel):
    """A community detected in the graph."""
    id: str = Field(default_factory=lambda: str(uuid4()))
    name: str = ""
    node_ids: list[str] = Field(default_factory=list)
    cohesion: float = 0.0
    keywords: list[str] = Field(default_factory=list)
    description: str = ""


class ImpactReport(BaseModel):
    """Impact analysis result for a node."""
    source_node_id: str
    affected_nodes: list[str] = Field(default_factory=list)
    affected_depths: dict[str, int] = Field(default_factory=dict)
    risk_level: str = "low"
    summary: str = ""
