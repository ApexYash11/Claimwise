// API utilities for backend communication
const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000"

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
}

export const uploadPolicies = async (files: File[], userId: string): Promise<PolicyAnalysisResponse> => {
  const formData = new FormData()

  files.forEach((file, index) => {
    formData.append(`file_${index}`, file)
  })
  formData.append("user_id", userId)

  try {
    const response = await fetch(`${API_BASE_URL}/api/analyze-policies`, {
      method: "POST",
      body: formData,
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
    const response = await fetch(`${API_BASE_URL}/api/analysis/${analysisId}`)

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
    const response = await fetch(`${API_BASE_URL}/api/compare-policies`, {
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

export const chatWithPolicies = async (message: string, policyIds: string[]): Promise<any> => {
  try {
    const response = await fetch(`${API_BASE_URL}/api/chat`, {
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
