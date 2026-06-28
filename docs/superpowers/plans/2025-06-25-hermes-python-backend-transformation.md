# Hermes Workspace Python Backend Transformation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Transform the Constellation agent orchestration platform from a TypeScript/Node.js-only architecture into a hybrid TypeScript frontend + Python backend system with advanced knowledge graph computations, unified AI provider management (100+ models), and multi-source data mapping pipelines.

---

## File Structure

```
constellation/
├── shared/                          # [NO CHANGES] TypeScript types
├── server/                          # [NO CHANGES] Existing Node.js backend
├── client/                          # [MODIFY] Add Python API client layer
│   └── src/
│       ├── services/
│       │   └── python-api.ts        # [NEW] Auto-generated from OpenAPI
│       └── components/
│           └── GraphExplorer.tsx     # [MODIFY] Wire to Python graph API
├── python/                          # [NEW] Python workspace root
│   ├── pyproject.toml               # [NEW] uv/Poetry project config
│   ├── README.md                    # [NEW] Python service docs
│   ├── src/
│   │   └── constellation/
│   │       ├── __init__.py
│   │       ├── main.py              # [NEW] FastAPI app entry
│   │       ├── config.py            # [NEW] Settings / env
│   │       ├── models/              # [NEW] Pydantic schemas
│   │       │   ├── __init__.py
│   │       │   ├── graph.py         # Node, Edge, Graph models
│   │       │   ├── provider.py      # Provider, Model, Request/Response
│   │       │   ├── task.py          # Task, Skill, Observation
│   │       │   └── mapping.py       # Mapping pipeline models
│   │       ├── api/                 # [NEW] FastAPI routers
│   │       │   ├── __init__.py
│   │       │   ├── graph.py         # /api/graph/* endpoints
│   │       │   ├── providers.py     # /api/providers/* endpoints
│   │       │   ├── tasks.py         # /api/tasks/* endpoints
│   │       │   ├── mappings.py      # /api/mappings/* endpoints
│   │       │   └── health.py        # /api/health
│   │       ├── services/            # [NEW] Business logic
│   │       │   ├── __init__.py
│   │       │   ├── graph_engine.py  # NetworkX graph algorithms
│   │       │   ├── embeddings.py    # sentence-transformers embeddings
│   │       │   ├── provider_registry.py  # LiteLLM unified interface
│   │       │   ├── vector_store.py  # Qdrant client wrapper
│   │       │   ├── data_mapper.py   # ETL pipeline orchestration
│   │       │   └── persistence.py   # SQLite/Neo4j/Kuzu adapters
│   │       ├── workers/             # [NEW] Background task workers
│   │       │   ├── __init__.py
│   │       │   ├── indexer.py       # Background graph indexing
│   │       │   └── sync.py          # Incremental sync worker
│   │       └── utils/               # [NEW] Shared utilities
│   │           ├── __init__.py
│   │           ├── ast_parser.py    # Multi-language AST parsing
│   │           ├── file_scanner.py  # File walking & filtering
│   │           └── logger.py        # Structured logging
│   └── tests/                       # [NEW] Test suite
│       ├── __init__.py
│       ├── conftest.py
│       ├── test_graph_engine.py
│       ├── test_providers.py
│       ├── test_embeddings.py
│       └── test_api.py
└── docs/
    └── superpowers/
        └── plans/
            └── 2025-06-25-hermes-python-backend-transformation.md
```

---

## Phase 1: Python Backend Infrastructure (Foundation)

### Task 1.1: Initialize Python Workspace
- [ ] Create `python/` directory with `pyproject.toml` (uv)
- [ ] Configure dependencies: fastapi, uvicorn, pydantic, litellm, networkx, sentence-transformers, qdrant-client, httpx, structlog
- [ ] Create `src/constellation/__init__.py` with package metadata
- [ ] Create `src/constellation/config.py` with Pydantic Settings (env-based config)
- [ ] Create `src/constellation/main.py` with FastAPI app, CORS, middleware, lifespan
- [ ] Verify: `uv run uvicorn constellation.main:app --reload` starts successfully

### Task 1.2: Database Adapters
- [ ] Create `src/constellation/services/persistence.py`
  - `SQLiteAdapter` class (wraps aiosqlite) for backward compatibility with existing server DB
  - `GraphDatabaseAdapter` protocol/interface for pluggable backends (Kuzu, Neo4j, NetworkX-in-memory)
  - `KuzuAdapter` implementation (local graph DB, no server needed)
  - `InMemoryGraphAdapter` using NetworkX (default, fastest for dev)
- [ ] Create `src/constellation/models/graph.py` with Pydantic models:
  - `GraphNode` (id, name, type, embedding, metadata, agent_activity)
  - `GraphEdge` (source, target, type, weight, metadata)
  - `KnowledgeGraph` (nodes, edges, root_path, stats)
  - `GraphQuery` (filters, traversal_options, ranking)
- [ ] Write tests in `tests/test_persistence.py`
- [ ] Verify: all persistence tests pass

### Task 1.3: Vector Store Integration
- [ ] Create `src/constellation/services/vector_store.py`
  - `VectorStore` protocol/interface
  - `QdrantVectorStore` implementation (connects to Qdrant server or in-memory)
  - `InMemoryVectorStore` fallback (FAISS-backed numpy arrays for dev)
- [ ] Operations: upsert, search (cosine similarity), delete, batch insert
- [ ] Create `src/constellation/models/vector.py` for vector-specific models
- [ ] Write tests in `tests/test_vector_store.py`
- [ ] Verify: vector operations work with test embeddings

### Task 1.4: Embedding Service
- [ ] Create `src/constellation/services/embeddings.py`
  - `EmbeddingService` class using sentence-transformers
  - Default model: `all-MiniLM-L6-v2` (fast, 384-dim)
  - Alternative models: `bge-small-en-v1.5`, `nomic-embed-text-v1`
  - `embed_text(text) -> list[float]` single
  - `embed_batch(texts) -> list[list[float]]` batched
  - `embed_code(code, language) -> list[float]` code-aware (adds language prefix)
- [ ] Create `src/constellation/models/embedding.py`
- [ ] Write tests in `tests/test_embeddings.py`
- [ ] Verify: embeddings generate consistent vectors for same input

---

## Phase 2: Advanced Knowledge Graph Engine

### Task 2.1: Multi-Language AST Parser
- [ ] Create `src/constellation/utils/ast_parser.py`
  - Use `tree-sitter` for multi-language AST parsing
  - Supported languages: TypeScript, JavaScript, Python, Go, Rust, Java
  - Extract: imports, function definitions, class definitions, type references, docstrings
  - `parse_file(filepath) -> ASTResult`
  - `extract_symbols(ast) -> list[Symbol]` (functions, classes, interfaces, etc.)
  - `extract_dependencies(ast) -> list[Dependency]` (imports, calls, type refs)
- [ ] Create `src/constellation/models/ast.py` for AST models
- [ ] Write tests with sample files in each language
- [ ] Verify: parser correctly extracts dependencies from TypeScript and Python files

### Task 2.2: Graph Construction Engine
- [ ] Create `src/constellation/services/graph_engine.py`
  - `GraphEngine` class wrapping NetworkX DiGraph
  - `build_from_directory(root_path, options) -> KnowledgeGraph`
  - Phases: walk -> parse -> embed -> build edges
  - Edge types: `imports`, `calls`, `extends`, `implements`, `similarity`
  - Similarity edges via embedding cosine distance threshold
- [ ] `GraphEngine` methods:
  - `add_node(graph_node)` / `remove_node(node_id)`
  - `add_edge(source, target, type, weight)`
  - `get_node(node_id)` / `get_neighbors(node_id, direction, edge_types)`
  - `compute_subgraph(node_ids, depth) -> KnowledgeGraph`
  - `get_stats() -> GraphStats`
- [ ] Write tests in `tests/test_graph_engine.py`
- [ ] Verify: can build a graph from the constellation `shared/` directory

### Task 2.3: Graph Algorithms
- [ ] Add to `graph_engine.py`:
  - `find_communities() -> list[Community]` (Leiden algorithm via igraph)
  - `compute_centrality(algorithm) -> dict[str, float]` (PageRank, Betweenness, Eigenvector)
  - `find_paths(source, target, max_depth) -> list[list[str]]`
  - `compute_impact_analysis(node_id, change_type) -> ImpactReport` (blast radius)
  - `find_similar_nodes(node_id, top_k) -> list[ScoredNode]`
  - `detect_clusters(threshold) -> list[Cluster]`
- [ ] Create `src/constellation/models/algorithms.py` for result models
- [ ] Write tests with known graph structures (e.g., create small test graph, verify community detection)
- [ ] Verify: algorithms produce correct results on test graphs

### Task 2.4: Graph Query API
- [ ] Create `src/constellation/api/graph.py` (FastAPI router)
  - `POST /api/graph/build` - trigger indexing of a directory
  - `GET /api/graph/status` - current indexing progress
  - `GET /api/graph/{graph_id}` - get full graph
  - `GET /api/graph/{graph_id}/node/{node_id}` - get node with neighbors
  - `POST /api/graph/{graph_id}/query` - complex graph query
  - `POST /api/graph/{graph_id}/search` - semantic search via embeddings
  - `GET /api/graph/{graph_id}/communities` - get community structure
  - `GET /api/graph/{graph_id}/centrality` - get centrality scores
  - `POST /api/graph/{graph_id}/impact` - impact analysis
- [ ] Wire WebSocket for real-time indexing progress
- [ ] Write API tests in `tests/test_api.py`
- [ ] Verify: all endpoints respond correctly via curl/httpie

---

## Phase 3: AI Provider Layer (Python-Native)

### Task 3.1: Provider Registry
- [ ] Create `src/constellation/services/provider_registry.py`
  - `ProviderRegistry` class wrapping LiteLLM
  - `list_providers() -> list[ProviderInfo]`
  - `list_models(provider_id) -> list[ModelInfo]`
  - `complete(provider_id, model_id, messages, options) -> CompletionResponse`
  - `stream(provider_id, model_id, messages, options) -> AsyncIterator[StreamChunk]`
  - `embed(provider_id, model_id, texts) -> list[list[float]]`
  - `health_check(provider_id) -> ProviderHealth`
  - Cost tracking per request
  - Automatic fallback/routing on failure
- [ ] Create `src/constellation/models/provider.py`:
  - `ProviderInfo`, `ModelInfo`, `CompletionRequest`, `CompletionResponse`
  - `StreamChunk`, `ProviderHealth`, `CostInfo`
- [ ] Provider categories: openai, anthropic, google, ollama, together, groq, azure, bedrock, vertex
- [ ] Write tests in `tests/test_providers.py`
- [ ] Verify: can call ollama provider for completion (local test)

### Task 3.2: Provider API Endpoints
- [ ] Create `src/constellation/api/providers.py` (FastAPI router)
  - `GET /api/providers` - list all providers
  - `GET /api/providers/{provider_id}` - provider details
  - `GET /api/providers/{provider_id}/models` - list models
  - `POST /api/providers/{provider_id}/complete` - text completion
  - `POST /api/providers/{provider_id}/stream` - streaming completion (SSE)
  - `POST /api/providers/{provider_id}/embed` - generate embeddings
  - `GET /api/providers/{provider_id}/health` - health check
  - `GET /api/providers/stats` - cost/usage statistics
- [ ] Streaming via Server-Sent Events (SSE) with `StreamingResponse`
- [ ] Write API tests in `tests/test_api.py`
- [ ] Verify: endpoints work with ollama or mock provider

### Task 3.3: Structured Output & Tool Calling
- [ ] Add to provider layer:
  - `complete_structured(provider_id, model_id, messages, response_model) -> BaseModel` (Pydantic structured output)
  - `complete_with_tools(provider_id, model_id, messages, tools) -> ToolCallResponse`
  - Tool definition standardization (OpenAI function calling format)
  - Auto-retry on malformed output
- [ ] Create `src/constellation/models/tools.py` for tool definitions
- [ ] Write tests with tool calling scenarios
- [ ] Verify: structured output returns valid Pydantic model

---

## Phase 4: Data Mapping & ETL Pipeline

### Task 4.1: Source Connectors
- [ ] Create `src/constellation/services/sources/` directory
  - `base.py` - `DataSource` protocol (connect, extract, schema)
  - `git_source.py` - Git repository (local + GitHub API)
  - `database_source.py` - PostgreSQL, MySQL, SQLite (via SQLAlchemy)
  - `api_source.py` - REST/GraphQL API connector (via httpx)
  - `document_source.py` - PDF, Markdown, Notion
  - `log_source.py` - OpenTelemetry, structured logs
- [ ] Each source implements: `connect()`, `extract()`, `get_schema()`, `close()`
- [ ] Create `src/constellation/models/mapping.py`:
  - `MappingPipeline`, `MappingStep`, `MappingResult`
  - `SchemaMap`, `EntityResolution`, `LineageGraph`
- [ ] Write tests with mock data for each source type
- [ ] Verify: can extract data from a mock API source

### Task 4.2: Transform Engine
- [ ] Create `src/constellation/services/transform.py`
  - `TransformEngine` class
  - Transforms: `filter`, `map`, `aggregate`, `join`, `deduplicate`, `normalize`
  - `SchemaMapper` - automatic field mapping between source and target schemas
  - `EntityResolver` - fuzzy matching + embedding similarity for entity resolution
  - `LineageTracker` - track column-level lineage through transforms
- [ ] Create `src/constellation/models/transform.py`
- [ ] Write tests with transformation pipelines
- [ ] Verify: can transform a simple dataset through pipeline

### Task 4.3: Target Writers
- [ ] Create `src/constellation/services/targets/` directory
  - `base.py` - `DataTarget` protocol (connect, write, upsert, delete)
  - `graph_target.py` - Write to knowledge graph (adds nodes/edges)
  - `vector_target.py` - Write to vector store (embeds + inserts)
  - `database_target.py` - Write to SQL database
  - `search_target.py` - Write to search index
- [ ] Each target implements: `connect()`, `write(records)`, `upsert(records, key)`, `close()`
- [ ] Write tests with mock data
- [ ] Verify: can write records to graph target

### Task 4.4: Pipeline Orchestration
- [ ] Create `src/constellation/services/data_mapper.py`
  - `MappingOrchestrator` class
  - `create_pipeline(name, source, transforms, target) -> Pipeline`
  - `run_pipeline(pipeline_id) -> PipelineResult`
  - `schedule_pipeline(pipeline_id, cron) -> ScheduleInfo`
  - `get_pipeline_status(pipeline_id) -> PipelineStatus`
  - Incremental sync support (CDC-like via change detection)
  - Error handling, retry, dead-letter queue
- [ ] Create `src/constellation/api/mappings.py` (FastAPI router):
  - `POST /api/mappings/pipelines` - create pipeline
  - `GET /api/mappings/pipelines` - list pipelines
  - `POST /api/mappings/pipelines/{id}/run` - trigger run
  - `GET /api/mappings/pipelines/{id}/status` - pipeline status
  - `GET /api/mappings/pipelines/{id}/logs` - execution logs
- [ ] Write integration tests
- [ ] Verify: can create and run a pipeline from API

---

## Phase 5: Frontend Integration

### Task 5.1: Python API Client
- [ ] Create `client/src/services/python-api.ts`
  - Auto-generate from FastAPI OpenAPI spec (use `openapi-typescript`)
  - Or manually create typed client using the Python API models as reference
  - Methods: `graph.build()`, `graph.query()`, `providers.complete()`, `providers.stream()`, etc.
  - WebSocket connection for real-time updates
  - Error handling, retry, timeout
- [ ] Add to Zustand store: `usePythonApiStore`
- [ ] Write unit tests for API client

### Task 5.2: Graph Explorer Enhancement
- [ ] Modify `client/src/components/GraphExplorer.tsx`
  - Wire to Python graph API for community detection results
  - Add centrality visualization (node size = centrality)
  - Add community color coding
  - Add semantic search bar (calls Python embedding search)
  - Add impact analysis view
- [ ] Add `client/src/components/GraphControls.tsx`
  - Algorithm selection dropdown
  - Filter by edge type
  - Depth control for subgraph
  - Export graph as JSON/GraphML
- [ ] Verify: frontend displays Python-generated graph data

### Task 5.3: Provider Dashboard
- [ ] Create `client/src/components/ProviderDashboard.tsx`
  - List all providers from Python API
  - Model selection per provider
  - Cost/usage statistics
  - Health status indicators
  - Test completion UI
- [ ] Create `client/src/components/ChatInterface.tsx`
  - Chat UI using Python provider streaming
  - Tool calling visualization
  - Token usage display
- [ ] Verify: can chat with AI models through frontend

### Task 5.4: Mapping Pipeline UI
- [ ] Create `client/src/components/DataMapper.tsx`
  - Visual pipeline builder (drag & drop steps)
  - Source/transform/target configuration
  - Pipeline execution monitor
  - Results preview
- [ ] Create `client/src/components/PipelineHistory.tsx`
  - Execution history table
  - Error logs viewer
  - Performance metrics
- [ ] Verify: can create and monitor pipeline from UI

---

## Integration & Testing

### Task 6.1: Cross-Service Integration
- [ ] Ensure Node.js server can call Python API (proxy or direct)
- [ ] Add Python service to docker-compose or start scripts
- [ ] Update root package.json scripts to start both services
- [ ] Verify: `npm run dev` starts both Node.js and Python services

### Task 6.2: End-to-End Verification
- [ ] Test: Index a directory → Python builds graph → Frontend displays
- [ ] Test: Chat with AI → Provider routes through Python → Response streams to UI
- [ ] Test: Create mapping pipeline → Execute → Data flows into graph
- [ ] Test: Community detection → Visualization → Impact analysis
- [ ] Verify: All features work together without errors

### Task 6.3: Documentation
- [ ] Update README.md with Python service setup instructions
- [ ] Create `python/README.md` with API reference
- [ ] Add OpenAPI docs (auto-generated at `/docs`)
- [ ] Document environment variables and configuration

---

## Dependency Graph

```
Phase 1 (Foundation) → Phase 2 (Graph Engine) → Phase 4 (Data Mapping)
                    ↘                        ↗
Phase 3 (Providers) ─────────────────────→ Phase 5 (Frontend Integration)
```

**Critical Path:** Phase 1 → Phase 2.1 → Phase 2.2 → Phase 2.4 → Phase 5

**Parallel Opportunities:**
- Phase 1.3 (Vector Store) can run in parallel with Phase 1.2 (Persistence)
- Phase 3 (Providers) can run in parallel with Phase 2 (Graph Engine)
- Phase 4.1-4.3 (Sources/Transform/Targets) can run in parallel with Phase 3

---

## Risk Areas

1. **Graph DB Choice**: Kuzu is local-first but newer; Neo4j requires server; NetworkX is dev-only
   - Mitigation: Start with NetworkX, abstract behind adapter, swap later

2. **Embedding Performance**: sentence-transformers can be slow on first load
   - Mitigation: Lazy loading, model caching, optional GPU acceleration

3. **LiteLLM Reliability**: External API calls can fail
   - Mitigation: Retry logic, circuit breaker, fallback providers

4. **Tree-sitter Installation**: Can be finicky on Windows
   - Mitigation: Use pre-built wheels, fallback to regex parsing

5. **Cross-Language Integration**: Node.js ↔ Python communication
   - Mitigation: HTTP API (not process spawning), WebSocket for real-time

---

## Acceptance Criteria

- [ ] Python service starts and responds at `http://localhost:8000`
- [ ] OpenAPI docs accessible at `http://localhost:8000/docs`
- [ ] Graph engine can index the constellation codebase and return communities/centrality
- [ ] Provider registry can call at least one LLM (ollama local) for completion
- [ ] Embedding service generates consistent vectors
- [ ] Mapping pipeline can execute end-to-end with mock data
- [ ] Frontend can display Python-generated graph data
- [ ] All tests pass (`uv run pytest`)
- [ ] No type errors (`uv run mypy src/`)
- [ ] Code passes linting (`uv run ruff check src/`)

---

## Estimated Complexity

| Phase | Tasks | Parallel Groups | Complexity |
|-------|-------|-----------------|------------|
| Phase 1 | 4 | 2 | Moderate |
| Phase 2 | 4 | 2 | High |
| Phase 3 | 3 | 1 | Moderate |
| Phase 4 | 4 | 2 | High |
| Phase 5 | 4 | 2 | Moderate |
| Integration | 3 | 1 | Moderate |
| **Total** | **22** | **10** | **High** |
