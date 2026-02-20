"use client"

import { useState, useEffect } from "react"
import { ProtectedRoute } from "@/components/auth/protected-route"
import { Header } from "@/components/layout/header"
import { PolicyComparison } from "@/components/analysis/policy-comparison"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { ArrowLeft, Plus, Loader2 } from "lucide-react"
import Link from "next/link"
import type { PolicySummary } from "@/lib/api"
import { getPolicies } from "@/lib/api"

export default function ComparePage() {
  const [selectedPolicies, setSelectedPolicies] = useState<PolicySummary[]>([])
  const [isLoading, setIsLoading] = useState(true)

  useEffect(() => {
    fetchUserPolicies()
  }, [])

  const fetchUserPolicies = async () => {
    try {
      setIsLoading(true)
      const policies = await getPolicies()
      setSelectedPolicies(policies.slice(0, 2))
    } catch (error) {
      console.error("Error fetching policies:", error)
    } finally {
      setIsLoading(false)
    }
  }

  const handleRemovePolicy = (policyId: string) => {
    setSelectedPolicies((prev) => prev.filter((policy) => policy.id !== policyId))
  }

  if (isLoading) {
    return (
      <ProtectedRoute>
        <div className="min-h-screen bg-gray-50">
          <Header />
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
            <div className="flex items-center justify-center h-64">
              <div className="flex items-center space-x-2">
                <Loader2 className="w-6 h-6 animate-spin" />
                <span>Loading your policies...</span>
              </div>
            </div>
          </div>
        </div>
      </ProtectedRoute>
    )
  }

  return (
    <ProtectedRoute>
      <div className="min-h-screen bg-gray-50">
        <Header />

        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          {/* Back Button */}
          <div className="mb-6">
            <Button variant="ghost" asChild className="text-gray-600 hover:text-gray-900">
              <Link href="/analyze">
                <ArrowLeft className="w-4 h-4 mr-2" />
                Back to Analysis
              </Link>
            </Button>
          </div>

          {/* Header */}
          <div className="mb-8">
            <h1 className="text-3xl font-bold text-gray-900 mb-2">Compare Policies</h1>
            <p className="text-lg text-gray-600">
              Side-by-side comparison of your insurance policies to help you make informed decisions.
            </p>
          </div>

          {/* Add More Policies */}
          <Card className="mb-8 border-dashed border-2 border-gray-300">
            <CardHeader>
              <CardTitle className="flex items-center space-x-2">
                <Plus className="w-5 h-5" />
                <span>Add More Policies</span>
              </CardTitle>
              <CardDescription>Upload additional policies to compare more options</CardDescription>
            </CardHeader>
            <CardContent>
              <Button asChild className="bg-blue-600 hover:bg-blue-700">
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
                <h3 className="text-lg font-semibold mb-2">No Policies to Compare</h3>
                <p className="text-gray-600 mb-4">
                  You need at least 2 policies to perform a comparison. Upload some policies to get started.
                </p>
                <Button asChild>
                  <Link href="/upload">Upload Policies</Link>
                </Button>
              </CardContent>
            </Card>
          )}
        </div>
      </div>
    </ProtectedRoute>
  )
}
