import { getSupabase } from "@/lib/get-supabase"
import { createApiUrlWithLogging } from "@/lib/url-utils"
import { fetchWithTimeout } from "@/lib/fetch-with-timeout"
import type { BackendPolicyRecord } from "@/types/policies"

export type { PolicySummary } from "@/types/policies"

export async function getPolicies() {
  const supabase = await getSupabase()
  const session = await supabase.auth.getSession()
  const token = session.data.session?.access_token

  if (!session.data.session) {
    throw new Error("Not authenticated")
  }

  const url = createApiUrlWithLogging("/policies")
  const response = await fetchWithTimeout(url, {
    headers: token ? { Authorization: `Bearer ${token}` } : undefined,
    timeoutMs: 12000,
  })

  if (!response.ok) {
    throw new Error(`Failed to fetch policies: ${response.statusText}`)
  }

  const payload = await response.json()
  const payloadRecord = payload as { policies?: BackendPolicyRecord[] }
  const backendPolicies = Array.isArray(payloadRecord?.policies) ? payloadRecord.policies : []

  return backendPolicies.map((p) => {
    const a = p?.validation_metadata?.analysis_result || {}
    return {
      id: p.id,
      fileName: p.policy_name || (p.policy_number ? `Policy ${p.policy_number}` : `Policy ${String(p.id).slice(0, 8)}`),
      policyType: a.policy_type || p.policy_type || "Insurance",
      provider: a.provider || p.provider || "Unknown Provider",
      coverageAmount: a.coverage_amount || "Not specified",
      premium: a.premium || "Not specified",
      deductible: a.deductible || "Not specified",
      keyFeatures: Array.isArray(a.key_features) ? a.key_features : [a.coverage || "Basic coverage"],
      expirationDate: a.expiration_date || "Not specified",
      rawAnalysis: a,
    }
  })
}
