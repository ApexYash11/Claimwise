"use client"

import { useState, useEffect } from "react"
import { ProtectedRoute } from "@/components/auth/protected-route"
import { Header } from "@/components/layout/header"
import { PolicyCard } from "@/components/analysis/policy-card"
import { PolicyComparison } from "@/components/analysis/policy-comparison"
import { InsightsPanel } from "@/components/analysis/insights-panel"
import { Button } from "@/components/ui/button"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { ArrowLeft, BarChart3, FileText, MessageSquare, Eye, CheckCircle, Calendar, DollarSign, Shield } from "lucide-react"
import Link from "next/link"
import type { PolicySummary } from "@/lib/api"

// Dynamic policy data from backend/AI
import { supabase } from "@/lib/supabase"
const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000"

// Generate clean insights from policy data
const generateInsights = (policies: PolicySummary[]) => {
  const insights: string[] = []
  
  if (policies.length === 0) return insights
  
  // Premium analysis
  const validPremiums = policies.map(p => ({
    policy: p,
    amount: parseFloat(p.premium.replace(/[^0-9.]/g, "") || "0")
  })).filter(p => p.amount > 0)
  
  if (validPremiums.length >= 2) {
    const lowest = validPremiums.reduce((min, p) => p.amount < min.amount ? p : min)
    const highest = validPremiums.reduce((max, p) => p.amount > max.amount ? p : max)
    const savings = highest.amount - lowest.amount
    
    if (savings > 0) {
      insights.push(`You could save ₹${savings.toLocaleString('en-IN')} annually by switching to ${lowest.policy.provider} (${lowest.policy.fileName})`)
    }
  }
  
  // Coverage analysis  
  const validCoverage = policies.map(p => ({
    policy: p,
    amount: parseFloat(p.coverageAmount.replace(/[^0-9.]/g, "") || "0")
  })).filter(p => p.amount > 0)
  
  if (validCoverage.length >= 2) {
    const highest = validCoverage.reduce((max, p) => p.amount > max.amount ? p : max)
    const lowest = validCoverage.reduce((min, p) => p.amount < min.amount ? p : min)
    
    if (highest.amount > lowest.amount * 1.5) {
      insights.push(`${highest.policy.fileName} offers significantly higher coverage (₹${(highest.amount/100000).toFixed(1)}L vs ₹${(lowest.amount/100000).toFixed(1)}L)`)
    }
  }
  
  // Expiration warnings
  const expiringSoon = policies.filter(p => {
    const daysUntilExpiration = Math.ceil(
      (new Date(p.expirationDate).getTime() - new Date().getTime()) / (1000 * 3600 * 24)
    )
    return daysUntilExpiration <= 60
  })
  
  if (expiringSoon.length > 0) {
    if (expiringSoon.length === 1) {
      insights.push(`${expiringSoon[0].fileName} expires soon - start renewal process early to avoid coverage gaps`)
    } else {
      insights.push(`${expiringSoon.length} policies expire within 60 days - review renewal options`)
    }
  }
  
  // Provider diversity
  const providers = [...new Set(policies.map(p => p.provider))]
  if (providers.length === 1 && policies.length > 1) {
    insights.push(`All policies are with ${providers[0]} - consider diversifying providers for better rates and coverage`)
  }
  
  // Policy type coverage
  const policyTypes = [...new Set(policies.map(p => p.policyType))]
  if (policyTypes.includes("Health") && policyTypes.includes("Life")) {
    insights.push("Good coverage balance - you have both health and life insurance protection")
  }
  
  return insights
}

// Generate clean recommendations from policy data  
const generateRecommendations = (policies: PolicySummary[]) => {
  const recommendations: string[] = []
  
  if (policies.length === 0) return recommendations
  
  // Always include claim readiness
  const avgClaimScore = policies.reduce((sum, p) => {
    const score = p.rawAnalysis?.claim_readiness_score || 70
    return sum + score
  }, 0) / policies.length
  
  recommendations.push(`Overall claim readiness score: ${Math.round(avgClaimScore)}/100`)
  
  // Premium optimization
  const validPremiums = policies.filter(p => parseFloat(p.premium.replace(/[^0-9.]/g, "") || "0") > 0)
  if (validPremiums.length >= 2) {
    recommendations.push("Compare premium options annually during renewal to ensure competitive rates")
  }
  
  // Documentation recommendations
  recommendations.push("Keep all policy documents, ID proofs, and medical records organized for quick claim processing")
  
  // Coverage recommendations
  const hasHealth = policies.some(p => p.policyType.toLowerCase().includes("health"))
  const hasLife = policies.some(p => p.policyType.toLowerCase().includes("life"))
  
  if (!hasHealth) {
    recommendations.push("Consider adding health insurance for comprehensive medical coverage")
  }
  
  if (!hasLife) {
    recommendations.push("Consider life insurance to protect your family's financial future")
  }
  
  // Renewal recommendations
  const expiringSoon = policies.filter(p => {
    const daysUntilExpiration = Math.ceil(
      (new Date(p.expirationDate).getTime() - new Date().getTime()) / (1000 * 3600 * 24)
    )
    return daysUntilExpiration <= 90
  })
  
  if (expiringSoon.length > 0) {
    recommendations.push("Set calendar reminders 45-60 days before policy expiration for hassle-free renewal")
  }
  
  // Deductible optimization
  const highDeductibles = policies.filter(p => {
    const deductible = parseFloat(p.deductible.replace(/[^0-9.]/g, "") || "0")
    return deductible > 25000
  })
  
  if (highDeductibles.length > 0) {
    recommendations.push("Review high deductible policies - ensure you have sufficient emergency funds to cover deductibles")
  }
  
  return recommendations
}


export default function AnalyzePage() {
  const [policies, setPolicies] = useState<PolicySummary[]>([])
  const [insights, setInsights] = useState<string[]>([])
  const [recommendations, setRecommendations] = useState<string[]>([])
  const [selectedPolicies, setSelectedPolicies] = useState<string[]>([])
  const [selectedPolicyId, setSelectedPolicyId] = useState<string>("")
  const [activeTab, setActiveTab] = useState("analysis")
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState("")

  useEffect(() => {
    // Read all uploaded policy IDs from localStorage
    let policyIds: string[] = []
    if (typeof window !== "undefined") {
      const storedIds = localStorage.getItem("claimwise_uploaded_policy_ids")
      if (storedIds) {
        policyIds = JSON.parse(storedIds)
      } else {
        // Fallback: try to get single policy ID for backward compatibility
        const singleId = localStorage.getItem("claimwise_uploaded_policy_id")
        if (singleId) {
          policyIds = [singleId]
        }
      }
    }
    
    if (policyIds.length === 0) {
      setError("No uploaded policies found. Please upload policies first.")
      setLoading(false)
      return
    }

    const analyzeAllPolicies = async () => {
      setLoading(true)
      const allPolicies: any[] = []
      const allInsights: string[] = []
      const allRecommendations: string[] = []
      
      try {
        // Get Supabase JWT
        const session = await supabase.auth.getSession()
        const token = session.data.session?.access_token
        
        // Analyze all policies in parallel for faster loading
        const analysisPromises = policyIds.map(async (policyId) => {
          try {
            const formData = new FormData();
            formData.append("policy_id", policyId);
            const response = await fetch(`${API_BASE_URL}/analyze-policy`, {
              method: "POST",
              headers: token ? { Authorization: `Bearer ${token}` } : undefined,
              body: formData,
            })
            
            if (!response.ok) {
              console.error(`Failed to analyze policy ${policyId}: ${response.status}`)
              return null
            }
            
            const data = await response.json()
            if (data && data.analysis) {
              return { policyId, analysis: data.analysis }
            }
            return null
          } catch (e) {
            console.error(`Error analyzing policy ${policyId}:`, e)
            return null
          }
        })

        // Wait for all analyses to complete
        const results = await Promise.all(analysisPromises)
        
        // Process successful results
        results.forEach((result, index) => {
          if (result) {
            const { policyId, analysis } = result
            const policyData = {
              id: policyId,
              fileName: analysis.policy_number ? `Policy ${analysis.policy_number}` : `Uploaded Policy ${allPolicies.length + 1}`,
              policyType: analysis.policy_type || "Unknown Type",
              provider: analysis.provider || "Unknown Provider",
              coverageAmount: analysis.coverage_amount || "Not specified",
              premium: analysis.premium || "Not specified",
              deductible: analysis.deductible || "Not specified",
              keyFeatures: analysis.key_features || [
                analysis.coverage || "Coverage information unavailable"
              ],
              expirationDate: analysis.expiration_date || new Date(Date.now() + 365 * 24 * 60 * 60 * 1000).toISOString(),
              rawAnalysis: analysis // Store the full analysis
            }
            
            allPolicies.push(policyData)
          }
        })
        
        // Generate clean insights and recommendations from all policies
        const cleanInsights = generateInsights(allPolicies)
        const cleanRecommendations = generateRecommendations(allPolicies)
        
        if (allPolicies.length === 0) {
          setError("Could not extract details from any uploaded policies.")
        } else {
          setPolicies(allPolicies)
          setInsights(cleanInsights)
          setRecommendations(cleanRecommendations)
          // Set the first policy as selected by default for individual analysis
          setSelectedPolicyId(allPolicies[0].id)
          // Start with no policies selected for comparison - users must choose which ones to compare
          setSelectedPolicies([])
        }
      } catch (e) {
        console.error("Error loading policies:", e)
        setError("Could not load policy analysis.")
      } finally {
        setLoading(false)
      }
    }

    analyzeAllPolicies()
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
  const currentPolicy = policies.find((policy) => policy.id === selectedPolicyId)

  // Generate insights and recommendations for the currently selected policy only
  const generateSinglePolicyInsights = (policy: PolicySummary) => {
    const insights: string[] = []
    
    if (!policy) return insights
    
    // Expiration analysis
    const daysUntilExpiration = Math.ceil(
      (new Date(policy.expirationDate).getTime() - new Date().getTime()) / (1000 * 3600 * 24)
    )
    
    if (daysUntilExpiration <= 30) {
      insights.push(`Policy expires in ${daysUntilExpiration} days - urgent renewal required`)
    } else if (daysUntilExpiration <= 60) {
      insights.push(`Policy expires in ${daysUntilExpiration} days - start planning renewal`)
    } else {
      insights.push(`Policy valid for ${daysUntilExpiration} days - renewal timeline is comfortable`)
    }
    
    // Premium analysis
    const premium = parseFloat(policy.premium.replace(/[^0-9.]/g, "") || "0")
    if (premium > 0) {
      if (premium > 50000) {
        insights.push("High premium policy - consider comparing alternatives during renewal")
      } else if (premium < 10000) {
        insights.push("Cost-effective premium - good value for basic coverage")
      } else {
        insights.push("Moderate premium - balanced cost and coverage approach")
      }
    }
    
    // Coverage analysis
    const coverage = parseFloat(policy.coverageAmount.replace(/[^0-9.]/g, "") || "0")
    if (coverage > 0) {
      if (coverage >= 1000000) {
        insights.push("Excellent coverage amount - provides strong financial protection")
      } else if (coverage >= 500000) {
        insights.push("Good coverage amount - adequate for most scenarios")
      } else {
        insights.push("Basic coverage amount - consider increasing for better protection")
      }
    }
    
    // Provider analysis
    insights.push(`Policy provided by ${policy.provider} - research their claim settlement ratio and customer reviews`)
    
    return insights
  }

  const generateSinglePolicyRecommendations = (policy: PolicySummary) => {
    const recommendations: string[] = []
    
    if (!policy) return recommendations
    
    // Claim readiness
    const claimScore = policy.rawAnalysis?.claim_readiness_score || 70
    recommendations.push(`Claim readiness score: ${claimScore}/100`)
    
    if (claimScore < 80) {
      recommendations.push("Improve claim readiness by organizing required documents and understanding the claim process")
    }
    
    // Documentation
    recommendations.push("Keep policy documents, ID proofs, and relevant certificates easily accessible")
    
    // Contact information
    recommendations.push("Save insurer's claim helpline and customer service numbers in your phone")
    
    // Policy features
    if (policy.keyFeatures.length > 0) {
      recommendations.push("Review all policy features and exclusions to understand your coverage fully")
    }
    
    // Deductible guidance
    const deductible = parseFloat(policy.deductible.replace(/[^0-9.]/g, "") || "0")
    if (deductible > 0) {
      recommendations.push(`Maintain emergency funds to cover your ₹${deductible.toLocaleString('en-IN')} deductible`)
    }
    
    // Regular review
    recommendations.push("Review your coverage needs annually and compare policies during renewal")
    
    return recommendations
  }

  const currentPolicyInsights = currentPolicy ? generateSinglePolicyInsights(currentPolicy) : []
  const currentPolicyRecommendations = currentPolicy ? generateSinglePolicyRecommendations(currentPolicy) : []

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

          {/* Header with Policy Selector */}
          <div className="mb-8">
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-4">
              <div>
                <h1 className="text-3xl font-bold text-gray-900 mb-2">Policy Analysis</h1>
                <p className="text-lg text-gray-600">
                  Review your insurance policies, compare coverage, and get AI-powered insights.
                </p>
              </div>
              
              {/* Policy Selector - Show only when there are multiple policies */}
              {policies.length > 1 && (
                <div className="flex flex-col sm:items-end">
                  <label className="text-sm font-medium text-gray-700 mb-2">Select Policy to Analyze:</label>
                  <Select value={selectedPolicyId} onValueChange={setSelectedPolicyId}>
                    <SelectTrigger className="w-full sm:w-64">
                      <SelectValue placeholder="Select a policy..." />
                    </SelectTrigger>
                    <SelectContent>
                      {policies.map((policy, index) => (
                        <SelectItem key={policy.id} value={policy.id}>
                          <div className="flex items-center space-x-2">
                            <Badge variant="outline" className="text-xs">
                              {policy.policyType}
                            </Badge>
                            <span>{policy.fileName}</span>
                          </div>
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              )}
            </div>
          </div>

          {loading ? (
            <div className="text-center py-16 text-lg text-gray-500">Analyzing your policy...</div>
          ) : error ? (
            <div className="text-center py-16 text-lg text-red-500">{error}</div>
          ) : (
            <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-6">
              <TabsList className="grid w-full grid-cols-4 lg:w-auto lg:grid-cols-4">
                <TabsTrigger value="analysis" className="flex items-center space-x-2">
                  <Eye className="w-4 h-4" />
                  <span>Analysis</span>
                </TabsTrigger>
                <TabsTrigger value="overview" className="flex items-center space-x-2">
                  <FileText className="w-4 h-4" />
                  <span>All Policies</span>
                </TabsTrigger>
                <TabsTrigger value="compare" className="flex items-center space-x-2">
                  <BarChart3 className="w-4 h-4" />
                  <span>Compare ({selectedPolicies.length})</span>
                </TabsTrigger>
                <TabsTrigger value="insights" className="flex items-center space-x-2">
                  <MessageSquare className="w-4 h-4" />
                  <span>Smart Insights</span>
                </TabsTrigger>
              </TabsList>

              {/* Individual Policy Analysis Tab */}
              <TabsContent value="analysis" className="space-y-6">
                {currentPolicy ? (
                  <div className="space-y-6">
                    {/* Policy Summary Card */}
                    <Card className="border-2 border-blue-200 bg-gradient-to-r from-blue-50 to-indigo-50">
                      <CardHeader>
                        <CardTitle className="flex items-center space-x-3">
                          <div className="w-12 h-12 bg-blue-100 rounded-lg flex items-center justify-center">
                            <FileText className="w-6 h-6 text-blue-600" />
                          </div>
                          <div>
                            <h2 className="text-xl font-bold text-blue-900">{currentPolicy.fileName}</h2>
                            <Badge className="mt-1 bg-blue-200 text-blue-800">{currentPolicy.policyType}</Badge>
                          </div>
                        </CardTitle>
                      </CardHeader>
                      <CardContent>
                        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                          <div className="flex items-center space-x-3">
                            <div className="w-10 h-10 bg-white rounded-lg flex items-center justify-center">
                              <Shield className="w-5 h-5 text-blue-600" />
                            </div>
                            <div>
                              <p className="text-sm text-gray-600">Provider</p>
                              <p className="font-semibold text-gray-900">{currentPolicy.provider}</p>
                            </div>
                          </div>
                          <div className="flex items-center space-x-3">
                            <div className="w-10 h-10 bg-white rounded-lg flex items-center justify-center">
                              <DollarSign className="w-5 h-5 text-green-600" />
                            </div>
                            <div>
                              <p className="text-sm text-gray-600">Annual Premium</p>
                              <p className="font-semibold text-gray-900">{currentPolicy.premium}</p>
                            </div>
                          </div>
                          <div className="flex items-center space-x-3">
                            <div className="w-10 h-10 bg-white rounded-lg flex items-center justify-center">
                              <Shield className="w-5 h-5 text-purple-600" />
                            </div>
                            <div>
                              <p className="text-sm text-gray-600">Coverage</p>
                              <p className="font-semibold text-gray-900">{currentPolicy.coverageAmount}</p>
                            </div>
                          </div>
                          <div className="flex items-center space-x-3">
                            <div className="w-10 h-10 bg-white rounded-lg flex items-center justify-center">
                              <Calendar className="w-5 h-5 text-orange-600" />
                            </div>
                            <div>
                              <p className="text-sm text-gray-600">Expires</p>
                              <p className="font-semibold text-gray-900">
                                {new Date(currentPolicy.expirationDate).toLocaleDateString('en-IN')}
                              </p>
                            </div>
                          </div>
                        </div>
                      </CardContent>
                    </Card>

                    {/* Key Features */}
                    <Card>
                      <CardHeader>
                        <CardTitle className="flex items-center space-x-2">
                          <CheckCircle className="w-5 h-5 text-green-600" />
                          <span>Policy Features</span>
                        </CardTitle>
                      </CardHeader>
                      <CardContent>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                          {currentPolicy.keyFeatures.map((feature, index) => (
                            <div key={index} className="flex items-start space-x-3 p-3 bg-gray-50 rounded-lg">
                              <CheckCircle className="w-4 h-4 text-green-600 flex-shrink-0 mt-0.5" />
                              <span className="text-sm text-gray-700 font-medium">{feature}</span>
                            </div>
                          ))}
                        </div>
                      </CardContent>
                    </Card>

                    {/* Individual Policy Insights */}
                    <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                      <Card className="border-blue-200 bg-blue-50">
                        <CardHeader>
                          <CardTitle className="text-blue-900">Policy Analysis</CardTitle>
                        </CardHeader>
                        <CardContent className="space-y-3">
                          {currentPolicyInsights.map((insight, index) => (
                            <div key={index} className="flex items-start space-x-3 p-3 bg-white rounded-lg border border-blue-100">
                              <CheckCircle className="w-4 h-4 text-blue-600 flex-shrink-0 mt-0.5" />
                              <p className="text-sm text-gray-700 font-medium">{insight}</p>
                            </div>
                          ))}
                        </CardContent>
                      </Card>

                      <Card className="border-green-200 bg-green-50">
                        <CardHeader>
                          <CardTitle className="text-green-900">Recommendations</CardTitle>
                        </CardHeader>
                        <CardContent className="space-y-3">
                          {currentPolicyRecommendations.map((recommendation, index) => (
                            <div key={index} className="flex items-start space-x-3 p-3 bg-white rounded-lg border border-green-100">
                              <CheckCircle className="w-4 h-4 text-green-600 flex-shrink-0 mt-0.5" />
                              <p className="text-sm text-gray-700 font-medium">{recommendation}</p>
                            </div>
                          ))}
                        </CardContent>
                      </Card>
                    </div>
                  </div>
                ) : (
                  <div className="text-center py-16 text-lg text-gray-500">
                    No policy selected for analysis
                  </div>
                )}
              </TabsContent>

              {/* All Policies Overview Tab */}
              <TabsContent value="overview" className="space-y-6">
                <div className="mb-4">
                  <h3 className="text-lg font-semibold text-gray-900">All Uploaded Policies</h3>
                  <p className="text-gray-600">Overview of all your insurance policies</p>
                </div>
                <div className="grid grid-cols-1 lg:grid-cols-2 xl:grid-cols-3 gap-6">
                  {policies.map((policy) => (
                    <PolicyCard
                      key={policy.id || `policy-${Math.random()}`}
                      policy={policy}
                      onViewDetails={() => {
                        setSelectedPolicyId(policy.id)
                        setActiveTab("analysis")
                      }}
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

              {/* Smart Insights Tab - Overall insights across all policies */}
              <TabsContent value="insights" className="space-y-6">
                <div className="mb-4">
                  <h3 className="text-lg font-semibold text-gray-900">Smart Insights Across All Policies</h3>
                  <p className="text-gray-600">AI-powered analysis and recommendations for your entire portfolio</p>
                </div>
                <InsightsPanel insights={insights} recommendations={recommendations} />
              </TabsContent>
            </Tabs>
          )}
        </div>
      </div>
    </ProtectedRoute>
  )
}
