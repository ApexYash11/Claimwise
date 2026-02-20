// API utilities for backend communication
import { supabase } from "./supabase"
import { createApiUrlWithLogging } from "./url-utils"
import { fetchWithTimeout } from "./fetch-with-timeout"

export interface PolicyAnalysisRequest {
  files: File[]
  userId: string
}

export interface PolicyAnalysisResponse {
  analysisId: string
  status: "processing" | "completed" | "error"
  results?: {
    policies: PolicySummary[]
    insights: string[]
    recommendations: string[]
  }
  error?: string
}

export interface PolicySummary {
  id: string
  fileName: string
  policyType: string
  provider: string
  coverageAmount: string
  premium: string
  deductible: string
  keyFeatures: string[]
  expirationDate: string
  rawAnalysis?: {
    coverage?: string
    exclusions?: string
    claim_process?: string
    claim_readiness_score?: number
    waiting_period?: string
    copay?: string
  }
}

const mapPolicyFromBackend = (policy: any): PolicySummary => {
  const analysis = policy?.validation_metadata?.analysis_result || {}
  return {
    id: policy.id,
    fileName: policy.policy_name || (policy.policy_number ? `Policy ${policy.policy_number}` : `Policy ${String(policy.id).slice(-8)}`),
    policyType: analysis.policy_type || policy.policy_type || "Unknown",
    provider: analysis.provider || policy.provider || "Unknown Provider",
    coverageAmount: analysis.coverage_amount || "Not specified",
    premium: analysis.premium || "Not specified",
    deductible: analysis.deductible || "Not specified",
    keyFeatures: Array.isArray(analysis.key_features) ? analysis.key_features : [],
    expirationDate: analysis.expiration_date || "Not specified",
    rawAnalysis: analysis,
  }
}

export const uploadPolicies = async (files: File[], userId: string): Promise<PolicyAnalysisResponse> => {
  const formData = new FormData()
  files.forEach((file, index) => {
    formData.append(`file_${index}`, file)
  })
  formData.append("user_id", userId)

  // Get Supabase JWT
  const session = await supabase.auth.getSession()
  const token = session.data.session?.access_token

  try {
    const apiUrl = createApiUrlWithLogging("/analyze-policy");
    const response = await fetchWithTimeout(apiUrl, {
      method: "POST",
      body: formData,
      headers: token ? { Authorization: `Bearer ${token}` } : undefined,
      timeoutMs: 15000,
    })

    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`)
    }

    return await response.json()
  } catch (error) {
    console.error("Error uploading policies:", error)
    throw error
  }
}

export const comparePolicies = async (policyIds: string[]): Promise<any> => {
  // Get Supabase JWT
  const session = await supabase.auth.getSession()
  const token = session.data.session?.access_token

  try {
    const apiUrl = createApiUrlWithLogging("/compare-policies");
    const response = await fetchWithTimeout(apiUrl, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        ...(token ? { Authorization: `Bearer ${token}` } : {}),
      },
      body: JSON.stringify({ policy_ids: policyIds }),
      timeoutMs: 15000,
    })

    if (!response.ok) {
      const errorText = await response.text()
      throw new Error(`HTTP error! status: ${response.status}, message: ${errorText}`)
    }

    return await response.json()
  } catch (error) {
    console.error("Error comparing policies:", error)
    throw error
  }
}

export const getPolicies = async (_userId?: string): Promise<PolicySummary[]> => {
  try {
    // Get Supabase JWT
    const session = await supabase.auth.getSession()
    const token = session.data.session?.access_token

    if (!token) {
      throw new Error("Not authenticated. Please log in.")
    }

    const apiUrl = createApiUrlWithLogging(`/policies`);
    const response = await fetchWithTimeout(apiUrl, {
      headers: { Authorization: `Bearer ${token}` },
      timeoutMs: 12000,
    })

    if (!response.ok) {
      const errorDetail = await response.text()
      throw new Error(`Failed to fetch policies: ${response.status} - ${errorDetail}`)
    }

    const data = await response.json()
    const backendPolicies = Array.isArray(data?.policies) ? data.policies : []
    return backendPolicies.map(mapPolicyFromBackend)
  } catch (error) {
    console.error("Error fetching policies:", error)
    // Re-throw to allow caller to handle the error
    throw error
  }
}

export const chatWithPolicies = async (message: string, policyIds: string[]): Promise<any> => {
  // Get Supabase JWT
  const session = await supabase.auth.getSession()
  const token = session.data.session?.access_token

  try {
    if (policyIds.length > 1 && !policyIds.includes("all")) {
      throw new Error("Multiple specific policy IDs are not supported in a single request. Select one policy or use 'all'.")
    }

    const isMultiPolicy = policyIds.length === 0 || policyIds.includes("all")
    const apiUrl = isMultiPolicy
      ? createApiUrlWithLogging("/chat-multiple")
      : createApiUrlWithLogging("/chat")

    const response = await fetchWithTimeout(apiUrl, {
      method: "POST",
      headers: {
        ...(token ? { Authorization: `Bearer ${token}` } : {}),
        "Content-Type": "application/json",
      },
      ...(isMultiPolicy
        ? { body: JSON.stringify({ question: message }) }
        : {
            body: JSON.stringify({
              question: message,
              policy_id: policyIds[0],
            }),
          }),
      timeoutMs: 15000,
    })

    if (!response.ok) {
      const errorText = await response.text()
      throw new Error(`HTTP error! status: ${response.status}, message: ${errorText}`)
    }

    return await response.json()
  } catch (error) {
    console.error("Error in chat:", error)
    throw error
  }
}

export interface HistoryActivity {
  id: string
  type: "upload" | "analysis" | "chat" | "comparison"
  title: string
  description: string
  timestamp: string
  status: "completed" | "processing" | "failed"
  details?: {
    filesProcessed?: number
    insightsGenerated?: number
    questionsAnswered?: number
    policiesCompared?: number
    policyId?: string
    chatType?: string
    analysisType?: string
  }
}

export interface HistoryResponse {
  activities: HistoryActivity[]
  stats: {
    totalActivities: number
    uploads: number
    analyses: number
    chats: number
    comparisons: number
    totalPolicies: number
  }
  policies: any[]
  pagination?: {
    page: number
    page_size: number
    has_more_activities: boolean
    has_more_chat_logs: boolean
    next_page: number | null
    total_activities: number
    total_chat_logs: number
  }
  success: boolean
}

export const getActivityHistory = async (): Promise<HistoryResponse> => {
  try {
    // Get Supabase JWT
    const session = await supabase.auth.getSession()
    const token = session.data.session?.access_token

    if (!token) {
      throw new Error("No authentication token available")
    }

    const apiUrl = createApiUrlWithLogging("/history");
    const response = await fetchWithTimeout(apiUrl, {
      method: "GET",
      headers: {
        "Authorization": `Bearer ${token}`,
        "Content-Type": "application/json",
      },
      timeoutMs: 12000,
    })

    if (!response.ok) {
      const errorText = await response.text()
      throw new Error(`HTTP error! status: ${response.status}, message: ${errorText}`)
    }

    const data = await response.json()
    return data
  } catch (error) {
    console.error("Error fetching activity history:", error)
    throw error
  }
}
