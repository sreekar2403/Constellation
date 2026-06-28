"""Vector store service for semantic search."""

import json
from pathlib import Path
from constellation.config import get_settings
from constellation.utils.logger import get_logger

logger = get_logger(__name__)


class VectorStore:
    """Vector store interface with Qdrant backend and in-memory fallback."""

    def __init__(self):
        self._client = None
        self._collection = None
        self._in_memory: list[dict] = []

    def connect(self, collection: str = "constellation"):
        """Connect to the vector store."""
        settings = get_settings()
        try:
            from qdrant_client import QdrantClient
            self._client = QdrantClient(url=settings.QDRANT_URL)
            self._collection = collection
            # Ensure collection exists
            try:
                self._client.get_collection(collection)
            except Exception:
                from qdrant_client.models import VectorParams, Distance
                self._client.create_collection(
                    collection_name=collection,
                    vectors_config=VectorParams(
                        size=settings.EMBEDDING_DIMENSION,
                        distance=Distance.COSINE,
                    ),
                )
            logger.info("vector_store_connected", backend="qdrant", collection=collection)
        except Exception as e:
            logger.warning("vector_store_fallback", reason=str(e))
            self._client = None

    def upsert(self, id: str, embedding: list[float], metadata: dict | None = None):
        """Insert or update a vector."""
        if self._client:
            from qdrant_client.models import PointStruct
            self._client.upsert(
                collection_name=self._collection,
                points=[
                    PointStruct(
                        id=id,
                        vector=embedding,
                        payload=metadata or {},
                    )
                ],
            )
        else:
            # In-memory fallback
            self._in_memory.append({"id": id, "vector": embedding, "metadata": metadata or {}})

    def search(self, query_embedding: list[float], top_k: int = 10) -> list[dict]:
        """Search for similar vectors."""
        if self._client:
            results = self._client.search(
                collection_name=self._collection,
                query_vector=query_embedding,
                limit=top_k,
            )
            return [
                {"id": r.id, "score": r.score, "metadata": r.payload}
                for r in results
            ]
        else:
            # In-memory fallback with cosine similarity
            import numpy as np
            query_vec = np.array(query_embedding)
            scores = []
            for item in self._in_memory:
                item_vec = np.array(item["vector"])
                score = np.dot(query_vec, item_vec) / (
                    np.linalg.norm(query_vec) * np.linalg.norm(item_vec)
                )
                scores.append({"id": item["id"], "score": float(score), "metadata": item["metadata"]})
            scores.sort(key=lambda x: x["score"], reverse=True)
            return scores[:top_k]

    def delete(self, id: str):
        """Delete a vector by ID."""
        if self._client:
            self._client.delete(
                collection_name=self._collection,
                points_selector=[id],
            )
        else:
            self._in_memory = [item for item in self._in_memory if item["id"] != id]

    def batch_upsert(self, items: list[dict]):
        """Batch insert/update vectors."""
        for item in items:
            self.upsert(item["id"], item["vector"], item.get("metadata"))


# Singleton instance
_vector_store: VectorStore | None = None


def get_vector_store() -> VectorStore:
    """Get the vector store singleton."""
    global _vector_store
    if _vector_store is None:
        _vector_store = VectorStore()
    return _vector_store
