-- Sprint 1.1: Add Performance Indexes
-- Run this in Supabase SQL Editor

CREATE INDEX IF NOT EXISTS idx_policies_user_id ON public.policies(user_id);
CREATE INDEX IF NOT EXISTS idx_policies_user_id_created_at ON public.policies(user_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_chat_logs_user_id ON public.chat_logs(user_id);
CREATE INDEX IF NOT EXISTS idx_chat_logs_user_id_timestamp ON public.chat_logs(user_id, "timestamp" DESC);
CREATE INDEX IF NOT EXISTS idx_comparisons_user_id ON public.comparisons(user_id);
CREATE INDEX IF NOT EXISTS idx_comparisons_user_id_created_at ON public.comparisons(user_id, created_at DESC);
-- Add created_at column to activities if missing (needed for indexing)
ALTER TABLE public.activities ADD COLUMN IF NOT EXISTS created_at TIMESTAMP WITH TIME ZONE DEFAULT now();
CREATE INDEX IF NOT EXISTS idx_activities_user_id ON public.activities(user_id);
CREATE INDEX IF NOT EXISTS idx_activities_user_id_created_at ON public.activities(user_id, created_at DESC);
