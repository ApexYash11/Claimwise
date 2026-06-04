import pytest
import sys
from pathlib import Path
import importlib

REPO_ROOT = Path(__file__).resolve().parents[1]
BACKEND_ROOT = REPO_ROOT / "backend"
if str(BACKEND_ROOT) not in sys.path:
    sys.path.insert(0, str(BACKEND_ROOT))

from unittest.mock import Mock, patch

rag = importlib.import_module("src.rag")
chunk_texts = rag.chunk_texts
index_documents = rag.index_documents
retrieve_top_k = rag.retrieve_top_k

pytestmark = pytest.mark.anyio


class TestChunkTexts:
    def test_chunk_texts_basic(self):
        text = "This is a test document. It has multiple sentences. Each sentence should be included."
        chunks = chunk_texts([text], chunk_size=5, overlap=2)
        assert len(chunks) > 0
        assert all(isinstance(chunk, str) for chunk in chunks)
        assert "This is a test" in chunks[0]

    def test_chunk_texts_empty(self):
        chunks = chunk_texts([], chunk_size=5, overlap=2)
        assert chunks == []

    def test_chunk_texts_overlap(self):
        text = "one two three four five six seven eight nine ten"
        chunks = chunk_texts([text], chunk_size=4, overlap=2)
        assert len(chunks) >= 2
        if len(chunks) >= 2:
            words1 = chunks[0].split()
            words2 = chunks[1].split()
            common = set(words1) & set(words2)
            assert len(common) > 0


class TestIndexDocuments:
    async def test_index_documents_with_embeddings(self):
        with (
            patch("src.rag.supabase_storage") as mock_supabase,
            patch("src.rag.embed_texts") as mock_embed,
            patch("src.rag.should_embed_chunk", return_value=True) as _,
            patch("src.rag.EXPECTED_EMBED_DIM", 3),
        ):
            mock_embed.return_value = [[0.1, 0.2, 0.3], [0.4, 0.5, 0.6]]
            mock_result = Mock()
            mock_result.error = None
            mock_supabase.table().insert().execute.return_value = mock_result

            text = "This is a test document for indexing."
            result = await index_documents(text, "doc123", chunk_size=3, overlap=1)

            assert len(result) >= 1
            mock_supabase.table.assert_called_with("document_chunks")

    async def test_index_documents_without_embeddings(self):
        with (
            patch("src.rag.supabase_storage") as mock_supabase,
            patch("src.rag.embed_texts") as mock_embed,
            patch("src.rag.should_embed_chunk", return_value=True) as _,
        ):
            mock_embed.side_effect = Exception("API key missing")
            mock_result = Mock()
            mock_result.error = None
            mock_supabase.table().insert().execute.return_value = mock_result

            text = "This is a test document."
            with pytest.raises(RuntimeError):
                await index_documents(text, "doc123")

    async def test_index_documents_dimension_mismatch(self):
        with (
            patch("src.rag.supabase_storage") as mock_supabase,
            patch("src.rag.embed_texts") as mock_embed,
            patch("src.rag.should_embed_chunk", return_value=True) as _,
            patch("src.rag.EXPECTED_EMBED_DIM", 768),
        ):
            mock_embed.return_value = [[0.1, 0.2]]
            mock_result = Mock()
            mock_result.error = None
            mock_supabase.table().insert().execute.return_value = mock_result

            text = "Test document"
            with pytest.raises(RuntimeError, match="dimension mismatch"):
                await index_documents(text, "doc123")


class TestRetrieveTopK:
    async def test_retrieve_top_k_success(self):
        with (
            patch("src.rag.supabase_storage") as mock_supabase,
            patch("src.rag.embed_texts") as mock_embed,
            patch("src.rag.EXPECTED_EMBED_DIM", 3),
        ):
            mock_embed.return_value = [[0.1, 0.2, 0.3]]
            mock_rpc_result = Mock()
            mock_rpc_result.data = [
                {"id": 1, "content": "First chunk", "score": 0.9},
                {"id": 2, "content": "Second chunk", "score": 0.8},
            ]
            mock_supabase.postgrest.rpc().execute.return_value = mock_rpc_result

            results = await retrieve_top_k("test query", k=2)
            assert len(results) == 2
            assert results[0] == (1, "First chunk", 0.9)
            assert results[1] == (2, "Second chunk", 0.8)

    async def test_retrieve_top_k_embedding_failure(self):
        with (
            patch("src.rag.supabase_storage") as mock_supabase,
            patch("src.rag.embed_texts") as mock_embed,
        ):
            mock_embed.return_value = []

            results = await retrieve_top_k("test query", k=5)
            assert results == []
            mock_supabase.postgrest.rpc.assert_not_called()

    async def test_retrieve_top_k_rpc_failure(self):
        with (
            patch("src.rag.supabase_storage") as mock_supabase,
            patch("src.rag.embed_texts") as mock_embed,
            patch("src.rag.EXPECTED_EMBED_DIM", 3),
        ):
            mock_embed.return_value = [[0.1, 0.2, 0.3]]
            mock_supabase.postgrest.rpc().execute.side_effect = Exception("RPC failed")

            results = await retrieve_top_k("test query", k=5)
            assert results == []


if __name__ == "__main__":
    pytest.main([__file__, "-v"])
