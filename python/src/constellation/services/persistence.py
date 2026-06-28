"""Persistence service for graph and data storage."""

import json
from pathlib import Path
from constellation.config import get_settings
from constellation.utils.logger import get_logger

logger = get_logger(__name__)


class SQLiteAdapter:
    """SQLite adapter for persistent storage."""

    def __init__(self, db_path: str | None = None):
        settings = get_settings()
        self.db_path = db_path or settings.GRAPH_DB_PATH
        self._conn = None

    async def connect(self):
        """Connect to SQLite database."""
        try:
            import aiosqlite
            Path(self.db_path).parent.mkdir(parents=True, exist_ok=True)
            self._conn = await aiosqlite.connect(self.db_path)
            await self._init_tables()
            logger.info("sqlite_connected", path=self.db_path)
        except Exception as e:
            logger.error("sqlite_connect_error", error=str(e))
            raise

    async def _init_tables(self):
        """Initialize database tables."""
        await self._conn.execute("""
            CREATE TABLE IF NOT EXISTS graphs (
                id TEXT PRIMARY KEY,
                root_path TEXT NOT NULL,
                nodes_json TEXT,
                edges_json TEXT,
                stats_json TEXT,
                last_indexed TEXT,
                created_at TEXT
            )
        """)
        await self._conn.execute("""
            CREATE TABLE IF NOT EXISTS embeddings (
                id TEXT PRIMARY KEY,
                node_id TEXT NOT NULL,
                embedding_json TEXT NOT NULL,
                created_at TEXT
            )
        """)
        await self._conn.execute("""
            CREATE TABLE IF NOT EXISTS skills (
                id TEXT PRIMARY KEY,
                name TEXT,
                description TEXT,
                status TEXT,
                steps_json TEXT,
                usage_count INTEGER DEFAULT 0,
                created_at TEXT
            )
        """)
        await self._conn.commit()

    async def save_graph(self, graph_id: str, root_path: str, nodes: list, edges: list, stats: dict):
        """Save a graph to the database."""
        await self._conn.execute(
            """INSERT OR REPLACE INTO graphs (id, root_path, nodes_json, edges_json, stats_json, created_at)
            VALUES (?, ?, ?, ?, ?, datetime('now'))""",
            (graph_id, root_path, json.dumps(nodes), json.dumps(edges), json.dumps(stats)),
        )
        await self._conn.commit()

    async def load_graph(self, graph_id: str) -> dict | None:
        """Load a graph from the database."""
        cursor = await self._conn.execute("SELECT * FROM graphs WHERE id = ?", (graph_id,))
        row = await cursor.fetchone()
        if not row:
            return None
        return {
            "id": row[0],
            "root_path": row[1],
            "nodes": json.loads(row[2]) if row[2] else [],
            "edges": json.loads(row[3]) if row[3] else [],
            "stats": json.loads(row[4]) if row[4] else {},
            "last_indexed": row[5],
        }

    async def save_embedding(self, node_id: str, embedding: list[float]):
        """Save an embedding to the database."""
        import hashlib
        emb_hash = hashlib.md5(json.dumps(embedding).encode()).hexdigest()
        await self._conn.execute(
            """INSERT OR REPLACE INTO embeddings (id, node_id, embedding_json, created_at)
            VALUES (?, ?, ?, datetime('now'))""",
            (emb_hash, node_id, json.dumps(embedding)),
        )
        await self._conn.commit()

    async def load_embedding(self, node_id: str) -> list[float] | None:
        """Load an embedding from the database."""
        cursor = await self._conn.execute(
            "SELECT embedding_json FROM embeddings WHERE node_id = ?", (node_id,)
        )
        row = await cursor.fetchone()
        return json.loads(row[0]) if row else None

    async def close(self):
        """Close the database connection."""
        if self._conn:
            await self._conn.close()


# Singleton instance
_db_adapter: SQLiteAdapter | None = None


async def get_db_adapter() -> SQLiteAdapter:
    """Get the database adapter singleton."""
    global _db_adapter
    if _db_adapter is None:
        _db_adapter = SQLiteAdapter()
        await _db_adapter.connect()
    return _db_adapter
