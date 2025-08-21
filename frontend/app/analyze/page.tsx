"use client"

import { useState, useEffect } from "react"
import { ProtectedRoute } from "@/components/auth/protected-route"
import { Header } from "@/components/layout/header"
import { PolicyCard } from "@/components/analysis/policy-card"
import { PolicyComparison } from "@/components/analysis/policy-comparison"
import { InsightsPanel } from "@/components/analysis/insights-panel"
import { Button } from "@/components/ui/button"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { ArrowLeft, BarChart3, FileText, MessageSquare } from "lucide-react"
import Link from "next/link"
import type { PolicySummary } from "@/lib/api"

// Dynamic policy data from backend/AI
import { supabase } from "@/lib/supabase"
const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000"


export default function AnalyzePage() {
  const [policies, setPolicies] = useState<PolicySummary[]>([])
  const [insights, setInsights] = useState<string[]>([])
  const [recommendations, setRecommendations] = useState<string[]>([])
  const [selectedPolicies, setSelectedPolicies] = useState<string[]>([])
  const [activeTab, setActiveTab] = useState("overview")
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState("")

  useEffect(() => {
    // Read uploaded policy_id from localStorage
    let policyId = null
    if (typeof window !== "undefined") {
      policyId = localStorage.getItem("claimwise_uploaded_policy_id")
    }
    if (!policyId) {
      setError("No uploaded policy found. Please upload a policy first.")
      setLoading(false)
      return
    }
    (async () => {
      setLoading(true)
      try {
        // Get Supabase JWT
        const session = await supabase.auth.getSession()
        const token = session.data.session?.access_token
        const formData = new FormData();
        formData.append("policy_id", policyId);
        const response = await fetch(`${API_BASE_URL}/analyze-policy`, {
          method: "POST",
          headers: token ? { Authorization: `Bearer ${token}` } : undefined,
          body: formData,
        })
        if (!response.ok) {
          throw new Error(`HTTP error! status: ${response.status}`)
        }
        const data = await response.json()
        if (data && data.analysis) {
          // Assume analysis contains all needed fields for PolicySummary
          setPolicies([data.analysis])
          setInsights(data.analysis.insights || [])
          setRecommendations(data.analysis.recommendations || [])
          setSelectedPolicies([data.analysis.id])
        } else {
          setError("Could not extract details from this policy.")
        }
      } catch (e) {
        setError("Could not extract details from this policy.")
      } finally {
        setLoading(false)
      }
    })()
  }, [])


  const handleCompareToggle = (policyId: string) => {
    setSelectedPolicies((prev) =>
      prev.includes(policyId) ? prev.filter((id) => id !== policyId) : [...prev, policyId],
    )
  }

  const handleRemoveFromComparison = (policyId: string) => {
    setSelectedPolicies((prev) => prev.filter((id) => id !== policyId))
  }

  const selectedPolicyData = policies.filter((policy) => selectedPolicies.includes(policy.id))

  return (
    <ProtectedRoute>
      <div className="min-h-screen bg-gray-50">
        <Header />

        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          {/* Back Button */}
          <div className="mb-6">
            <Button variant="ghost" asChild className="text-gray-600 hover:text-gray-900">
              <Link href="/dashboard">
                <ArrowLeft className="w-4 h-4 mr-2" />
                Back to Dashboard
              </Link>
            </Button>
          </div>

          {/* Header */}
          <div className="mb-8">
            <h1 className="text-3xl font-bold text-gray-900 mb-2">Policy Analysis</h1>
            <p className="text-lg text-gray-600">
              Review your insurance policies, compare coverage, and get AI-powered insights.
            </p>
          </div>

          {loading ? (
            <div className="text-center py-16 text-lg text-gray-500">Analyzing your policy...</div>
          ) : error ? (
            <div className="text-center py-16 text-lg text-red-500">{error}</div>
          ) : (
            <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-6">
              <TabsList className="grid w-full grid-cols-3 lg:w-auto lg:grid-cols-3">
                <TabsTrigger value="overview" className="flex items-center space-x-2">
                  <FileText className="w-4 h-4" />
                  <span>Overview</span>
                </TabsTrigger>
                <TabsTrigger value="compare" className="flex items-center space-x-2">
                  <BarChart3 className="w-4 h-4" />
                  <span>Compare ({selectedPolicies.length})</span>
                </TabsTrigger>
                <TabsTrigger value="insights" className="flex items-center space-x-2">
                  <MessageSquare className="w-4 h-4" />
                  <span>Insights</span>
                </TabsTrigger>
              </TabsList>

              {/* Overview Tab */}
              <TabsContent value="overview" className="space-y-6">
                <div className="grid grid-cols-1 lg:grid-cols-2 xl:grid-cols-3 gap-6">
                  {policies.map((policy) => (
                    <PolicyCard
                      key={policy.id}
                      policy={policy}
                      onCompare={() => handleCompareToggle(policy.id)}
                      isSelected={selectedPolicies.includes(policy.id)}
                    />
                  ))}
                </div>
              </TabsContent>

              {/* Compare Tab */}
              <TabsContent value="compare" className="space-y-6">
                <PolicyComparison policies={selectedPolicyData} onRemovePolicy={handleRemoveFromComparison} />
              </TabsContent>

              {/* Insights Tab */}
              <TabsContent value="insights" className="space-y-6">
                <InsightsPanel insights={insights} recommendations={recommendations} />
              </TabsContent>
            </Tabs>
          )}
        </div>
      </div>
    </ProtectedRoute>
  )
}
