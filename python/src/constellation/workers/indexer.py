"""Background indexer worker for knowledge graph construction."""

import asyncio
from pathlib import Path
from constellation.services.graph_engine import GraphEngine
from constellation.services.embeddings import get_embedding_service
from constellation.models.graph import GraphNode, GraphEdge, NodeType, EdgeType
from constellation.utils.logger import get_logger

logger = get_logger(__name__)


class IndexerWorker:
    """Background worker for indexing directories into knowledge graphs."""

    def __init__(self):
        self._engine = GraphEngine()
        self._running = False
        self._progress: dict = {}

    async def index_directory(self, root_path: str) -> str:
        """Start indexing a directory in the background."""
        graph_id = f"graph_{Path(root_path).name}"
        self._engine.create_graph(graph_id, root_path)

        self._running = True
        self._progress = {
            "phase": "starting",
            "current": 0,
            "total": 0,
            "message": "Starting indexing...",
        }

        # Run indexing in background
        asyncio.create_task(self._run_indexing(graph_id, root_path))

        return graph_id

    async def _run_indexing(self, graph_id: str, root_path: str):
        """Run the indexing process."""
        try:
            # Phase 1: Walk directory
            self._progress["phase"] = "walking"
            self._progress["message"] = "Scanning directory..."
            files = self._walk_directory(root_path)
            self._progress["total"] = len(files)
            self._progress["message"] = f"Found {len(files)} files"

            # Phase 2: Parse and add nodes
            self._progress["phase"] = "parsing"
            embedding_service = get_embedding_service()

            for i, file_path in enumerate(files):
                self._progress["current"] = i + 1
                self._progress["message"] = f"Processing {file_path.name}"

                # Create file node
                node = GraphNode(
                    name=str(file_path.relative_to(root_path)),
                    type=NodeType.FILE,
                    extension=file_path.suffix,
                    size=file_path.stat().st_size,
                )
                self._engine.add_node(graph_id, node)

                # Generate embedding for code files
                if file_path.suffix in (".py", ".ts", ".tsx", ".js", ".jsx", ".go", ".rs"):
                    try:
                        content = file_path.read_text(encoding="utf-8", errors="ignore")
                        if content.strip():
                            embedding = embedding_service.embed_code(content, file_path.suffix[1:])
                            node.embedding = embedding
                            self._engine.add_node(graph_id, node)
                    except Exception as e:
                        logger.warning("embedding_error", file=str(file_path), error=str(e))

                # Small delay to prevent blocking
                await asyncio.sleep(0.01)

            # Phase 3: Build edges (import dependencies)
            self._progress["phase"] = "building_edges"
            self._progress["message"] = "Building dependency edges..."
            # TODO: Implement import extraction and edge building

            self._progress["phase"] = "complete"
            self._progress["message"] = "Indexing complete"
            self._running = False

            logger.info("indexing_complete", graph_id=graph_id, files=len(files))

        except Exception as e:
            self._progress["phase"] = "error"
            self._progress["message"] = f"Error: {str(e)}"
            self._running = False
            logger.error("indexing_error", graph_id=graph_id, error=str(e))

    def _walk_directory(self, root_path: str) -> list[Path]:
        """Walk directory and return all files."""
        root = Path(root_path)
        files = []
        skip_dirs = {".git", "node_modules", "__pycache__", ".venv", "venv", "dist", "build"}

        for item in root.rglob("*"):
            if item.is_file():
                # Skip hidden dirs and common non-code dirs
                parts = item.relative_to(root).parts
                if any(part.startswith(".") or part in skip_dirs for part in parts):
                    continue
                files.append(item)

        return files

    def get_progress(self) -> dict:
        """Get current indexing progress."""
        return self._progress.copy()

    def get_graph(self, graph_id: str):
        """Get the built graph."""
        return self._engine._metadata.get(graph_id)
