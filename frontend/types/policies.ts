export interface PolicyAnalysisResult {
  policy_type?: string
  provider?: string
  coverage_amount?: string
  premium?: string
  deductible?: string
  key_features?: string[]
  expiration_date?: string
  coverage?: string
  exclusions?: string
  claim_process?: string
  claim_readiness_score?: number
  waiting_period?: string
  copay?: string
}

export interface PolicyValidationMetadata {
  analysis_result?: PolicyAnalysisResult
}

export interface BackendPolicyRecord {
  id: string
  policy_name?: string
  policy_number?: string
  policy_type?: string
  provider?: string
  validation_metadata?: PolicyValidationMetadata
}
