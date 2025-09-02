-- SQL script to add embedding caching support
-- Run this in your Supabase SQL editor to enable embedding caching

-- Add content fingerprint column to document_chunks table for caching
ALTER TABLE document_chunks 
ADD COLUMN IF NOT EXISTS content_fingerprint TEXT,
ADD COLUMN IF NOT EXISTS embedding_cached_at TIMESTAMP DEFAULT NOW();

-- Create index on content fingerprint for fast lookups
CREATE INDEX IF NOT EXISTS idx_document_chunks_fingerprint 
ON document_chunks(content_fingerprint) 
WHERE content_fingerprint IS NOT NULL;

-- Create embedding cache table for reusable embeddings
CREATE TABLE IF NOT EXISTS embedding_cache (
    id SERIAL PRIMARY KEY,
    content_fingerprint TEXT UNIQUE NOT NULL,
    content_preview TEXT NOT NULL, -- First 200 chars for debugging
    embedding VECTOR(768) NOT NULL, -- Adjust dimension to match EMBEDDING_DIM
    embedding_model TEXT NOT NULL DEFAULT 'textembedding-gecko-001',
    usage_count INTEGER DEFAULT 1,
    created_at TIMESTAMP DEFAULT NOW(),
    last_used_at TIMESTAMP DEFAULT NOW()
);

-- Create index for fast embedding cache lookups
CREATE INDEX IF NOT EXISTS idx_embedding_cache_fingerprint 
ON embedding_cache(content_fingerprint);

-- Create index for cache cleanup (remove old unused entries)
CREATE INDEX IF NOT EXISTS idx_embedding_cache_last_used 
ON embedding_cache(last_used_at);

-- Function to get cached embedding or return null
CREATE OR REPLACE FUNCTION get_cached_embedding(
    fingerprint TEXT
)
RETURNS VECTOR(768) -- Adjust dimension to match EMBEDDING_DIM
LANGUAGE SQL
AS $$
    SELECT embedding 
    FROM embedding_cache 
    WHERE content_fingerprint = fingerprint
    LIMIT 1;
$$;

-- Function to cache an embedding
CREATE OR REPLACE FUNCTION cache_embedding(
    fingerprint TEXT,
    content_preview TEXT,
    embedding_vector VECTOR(768), -- Adjust dimension to match EMBEDDING_DIM
    model_name TEXT DEFAULT 'textembedding-gecko-001'
)
RETURNS VOID
LANGUAGE SQL
AS $$
    INSERT INTO embedding_cache (content_fingerprint, content_preview, embedding, embedding_model)
    VALUES (fingerprint, content_preview, embedding_vector, model_name)
    ON CONFLICT (content_fingerprint) DO UPDATE SET
        usage_count = embedding_cache.usage_count + 1,
        last_used_at = NOW();
$$;

-- Function to cleanup old cache entries (run periodically)
CREATE OR REPLACE FUNCTION cleanup_embedding_cache(
    days_old INTEGER DEFAULT 30,
    min_usage INTEGER DEFAULT 2
)
RETURNS INTEGER
LANGUAGE SQL
AS $$
    DELETE FROM embedding_cache 
    WHERE last_used_at < NOW() - INTERVAL days_old || ' days'
    AND usage_count < min_usage;
    
    SELECT row_count();
$$;
