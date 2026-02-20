-- RPC for vector similarity retrieval over document_chunks.
-- Expected params:
--   query_embedding vector(384)
--   limit_count integer
--   filter_policy_id uuid (optional)

CREATE EXTENSION IF NOT EXISTS vector;

CREATE OR REPLACE FUNCTION public.vector_search_document_chunks(
	query_embedding vector(384),
	limit_count integer DEFAULT 5,
	filter_policy_id uuid DEFAULT NULL
)
RETURNS TABLE (
	id bigint,
	policy_id uuid,
	chunk_index integer,
	content text,
	score double precision
)
LANGUAGE sql
STABLE
AS $$
	SELECT
		dc.id,
		dc.policy_id,
		dc.chunk_index,
		dc.content,
		1 - (dc.embedding <=> query_embedding) AS score
	FROM public.document_chunks dc
	WHERE dc.embedding IS NOT NULL
		AND (filter_policy_id IS NULL OR dc.policy_id = filter_policy_id)
	ORDER BY dc.embedding <=> query_embedding
	LIMIT GREATEST(COALESCE(limit_count, 5), 1);
$$;
