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
import { supabase } from "@/lib/supabase"

export default function ComparePage() {
  const [selectedPolicies, setSelectedPolicies] = useState<PolicySummary[]>([])
  const [isLoading, setIsLoading] = useState(true)

  useEffect(() => {
    fetchUserPolicies()
  }, [])

  const fetchUserPolicies = async () => {
    try {
      setIsLoading(true)
      const session = await supabase.auth.getSession()
      
      if (session.data.session) {
        const { data: policies, error } = await supabase
          .from('policies')
          .select('id, policy_name, extracted_text, created_at, policy_number')
          .eq('user_id', session.data.session.user.id)
          .order('created_at', { ascending: false })
          .limit(20) // Get more to account for duplicates

        if (error) throw error

        // Remove duplicates based on policy_name and policy_number (keep the latest one)
        const uniquePolicies = policies.reduce((acc, current) => {
          // Create a unique key based on policy_name and policy_number
          const key = `${current.policy_name}_${current.policy_number || 'no-number'}`
          const existing = acc.find(p => {
            const existingKey = `${p.policy_name}_${p.policy_number || 'no-number'}`
            return existingKey === key
          })
          
          if (!existing) {
            acc.push(current)
          } else if (new Date(current.created_at) > new Date(existing.created_at)) {
            // Replace with newer version
            const index = acc.indexOf(existing)
            acc[index] = current
          }
          return acc
        }, [] as typeof policies).slice(0, 10) // Take only 10 unique policies

        // Transform to match PolicySummary interface
        const formattedPolicies: PolicySummary[] = uniquePolicies.map(policy => ({
          id: policy.id,
          fileName: policy.policy_name,
          policyType: extractPolicyType(policy.extracted_text),
          provider: extractProvider(policy.extracted_text),
          coverageAmount: extractCoverage(policy.extracted_text),
          premium: extractPremium(policy.extracted_text),
          deductible: extractDeductible(policy.extracted_text),
          keyFeatures: extractFeatures(policy.extracted_text),
          expirationDate: extractExpirationDate(policy.extracted_text)
        }))

        // Auto-select first 2 policies for comparison if available
        setSelectedPolicies(formattedPolicies.slice(0, 2))
      }
    } catch (error) {
      console.error("Error fetching policies:", error)
    } finally {
      setIsLoading(false)
    }
  }

  // Simple extraction functions (could be enhanced with LLM)
  const extractPolicyType = (text: string | null): string => {
    if (!text) return "Unknown"
    const types = ["Health", "Auto", "Home", "Life", "Travel"]
    return types.find(type => text.toLowerCase().includes(type.toLowerCase())) || "General"
  }

  const extractBasicType = (fileName: string | null): string => {
    if (!fileName) return "Insurance"
    const name = fileName.toLowerCase()
    if (name.includes('health') || name.includes('medical')) return "Health"
    if (name.includes('auto') || name.includes('car') || name.includes('vehicle')) return "Auto"
    if (name.includes('home') || name.includes('house') || name.includes('property')) return "Home"
    if (name.includes('life') || name.includes('term')) return "Life"
    if (name.includes('travel') || name.includes('trip')) return "Travel"
    return "General"
  }

  const extractProvider = (text: string | null): string => {
    if (!text) return "Unknown Provider"
    // Look for common insurance company patterns
    const providers = ["BlueCross", "State Farm", "Geico", "Allstate", "Progressive", "Aetna", "Humana"]
    return providers.find(provider => text.toLowerCase().includes(provider.toLowerCase())) || "Unknown Provider"
  }

  const extractCoverage = (text: string | null): string => {
    if (!text) return "Not specified"
    const coverageMatch = text.match(/coverage[:\s]*\$?([0-9,]+(?:\.[0-9]{2})?)/i)
    return coverageMatch ? `$${coverageMatch[1]}` : "Not specified"
  }

  const extractPremium = (text: string | null): string => {
    if (!text) return "Not specified"
    const premiumMatch = text.match(/premium[:\s]*\$?([0-9,]+(?:\.[0-9]{2})?)/i)
    return premiumMatch ? `$${premiumMatch[1]}/year` : "Not specified"
  }

  const extractDeductible = (text: string | null): string => {
    if (!text) return "Not specified"
    const deductibleMatch = text.match(/deductible[:\s]*\$?([0-9,]+(?:\.[0-9]{2})?)/i)
    return deductibleMatch ? `$${deductibleMatch[1]}` : "Not specified"
  }

  const extractFeatures = (text: string | null): string[] => {
    if (!text) return []
    const features = []
    if (text.toLowerCase().includes("emergency")) features.push("Emergency Coverage")
    if (text.toLowerCase().includes("dental")) features.push("Dental Coverage")
    if (text.toLowerCase().includes("vision")) features.push("Vision Care")
    if (text.toLowerCase().includes("prescription")) features.push("Prescription Benefits")
    if (text.toLowerCase().includes("preventive")) features.push("Preventive Care")
    return features.length > 0 ? features : ["Standard Coverage"]
  }

  const extractExpirationDate = (text: string | null): string => {
    if (!text) return "Not specified"
    const dateMatch = text.match(/expir[a-z]*[:\s]*([0-9]{1,2}[-\/][0-9]{1,2}[-\/][0-9]{2,4})/i)
    return dateMatch ? dateMatch[1] : "Not specified"
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
