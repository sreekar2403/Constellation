"""Embedding service using sentence-transformers."""

from constellation.config import get_settings
from constellation.utils.logger import get_logger

logger = get_logger(__name__)

# Lazy-loaded model
_model = None


def _get_model():
    """Lazy-load the sentence-transformers model."""
    global _model
    if _model is None:
        settings = get_settings()
        try:
            from sentence_transformers import SentenceTransformer
            logger.info("loading_embedding_model", model=settings.EMBEDDING_MODEL)
            _model = SentenceTransformer(settings.EMBEDDING_MODEL)
            logger.info("embedding_model_loaded", model=settings.EMBEDDING_MODEL)
        except Exception as e:
            logger.error("embedding_model_load_error", error=str(e))
            raise
    return _model


class EmbeddingService:
    """Service for generating text embeddings."""

    def __init__(self):
        self._model = None

    def _ensure_model(self):
        """Ensure the model is loaded."""
        if self._model is None:
            self._model = _get_model()

    def embed_text(self, text: str) -> list[float]:
        """Generate embedding for a single text."""
        self._ensure_model()
        embedding = self._model.encode(text, normalize_embeddings=True)
        return embedding.tolist()

    def embed_batch(self, texts: list[str]) -> list[list[float]]:
        """Generate embeddings for a batch of texts."""
        self._ensure_model()
        embeddings = self._model.encode(texts, normalize_embeddings=True, batch_size=32)
        return embeddings.tolist()

    def embed_code(self, code: str, language: str = "python") -> list[float]:
        """Generate embedding for code with language prefix."""
        prefixed = f"[{language}] {code}"
        return self.embed_text(prefixed)

    def find_similar(
        self, query: str, documents: list[str], top_k: int = 10
    ) -> list[dict]:
        """Find similar documents to a query."""
        self._ensure_model()

        query_embedding = self._model.encode([query], normalize_embeddings=True)
        doc_embeddings = self._model.encode(documents, normalize_embeddings=True)

        # Cosine similarity
        import numpy as np
        similarities = np.dot(doc_embeddings, query_embedding.T).flatten()

        # Get top-k indices
        top_indices = np.argsort(similarities)[::-1][:top_k]

        results = []
        for idx in top_indices:
            results.append({
                "document": documents[idx],
                "similarity": float(similarities[idx]),
                "index": int(idx),
            })
        return results


# Singleton instance
_embedding_service: EmbeddingService | None = None


def get_embedding_service() -> EmbeddingService:
    """Get the embedding service singleton."""
    global _embedding_service
    if _embedding_service is None:
        _embedding_service = EmbeddingService()
    return _embedding_service
