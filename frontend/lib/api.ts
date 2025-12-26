// API utilities for backend communication
import { supabase } from "./supabase"
import { createApiUrlWithLogging } from "./url-utils"

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
    const response = await fetch(apiUrl, {
      method: "POST",
      body: formData,
      headers: token ? { Authorization: `Bearer ${token}` } : undefined,
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

export const getAnalysisStatus = async (analysisId: string): Promise<PolicyAnalysisResponse> => {
  try {
    const apiUrl = createApiUrlWithLogging(`/analysis/${analysisId}`);
    const response = await fetch(apiUrl)

    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`)
    }

    return await response.json()
  } catch (error) {
    console.error("Error getting analysis status:", error)
    throw error
  }
}

export const comparePolicies = async (policyIds: string[]): Promise<any> => {
  try {
    const apiUrl = createApiUrlWithLogging("/compare-policies");
    const response = await fetch(apiUrl, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ policy_ids: policyIds }),
    })

    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`)
    }

    return await response.json()
  } catch (error) {
    console.error("Error comparing policies:", error)
    throw error
  }
}

export const getPolicies = async (userId: string): Promise<PolicySummary[]> => {
  // This would typically fetch from your backend
  // For now, returning empty array since we don't have this endpoint implemented
  try {
    // Get Supabase JWT
    const session = await supabase.auth.getSession()
    const token = session.data.session?.access_token

    const apiUrl = createApiUrlWithLogging(`/api/policies/${userId}`);
    const response = await fetch(apiUrl, {
      headers: token ? { Authorization: `Bearer ${token}` } : undefined,
    })

    if (!response.ok) {
      return []
    }

    return await response.json()
  } catch (error) {
    console.error("Error fetching policies:", error)
    return []
  }
}

export const chatWithPolicies = async (message: string, policyIds: string[]): Promise<any> => {
  try {
    const apiUrl = createApiUrlWithLogging("/api/chat");
    const response = await fetch(apiUrl, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        message,
        policy_ids: policyIds,
      }),
    })

    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`)
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
  success: boolean
}

export const getActivityHistory = async (): Promise<HistoryResponse> => {
  try {
    console.log("DEBUG: Starting getActivityHistory request")
    // Get Supabase JWT
    const session = await supabase.auth.getSession()
    const token = session.data.session?.access_token

    console.log("DEBUG: Token available:", !!token)
    if (!token) {
      throw new Error("No authentication token available")
    }

    const apiUrl = createApiUrlWithLogging("/history");
    console.log("DEBUG: Making request to:", apiUrl);
    const response = await fetch(apiUrl, {
      method: "GET",
      headers: {
        "Authorization": `Bearer ${token}`,
        "Content-Type": "application/json",
      },
    })

    console.log("DEBUG: Response status:", response.status)
    if (!response.ok) {
      const errorText = await response.text()
      console.log("DEBUG: Error response:", errorText)
      throw new Error(`HTTP error! status: ${response.status}`)
    }

    const data = await response.json()
    console.log("DEBUG: Successfully received data:", data)
    return data
  } catch (error) {
    console.error("Error fetching activity history:", error)
    throw error
  }
}
