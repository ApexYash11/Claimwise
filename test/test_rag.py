import pytest
import sys
from pathlib import Path

# Add backend/src to Python path for imports
backend_src = Path(__file__).parent.parent / "src"
sys.path.insert(0, str(backend_src))

import tempfile
import os
from unittest.mock import Mock, patch, MagicMock
from typing import List, Optional

from src.rag import chunk_texts, index_documents, retrieve_top_k
from src.embeddings import embed_texts


class TestChunkTexts:
    def test_chunk_texts_basic(self):
        """Test basic chunking functionality."""
        text = "This is a test document. It has multiple sentences. Each sentence should be included."
        chunks = chunk_texts([text], chunk_size=5, overlap=2)
        
        assert len(chunks) > 0
        assert all(isinstance(chunk, str) for chunk in chunks)
        # First chunk should contain first few words
        assert "This is a test" in chunks[0]

    def test_chunk_texts_empty(self):
        """Test chunking with empty input."""
        chunks = chunk_texts([], chunk_size=5, overlap=2)
        assert chunks == []

    def test_chunk_texts_overlap(self):
        """Test that overlap works correctly."""
        text = "one two three four five six seven eight nine ten"
        chunks = chunk_texts([text], chunk_size=4, overlap=2)
        
        # Should have overlapping words
        assert len(chunks) >= 2
        # Check that overlapping words appear in consecutive chunks
        if len(chunks) >= 2:
            # Find common words between first and second chunk
            words1 = chunks[0].split()
            words2 = chunks[1].split()
            common = set(words1) & set(words2)
            assert len(common) > 0  # Should have overlapping words


class TestEmbedTexts:
    @patch('src.embeddings.client')
    def test_embed_texts_success(self, mock_client):
        """Test successful embedding generation."""
        # Mock the API response
        mock_response = [
            Mock(values=[0.1, 0.2, 0.3]),
            Mock(values=[0.4, 0.5, 0.6])
        ]
        mock_client.generate_embeddings.return_value = mock_response
        
        texts = ["first text", "second text"]
        embeddings = embed_texts(texts)
        
        assert len(embeddings) == 2
        assert embeddings[0] == [0.1, 0.2, 0.3]
        assert embeddings[1] == [0.4, 0.5, 0.6]

    @patch('src.embeddings.client')
    def test_embed_texts_retry_on_rate_limit(self, mock_client):
        """Test retry logic on rate limit."""
        # First call fails with rate limit, second succeeds
        mock_client.generate_embeddings.side_effect = [
            Exception("429 rate limit"),
            [Mock(values=[0.1, 0.2, 0.3])]
        ]
        
        with patch('src.embeddings.time.sleep'):  # Skip actual sleep
            embeddings = embed_texts(["test"], max_retries=2, delay=0.1)
        
        assert len(embeddings) == 1
        assert embeddings[0] == [0.1, 0.2, 0.3]
        assert mock_client.generate_embeddings.call_count == 2

    @patch('src.embeddings.client')
    def test_embed_texts_failure_after_retries(self, mock_client):
        """Test handling of persistent failures."""
        mock_client.generate_embeddings.side_effect = Exception("429 rate limit")
        
        with patch('src.embeddings.time.sleep'):
            embeddings = embed_texts(["test"], max_retries=2, delay=0.1)
        
        assert len(embeddings) == 1
        assert embeddings[0] is None


class TestIndexDocuments:
    @patch('src.rag.supabase_storage')
    @patch('src.rag.embed_texts')
    def test_index_documents_with_embeddings(self, mock_embed, mock_supabase):
        """Test successful indexing with embeddings."""
        # Mock embeddings
        mock_embed.return_value = [[0.1, 0.2, 0.3], [0.4, 0.5, 0.6]]
        
        # Mock successful DB insert
        mock_result = Mock()
        mock_result.error = None
        mock_supabase.table().insert().execute.return_value = mock_result
        
        text = "This is a test document for indexing."
        result = index_documents(text, "doc123", chunk_size=3, overlap=1)
        
        assert len(result) >= 1
        # Check that insert was called
        mock_supabase.table.assert_called_with("document_chunks")

    @patch('src.rag.supabase_storage')
    @patch('src.rag.embed_texts')
    def test_index_documents_without_embeddings(self, mock_embed, mock_supabase):
        """Test indexing when embeddings fail."""
        # Mock embedding failure
        mock_embed.side_effect = Exception("API key missing")
        
        # Mock successful DB insert
        mock_result = Mock()
        mock_result.error = None
        mock_supabase.table().insert().execute.return_value = mock_result
        
        text = "This is a test document."
        result = index_documents(text, "doc123")
        
        # Should still index chunks, just without embeddings
        assert len(result) >= 1
        # Check that chunks were inserted without embedding field
        mock_supabase.table().insert.assert_called()

    @patch('src.rag.supabase_storage')
    @patch('src.rag.embed_texts')
    def test_index_documents_dimension_mismatch(self, mock_embed, mock_supabase):
        """Test handling of embedding dimension mismatch."""
        # Mock embeddings with wrong dimension
        mock_embed.return_value = [[0.1, 0.2]]  # 2D instead of expected 768D
        
        # Mock successful DB insert
        mock_result = Mock()
        mock_result.error = None
        mock_supabase.table().insert().execute.return_value = mock_result
        
        with patch('src.rag.EXPECTED_EMBED_DIM', 768):
            text = "Test document"
            result = index_documents(text, "doc123")
            
            # Should store chunks without embeddings due to dimension mismatch
            assert len(result) >= 1


class TestRetrieveTopK:
    @patch('src.rag.supabase_storage')
    @patch('src.rag.embed_texts')
    def test_retrieve_top_k_success(self, mock_embed, mock_supabase):
        """Test successful retrieval."""
        # Mock query embedding
        mock_embed.return_value = [[0.1, 0.2, 0.3]]
        
        # Mock RPC response
        mock_rpc_result = Mock()
        mock_rpc_result.data = [
            {"id": 1, "content": "First chunk", "score": 0.9},
            {"id": 2, "content": "Second chunk", "score": 0.8}
        ]
        mock_supabase.postgrest.rpc().execute.return_value = mock_rpc_result
        
        results = retrieve_top_k("test query", k=2)
        
        assert len(results) == 2
        assert results[0] == (1, "First chunk", 0.9)
        assert results[1] == (2, "Second chunk", 0.8)

    @patch('src.rag.supabase_storage')
    @patch('src.rag.embed_texts')
    def test_retrieve_top_k_embedding_failure(self, mock_embed, mock_supabase):
        """Test retrieval when embedding fails."""
        mock_embed.return_value = []  # Empty embeddings
        
        results = retrieve_top_k("test query", k=5)
        
        assert results == []
        mock_supabase.postgrest.rpc.assert_not_called()

    @patch('src.rag.supabase_storage')
    @patch('src.rag.embed_texts')
    def test_retrieve_top_k_rpc_failure(self, mock_embed, mock_supabase):
        """Test retrieval when RPC fails."""
        mock_embed.return_value = [[0.1, 0.2, 0.3]]
        mock_supabase.postgrest.rpc().execute.side_effect = Exception("RPC failed")
        
        results = retrieve_top_k("test query", k=5)
        
        assert results == []


if __name__ == "__main__":
    pytest.main([__file__, "-v"])
