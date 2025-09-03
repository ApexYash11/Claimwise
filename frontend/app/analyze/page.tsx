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
import { ArrowLeft, BarChart3, FileText, MessageSquare, Eye, CheckCircle, Calendar, DollarSign, Shield, AlertCircle } from "lucide-react"
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
    const analyzeAllPolicies = async () => {
      setLoading(true)
      setError("")
      
      try {
        // Get Supabase JWT and user info
        const session = await supabase.auth.getSession()
        const token = session.data.session?.access_token
        const userId = session.data.session?.user?.id

        if (!session.data.session || !userId) {
          setError("Please log in to view your policies.")
          setLoading(false)
          return
        }

        // Clear any cached policy data
        if (typeof window !== "undefined") {
          localStorage.removeItem("claimwise_uploaded_policy_ids")
          localStorage.removeItem("claimwise_uploaded_policy_infos")
        }

        // Fetch all policies for this user directly from database
        const { data: policiesData, error: fetchError } = await supabase
          .from('policies')
          .select('id, policy_name, extracted_text, created_at, policy_number')
          .eq('user_id', userId)
          .order('created_at', { ascending: false })

        if (fetchError) {
          console.error('Database error:', fetchError)
          setError("Could not load policies from database.")
          setLoading(false)
          return
        }

        if (!policiesData || policiesData.length === 0) {
          setError("No policies found. Please upload some policies first.")
          setLoading(false)
          return
        }

        // Remove duplicates using multiple criteria (policy_name, policy_number, and content similarity)
        const uniquePolicies = []
        const seenKeys = new Set()
        
        for (const policy of policiesData) {
          // Create multiple keys to check for duplicates
          const nameKey = policy.policy_name?.toLowerCase().trim()
          const numberKey = policy.policy_number?.trim()
          const contentStart = policy.extracted_text?.substring(0, 100)?.toLowerCase().trim()
          
          // Create a composite key
          const compositeKey = `${nameKey}_${numberKey || 'no-number'}_${contentStart?.substring(0, 50) || 'no-content'}`
          
          if (!seenKeys.has(compositeKey)) {
            seenKeys.add(compositeKey)
            uniquePolicies.push(policy)
          } else {
            console.log('Skipping duplicate policy:', policy.policy_name, policy.policy_number)
          }
        }
        
        console.log(`Filtered ${policiesData.length} policies down to ${uniquePolicies.length} unique policies`)

        // Update localStorage with current policies
        const policyIds = uniquePolicies.map(p => p.id)
        localStorage.setItem("claimwise_uploaded_policy_ids", JSON.stringify(policyIds))

        // Analyze all unique policies in parallel
        const analysisPromises = uniquePolicies.map(async (policyData) => {
          try {
            const formData = new FormData();
            formData.append("policy_id", policyData.id);
            const response = await fetch(`${API_BASE_URL}/analyze-policy`, {
              method: "POST",
              headers: token ? { Authorization: `Bearer ${token}` } : undefined,
              body: formData,
            })
            
            if (!response.ok) {
              console.error(`Failed to analyze policy ${policyData.id}: ${response.status}`)
              // Create basic policy info if analysis fails - prioritize database name
              const displayName = policyData.policy_name || `Policy ${policyData.id.slice(0, 8)}`
              return {
                id: policyData.id,
                fileName: displayName,
                policyType: "Insurance",
                provider: "Analysis unavailable",
                coverageAmount: "Analysis unavailable",
                premium: "Analysis unavailable", 
                deductible: "Analysis unavailable",
                keyFeatures: ["Analysis failed - basic info only"],
                expirationDate: new Date(Date.now() + 365 * 24 * 60 * 60 * 1000).toISOString(),
                rawAnalysis: undefined
              }
            }
            
            const data = await response.json()
            if (data && data.analysis) {
              // Prioritize database policy name over LLM analysis
              const displayName = policyData.policy_name && policyData.policy_name !== "Test Policy" 
                ? policyData.policy_name
                : data.analysis.policy_number && data.analysis.policy_number !== "Not specified"
                  ? `Policy ${data.analysis.policy_number}`
                  : policyData.policy_name || `Policy ${policyData.id.slice(0, 8)}`
              
              return {
                id: policyData.id,
                fileName: displayName,
                policyType: data.analysis.policy_type || "Insurance",
                provider: data.analysis.provider || "Unknown Provider",
                coverageAmount: data.analysis.coverage_amount || "Not specified",
                premium: data.analysis.premium || "Not specified",
                deductible: data.analysis.deductible || "Not specified",
                keyFeatures: data.analysis.key_features || [data.analysis.coverage || "Basic coverage"],
                expirationDate: data.analysis.expiration_date || new Date(Date.now() + 365 * 24 * 60 * 60 * 1000).toISOString(),
                rawAnalysis: data.analysis
              }
            } else {
              // Fallback if no analysis data - prioritize database name
              const displayName = policyData.policy_name || `Policy ${policyData.id.slice(0, 8)}`
              return {
                id: policyData.id,
                fileName: displayName,
                policyType: "Insurance",
                provider: "Unknown Provider",
                coverageAmount: "Not specified",
                premium: "Not specified",
                deductible: "Not specified", 
                keyFeatures: ["Basic policy information"],
                expirationDate: new Date(Date.now() + 365 * 24 * 60 * 60 * 1000).toISOString(),
                rawAnalysis: undefined
              }
            }
          } catch (e) {
            console.error(`Error analyzing policy ${policyData.id}:`, e)
            // Handle errors - prioritize database name
            const displayName = policyData.policy_name || `Policy ${policyData.id.slice(0, 8)}`
            return {
              id: policyData.id,
              fileName: displayName,
              policyType: "Insurance", 
              provider: "Analysis error",
              coverageAmount: "Analysis error",
              premium: "Analysis error",
              deductible: "Analysis error",
              keyFeatures: ["Analysis failed"],
              expirationDate: new Date(Date.now() + 365 * 24 * 60 * 60 * 1000).toISOString(),
              rawAnalysis: undefined
            }
          }
        })

        // Wait for all analyses to complete
        const allPolicies = await Promise.all(analysisPromises)
        
        // Final deduplication pass after analysis - remove any remaining duplicates
        const finalUniquePolicies = []
        const finalSeenKeys = new Set()
        
        for (const policy of allPolicies) {
          // Use multiple criteria to ensure uniqueness
          const key1 = policy.fileName?.toLowerCase().trim()
          const key2 = policy.id
          const key3 = `${policy.provider}_${policy.coverageAmount}_${policy.premium}`.toLowerCase()
          
          const compositeKey = `${key1}_${key2}_${key3}`
          
          if (!finalSeenKeys.has(compositeKey) && !finalSeenKeys.has(key2)) {
            finalSeenKeys.add(compositeKey)
            finalSeenKeys.add(key2)
            finalUniquePolicies.push(policy)
          } else {
            console.log('Removing duplicate after analysis:', policy.fileName)
          }
        }
        
        console.log(`Final deduplication: ${allPolicies.length} → ${finalUniquePolicies.length} policies`)
        
        // Generate insights and recommendations
        const cleanInsights = generateInsights(finalUniquePolicies)
        const cleanRecommendations = generateRecommendations(finalUniquePolicies)
        
        setPolicies(finalUniquePolicies)
        setInsights(cleanInsights)
        setRecommendations(cleanRecommendations)
        
        // Set first policy as selected
        if (finalUniquePolicies.length > 0) {
          setSelectedPolicyId(finalUniquePolicies[0].id)
        }
        setSelectedPolicies([])
        
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
      <div className="min-h-screen bg-gradient-to-br from-gray-50 to-blue-50 dark:from-gray-950 dark:to-blue-950">
        <Header />

        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
          {/* Back Button */}
          <div className="mb-8">
            <Button variant="ghost" asChild className="text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white rounded-xl hover:bg-gray-100 dark:hover:bg-gray-800 transition-all duration-200">
              <Link href="/dashboard">
                <ArrowLeft className="w-4 h-4 mr-2" />
                Back to Dashboard
              </Link>
            </Button>
          </div>

          {/* Header with Policy Selector */}
          <div className="mb-12">
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-6 mb-6">
              <div>
                <div className="inline-flex items-center px-4 py-2 rounded-full bg-purple-50 border border-purple-200 text-purple-700 text-sm font-medium mb-4 dark:bg-purple-900/20 dark:border-purple-800 dark:text-purple-400">
                  <BarChart3 className="w-4 h-4 mr-2" />
                  AI Analysis
                </div>
                <h1 className="text-4xl lg:text-5xl font-bold text-gray-900 dark:text-white mb-4 tracking-tight">
                  Policy
                  <span className="text-transparent bg-gradient-to-r from-purple-600 to-blue-600 bg-clip-text block lg:inline lg:ml-3">
                    Analysis
                  </span>
                </h1>
                <p className="text-xl text-gray-600 dark:text-gray-300 leading-relaxed">
                  Review your insurance policies, compare coverage, and get AI-powered insights.
                </p>
              </div>
              
              {/* Policy Selector - Show only when there are multiple policies */}
              {policies.length > 1 && (
                <div className="flex flex-col sm:items-end">
                  <label className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">Select Policy to Analyze:</label>
                  <Select value={selectedPolicyId} onValueChange={setSelectedPolicyId}>
                    <SelectTrigger className="w-full sm:w-64 rounded-xl bg-white/80 dark:bg-gray-800/80 backdrop-blur-sm border-gray-200 dark:border-gray-700">
                      <SelectValue placeholder="Select a policy..." />
                    </SelectTrigger>
                    <SelectContent className="rounded-xl bg-white/95 dark:bg-gray-900/95 backdrop-blur-xl border-gray-200/50 dark:border-gray-700/50">
                      {policies.map((policy, index) => (
                        <SelectItem key={policy.id} value={policy.id}>
                          <div className="flex items-center space-x-2">
                            <Badge variant="outline" className="text-xs bg-gradient-to-r from-blue-50 to-purple-50 dark:from-blue-950/20 dark:to-purple-950/20 border-blue-200 dark:border-blue-800">
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
            <div className="text-center py-16 text-lg text-gray-500">Analyzing your policy...
              <div className="mt-4">
                <Button variant="outline" onClick={() => window.location.reload()}>
                  Refresh Page
                </Button>
              </div>
            </div>
          ) : error ? (
            <div className="text-center py-16 text-lg text-red-500">{error}</div>
          ) : (
            <>
              {/* AI Transparency Notice */}
              <div className="bg-amber-50/80 border border-amber-200 rounded-xl p-4 mb-6 shadow-sm dark:bg-amber-950/20 dark:border-amber-800/50">
                <div className="flex items-start gap-3">
                  <AlertCircle className="w-5 h-5 text-amber-600 dark:text-amber-400 flex-shrink-0 mt-0.5" />
                  <div>
                    <p className="text-sm font-medium text-amber-800 dark:text-amber-200 mb-1">
                      AI-Powered Analysis
                    </p>
                    <p className="text-sm text-amber-700 dark:text-amber-300">
                      Analysis and insights are AI-powered. Please confirm with your insurer before taking decisions.
                    </p>
                  </div>
                </div>
              </div>

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
            </>
          )}
        </div>
      </div>
    </ProtectedRoute>
  )
}
