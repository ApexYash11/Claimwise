"use client"

import { useState } from "react"
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

// Mock data - in real app, this would come from API
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
      "Emergency room coverage",
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
    keyFeatures: [
      "Liability coverage",
      "Collision coverage",
      "Comprehensive coverage",
      "Uninsured motorist protection",
      "Roadside assistance",
    ],
    expirationDate: "2024-06-15",
  },
  {
    id: "3",
    fileName: "Home_Insurance_Policy.pdf",
    policyType: "Home",
    provider: "Allstate",
    coverageAmount: "$750,000",
    premium: "$3,200/year",
    deductible: "$2,000",
    keyFeatures: [
      "Dwelling protection",
      "Personal property coverage",
      "Liability protection",
      "Additional living expenses",
      "Natural disaster coverage",
    ],
    expirationDate: "2025-03-20",
  },
]

const mockInsights = [
  "Your health insurance premium is 15% higher than average for similar coverage in your area.",
  "There's a potential coverage gap between your auto and umbrella policies.",
  "Your home insurance policy expires in 4 months - consider shopping for better rates.",
  "You could save $600 annually by increasing your auto insurance deductible to $1,000.",
]

const mockRecommendations = [
  "Consider bundling your auto and home insurance with the same provider for potential discounts.",
  "Review your health insurance plan during open enrollment to explore lower-cost options.",
  "Add umbrella insurance to protect against liability claims exceeding your current coverage limits.",
  "Set up automatic payments for all policies to avoid late fees and potential coverage lapses.",
]

export default function AnalyzePage() {
  const [selectedPolicies, setSelectedPolicies] = useState<string[]>([])
  const [activeTab, setActiveTab] = useState("overview")

  const handleCompareToggle = (policyId: string) => {
    setSelectedPolicies((prev) =>
      prev.includes(policyId) ? prev.filter((id) => id !== policyId) : [...prev, policyId],
    )
  }

  const handleRemoveFromComparison = (policyId: string) => {
    setSelectedPolicies((prev) => prev.filter((id) => id !== policyId))
  }

  const selectedPolicyData = mockPolicies.filter((policy) => selectedPolicies.includes(policy.id))

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

          {/* Tabs */}
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
                {mockPolicies.map((policy) => (
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
              <InsightsPanel insights={mockInsights} recommendations={mockRecommendations} />
            </TabsContent>
          </Tabs>
        </div>
      </div>
    </ProtectedRoute>
  )
}
