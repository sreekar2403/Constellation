"""Tests for the embedding service."""

import pytest
from constellation.services.embeddings import EmbeddingService


class TestEmbeddingService:
    """Tests for EmbeddingService class."""

    def setup_method(self):
        """Set up test fixtures."""
        self.service = EmbeddingService()

    def test_embed_text(self):
        """Test embedding a single text."""
        embedding = self.service.embed_text("Hello, world!")
        assert isinstance(embedding, list)
        assert len(embedding) > 0
        assert all(isinstance(x, float) for x in embedding)

    def test_embed_batch(self):
        """Test embedding a batch of texts."""
        texts = ["Hello", "World", "Test"]
        embeddings = self.service.embed_batch(texts)
        assert isinstance(embeddings, list)
        assert len(embeddings) == 3
        assert all(len(e) > 0 for e in embeddings)

    def test_embed_code(self):
        """Test embedding code with language prefix."""
        code = "def hello(): print('hello')"
        embedding = self.service.embed_code(code, "python")
        assert isinstance(embedding, list)
        assert len(embedding) > 0

    def test_find_similar(self):
        """Test finding similar documents."""
        query = "greeting"
        documents = ["Hello there", "Goodbye", "See you later", "Hi!"]
        results = self.service.find_similar(query, documents, top_k=2)
        assert len(results) == 2
        assert all("document" in r and "similarity" in r for r in results)
