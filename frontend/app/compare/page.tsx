"use client"

import { useState } from "react"
import { ProtectedRoute } from "@/components/auth/protected-route"
import { Header } from "@/components/layout/header"
import { PolicyComparison } from "@/components/analysis/policy-comparison"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { ArrowLeft, Plus } from "lucide-react"
import Link from "next/link"
import type { PolicySummary } from "@/lib/api"

// Mock data
const mockPolicies: PolicySummary[] = [
  {
    id: "1",
    fileName: "Health_Insurance_Policy.pdf",
    policyType: "Health",
    provider: "BlueCross BlueShield",
    coverageAmount: "$500,000",
    premium: "$2,400/year",
    deductible: "$1,500",
    keyFeatures: [
      "Comprehensive medical coverage",
      "Prescription drug coverage",
      "Mental health services",
      "Preventive care included",
    ],
    expirationDate: "2024-12-31",
  },
  {
    id: "2",
    fileName: "Auto_Insurance_Policy.pdf",
    policyType: "Auto",
    provider: "State Farm",
    coverageAmount: "$300,000",
    premium: "$1,800/year",
    deductible: "$500",
    keyFeatures: ["Liability coverage", "Collision coverage", "Comprehensive coverage", "Roadside assistance"],
    expirationDate: "2024-06-15",
  },
]

export default function ComparePage() {
  const [selectedPolicies, setSelectedPolicies] = useState<PolicySummary[]>(mockPolicies)

  const handleRemovePolicy = (policyId: string) => {
    setSelectedPolicies((prev) => prev.filter((policy) => policy.id !== policyId))
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
          <PolicyComparison policies={selectedPolicies} onRemovePolicy={handleRemovePolicy} />
        </div>
      </div>
    </ProtectedRoute>
  )
}
