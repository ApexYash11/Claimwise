"""
Smoke test for hybrid PDF extraction + RAG flow.
This script performs:
- Local PDF extraction using the project's gemini_files.extract_text (PyPDF2 fallback)
- Chunking via rag.chunk_texts
- Attempt embedding + indexing via rag.index_documents (will skip embeddings if GEMINI_API_KEY missing)
- Retrieval via rag.retrieve_top_k for a sample query

Run from repository root: python backend/scripts/smoke_test_rag.py

Note: Ensure backend/.env is configured for Supabase if you want indexing to write to DB.
"""
import os
import logging
from pathlib import Path

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

SAMPLE_PDF = Path(__file__).resolve().parents[1] / 'src' / 'sample.pdf'


def run_smoke_test():
    logger.info("Starting RAG smoke test")

    if not SAMPLE_PDF.exists():
        logger.error("Sample PDF not found at %s", SAMPLE_PDF)
        return

    try:
        from src.gemini_files import extract_text
        from src import rag
    except Exception as e:
        logger.exception("Failed to import project modules: %s", e)
        return

    try:
        text = extract_text(str(SAMPLE_PDF))
        logger.info("Extracted text length: %d", len(text))
    except Exception as e:
        logger.exception("Extraction failed: %s", e)
        return

    # Use a transient document id for testing
    doc_id = "smoke_test_doc"

    try:
        inserted = rag.index_documents(text, doc_id)
        logger.info("Indexed %d chunks (some may be without embeddings)", len(inserted))
    except Exception as e:
        logger.exception("Indexing failed: %s", e)
        return

    # Run a retrieval
    try:
        results = rag.retrieve_top_k("what is covered", k=5)
        logger.info("Retrieved %d results", len(results))
        for r in results:
            logger.info("Result: id=%s score=%s excerpt=%s", r[0], r[2], (r[1] or '')[:200])
    except Exception as e:
        logger.exception("Retrieval failed: %s", e)


if __name__ == '__main__':
    run_smoke_test()
