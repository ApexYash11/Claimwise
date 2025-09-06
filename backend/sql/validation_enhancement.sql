-- Document Validation Enhancement Migration
-- Add validation fields to policies table for document validation tracking

-- Add validation columns to policies table
ALTER TABLE public.policies 
ADD COLUMN IF NOT EXISTS validation_score DECIMAL(3,2) DEFAULT 0.0,
ADD COLUMN IF NOT EXISTS document_type VARCHAR(50) DEFAULT 'unknown',
ADD COLUMN IF NOT EXISTS validation_metadata JSONB DEFAULT '{}';

-- Add comments for documentation
COMMENT ON COLUMN public.policies.validation_score IS 'Document validation confidence score (0.0 to 1.0)';
COMMENT ON COLUMN public.policies.document_type IS 'Classified document type (insurance_policy, medical_record, etc.)';
COMMENT ON COLUMN public.policies.validation_metadata IS 'Additional validation details and extracted fields';

-- Create index for better query performance
CREATE INDEX IF NOT EXISTS idx_policies_validation_score ON public.policies(validation_score);
CREATE INDEX IF NOT EXISTS idx_policies_document_type ON public.policies(document_type);

-- Update existing policies with default validation values
UPDATE public.policies 
SET validation_score = 0.5, 
    document_type = 'legacy_upload',
    validation_metadata = '{"legacy": true, "validated_after_upload": true}'
WHERE validation_score IS NULL OR validation_score = 0.0;
