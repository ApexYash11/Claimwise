-- Create document_chunks table with policy_id FK
-- This table stores RAG chunks indexed from uploaded policies

-- Drop existing table if it exists (with wrong schema)
DROP TABLE IF EXISTS public.document_chunks CASCADE;

-- Create the corrected table
CREATE TABLE public.document_chunks (
  id BIGSERIAL PRIMARY KEY,
  policy_id UUID NOT NULL REFERENCES public.policies(id) ON DELETE CASCADE,
  chunk_index INTEGER NOT NULL,
  content TEXT NOT NULL,
  embedding vector(384) DEFAULT NULL,
  content_fingerprint TEXT,
  embedding_cached_at TIMESTAMP DEFAULT now(),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  CONSTRAINT document_chunks_unique_per_policy UNIQUE(policy_id, chunk_index)
);

-- Create indexes for faster queries
CREATE INDEX idx_document_chunks_policy_id ON public.document_chunks(policy_id);
CREATE INDEX idx_document_chunks_created_at ON public.document_chunks(created_at);

-- Enable vector similarity search
CREATE INDEX idx_document_chunks_embedding ON public.document_chunks 
USING ivfflat (embedding vector_cosine_ops);
