"use client"

import { useState, useEffect } from "react"
import { ProtectedRoute } from "@/components/auth/protected-route"
import { Header } from "@/components/layout/header"
import { PolicyComparison } from "@/components/analysis/policy-comparison"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { ArrowLeft, Plus } from "lucide-react"
import Link from "next/link"
import type { PolicySummary } from "@/lib/api"
import { usePolicies } from "@/lib/use-queries"
import { PageWrapper } from "@/components/motion/page-wrapper"
import { Skeleton } from "@/components/ui/skeleton"
import type { BackendPolicyRecord } from "@/types/policies"

function mapPolicyFromBackend(policyData: BackendPolicyRecord): PolicySummary {
  const analysis = policyData?.validation_metadata?.analysis_result || {}
  return {
    id: policyData.id,
    fileName: policyData.policy_name || (policyData.policy_number ? `Policy ${policyData.policy_number}` : `Policy ${String(policyData.id).slice(0, 8)}`),
    policyType: analysis.policy_type || policyData.policy_type || "Insurance",
    provider: analysis.provider || policyData.provider || "Unknown Provider",
    coverageAmount: analysis.coverage_amount || "Not specified",
    premium: analysis.premium || "Not specified",
    deductible: analysis.deductible || "Not specified",
    keyFeatures: Array.isArray(analysis.key_features) ? analysis.key_features : [analysis.coverage || "Basic coverage"],
    expirationDate: analysis.expiration_date || "Not specified",
    rawAnalysis: analysis,
  }
}

export default function ComparePage() {
  const [selectedPolicies, setSelectedPolicies] = useState<PolicySummary[]>([])
  const { data: policiesData, isLoading } = usePolicies()

  useEffect(() => {
    if (policiesData?.policies?.length) {
      const mapped = policiesData.policies.map(mapPolicyFromBackend)
      setSelectedPolicies(mapped.slice(0, 2))
    }
  }, [policiesData])

  const handleRemovePolicy = (policyId: string) => {
    setSelectedPolicies((prev) => prev.filter((policy) => policy.id !== policyId))
  }

  if (isLoading) {
    return (
      <ProtectedRoute>
        <div className="min-h-screen bg-slate-50">
          <Header />
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
            <div className="space-y-4 p-8">
              <Skeleton className="h-8 w-64" />
              <Skeleton className="h-48" />
              <div className="grid grid-cols-2 gap-4">
                <Skeleton className="h-32" />
                <Skeleton className="h-32" />
              </div>
            </div>
          </div>
        </div>
      </ProtectedRoute>
    )
  }

  return (
    <ProtectedRoute>
      <div className="min-h-screen bg-slate-50 dark:bg-slate-950">
        <Header />

        <PageWrapper>
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          {/* Back Button */}
          <div className="mb-6">
            <Button variant="ghost" asChild className="text-slate-600 hover:text-slate-900 dark:text-slate-400 dark:hover:text-slate-100">
              <Link href="/analyze">
                <ArrowLeft className="w-4 h-4 mr-2" />
                Back to Analysis
              </Link>
            </Button>
          </div>

          {/* Header */}
          <div className="mb-8">
            <h1 className="text-3xl font-bold text-slate-900 dark:text-slate-50 mb-2">Compare Policies</h1>
            <p className="text-lg text-slate-600 dark:text-slate-400">
              Side-by-side comparison of your insurance policies to help you make informed decisions.
            </p>
          </div>

          {/* Add More Policies */}
          <Card className="mb-8 border-dashed border-2 border-slate-300 dark:border-slate-700">
            <CardHeader>
              <CardTitle className="flex items-center space-x-2">
                <Plus className="w-5 h-5" />
                <span>Add More Policies</span>
              </CardTitle>
              <CardDescription>Upload additional policies to compare more options</CardDescription>
            </CardHeader>
            <CardContent>
              <Button asChild>
                <Link href="/upload">Upload More Policies</Link>
              </Button>
            </CardContent>
          </Card>

          {/* Comparison */}
          {selectedPolicies.length >= 2 ? (
            <PolicyComparison policies={selectedPolicies} onRemovePolicy={handleRemovePolicy} />
          ) : (
            <Card className="text-center py-12">
              <CardContent>
                <h3 className="text-lg font-semibold mb-2 text-slate-900 dark:text-slate-50">No Policies to Compare</h3>
                <p className="text-slate-600 dark:text-slate-400 mb-4">
                  You need at least 2 policies to perform a comparison. Upload some policies to get started.
                </p>
                <Button asChild>
                  <Link href="/upload">Upload Policies</Link>
                </Button>
              </CardContent>
            </Card>
          )}
        </div>
        </PageWrapper>
      </div>
    </ProtectedRoute>
  )
}
