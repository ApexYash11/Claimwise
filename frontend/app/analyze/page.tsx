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
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { ScrollArea } from "@/components/ui/scroll-area"
import { ResizableHandle, ResizablePanel, ResizablePanelGroup } from "@/components/ui/resizable"
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion"
import { Sheet, SheetContent, SheetDescription, SheetHeader, SheetTitle, SheetTrigger } from "@/components/ui/sheet"
import { Progress } from "@/components/ui/progress"
import { ArrowLeft, BarChart3, FileText, MessageSquare, Eye, CheckCircle, Calendar, DollarSign, Shield, AlertCircle, ChevronRight, FileJson, Trash2 } from "lucide-react"
import Link from "next/link"
import type { PolicySummary } from "@/lib/api"
import { cn } from "@/lib/utils"

// Dynamic policy data from backend/AI
import { supabase } from "@/lib/supabase"
import { createApiUrlWithLogging } from "@/lib/url-utils"

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
  
  recommendations.push(`Portfolio Average Claim Readiness: ${Math.round(avgClaimScore)}/100`)
  
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
            const analyzeUrl = createApiUrlWithLogging("/analyze-policy");
            const response = await fetch(analyzeUrl, {
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

  const handleDeletePolicy = async (e: React.MouseEvent, policyId: string) => {
    e.stopPropagation() // Prevent selecting the policy when clicking delete
    
    if (!policyId) {
      console.error("No policy ID provided for deletion")
      return
    }

    if (!confirm("Are you sure you want to delete this policy?")) return

    try {
      const session = await supabase.auth.getSession()
      const token = session.data.session?.access_token
      
      const deleteUrl = createApiUrlWithLogging(`/policies/${policyId}`)
      console.log(`Attempting to delete policy: ${policyId} at ${deleteUrl}`)
      
      const response = await fetch(deleteUrl, {
        method: "DELETE",
        headers: token ? { Authorization: `Bearer ${token}` } : undefined,
      })

      if (!response.ok) {
        let errorMessage = "Failed to delete policy"
        try {
          const errorData = await response.json()
          errorMessage = errorData.detail || errorMessage
        } catch (e) {
          // If not JSON, use status text
          errorMessage = `Error ${response.status}: ${response.statusText}`
        }
        throw new Error(errorMessage)
      }

      // Remove from local state
      const updatedPolicies = policies.filter(p => p.id !== policyId)
      setPolicies(updatedPolicies)
      
      // Update selection if needed
      if (selectedPolicyId === policyId) {
        setSelectedPolicyId(updatedPolicies.length > 0 ? updatedPolicies[0].id : "")
      }
      
      // Update localStorage
      const policyIds = updatedPolicies.map(p => p.id)
      localStorage.setItem("claimwise_uploaded_policy_ids", JSON.stringify(policyIds))
      
      console.log("Policy deleted successfully")
    } catch (err: any) {
      console.error("Delete error:", err)
      alert(err.message || "Failed to delete policy. Please try again.")
    }
  }

  const currentPolicyInsights = currentPolicy ? generateSinglePolicyInsights(currentPolicy) : []
  const currentPolicyRecommendations = currentPolicy ? generateSinglePolicyRecommendations(currentPolicy) : []

  return (
    <ProtectedRoute>
      <div className="h-screen flex flex-col bg-slate-50 dark:bg-slate-950 overflow-hidden">
        <Header />
        
        <main className="flex-1 overflow-hidden">
          {loading ? (
            <div className="flex items-center justify-center h-full">
              <div className="text-center space-y-4">
                <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-slate-900 mx-auto"></div>
                <p className="text-slate-500">Analyzing your policies...</p>
              </div>
            </div>
          ) : error ? (
            <div className="flex items-center justify-center h-full">
              <div className="text-center space-y-4 max-w-md mx-auto p-6 bg-white rounded-lg shadow-sm border border-red-100">
                <AlertCircle className="h-12 w-12 text-red-500 mx-auto" />
                <h3 className="text-lg font-medium text-slate-900">Analysis Error</h3>
                <p className="text-slate-500">{error}</p>
                <Button onClick={() => window.location.reload()}>Try Again</Button>
              </div>
            </div>
          ) : (
            <ResizablePanelGroup direction="horizontal" className="h-full border-t border-slate-200 dark:border-slate-800">
              
              {/* Left Panel: Policy List / Document Source */}
              <ResizablePanel defaultSize={25} minSize={20} maxSize={40} className="bg-white dark:bg-slate-900 border-r border-slate-200 dark:border-slate-800">
                <div className="h-full flex flex-col">
                  <div className="p-4 border-b border-slate-100 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-900/50">
                    <h2 className="font-serif font-semibold text-slate-900 dark:text-slate-100 flex items-center gap-2">
                      <FileText className="h-4 w-4 text-slate-500" />
                      Documents
                    </h2>
                  </div>
                  <ScrollArea className="flex-1">
                    <div className="p-3 space-y-2">
                      {policies.map((policy) => (
                        <div 
                          key={policy.id}
                          onClick={() => setSelectedPolicyId(policy.id)}
                          className={`p-3 rounded-md cursor-pointer transition-all border ${
                            selectedPolicyId === policy.id 
                              ? "bg-slate-100 border-slate-300 dark:bg-slate-800 dark:border-slate-700 shadow-sm" 
                              : "bg-white border-transparent hover:bg-slate-50 dark:bg-transparent dark:hover:bg-slate-800/50"
                          }`}
                        >
                          <div className="flex items-start justify-between mb-1">
                            <span className="font-medium text-sm text-slate-900 dark:text-slate-100 line-clamp-1">
                              {policy.fileName}
                            </span>
                            <div className="flex items-center gap-2">
                              {selectedPolicyId === policy.id && <CheckCircle className="h-3 w-3 text-teal-600 mt-1" />}
                              <button 
                                onClick={(e) => handleDeletePolicy(e, policy.id)}
                                className="text-slate-400 hover:text-red-500 transition-colors p-1"
                                title="Delete Policy"
                              >
                                <Trash2 className="h-3 w-3" />
                              </button>
                            </div>
                          </div>
                          <div className="flex items-center gap-2 text-xs text-slate-500">
                            <Badge variant="secondary" className="text-[10px] h-5 px-1.5 font-normal">
                              {policy.policyType}
                            </Badge>
                            <span>•</span>
                            <span>{policy.provider}</span>
                          </div>
                        </div>
                      ))}
                    </div>
                  </ScrollArea>
                  <div className="p-4 border-t border-slate-100 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-900/50">
                    <Button variant="outline" className="w-full text-xs h-8" asChild>
                      <Link href="/upload">
                        <ArrowLeft className="h-3 w-3 mr-2" /> Upload New
                      </Link>
                    </Button>
                  </div>
                </div>
              </ResizablePanel>

              <ResizableHandle />

              {/* Right Panel: Analysis Content */}
              <ResizablePanel defaultSize={75}>
                <div className="h-full flex flex-col bg-background">
                  {/* Toolbar */}
                  <div className="h-14 border-b bg-card flex items-center justify-between px-6">
                    <div className="flex items-center gap-4">
                      <h1 className="font-serif font-bold text-lg text-foreground">
                        {currentPolicy?.fileName || "Select a Policy"}
                      </h1>
                      {currentPolicy && (
                        <Badge variant="outline" className="bg-teal-50 text-teal-700 border-teal-200 dark:bg-teal-900/20 dark:text-teal-300 dark:border-teal-800">
                          Active Analysis
                        </Badge>
                      )}
                    </div>
                    <div className="flex items-center gap-2">
                      {currentPolicy && (
                        <Sheet>
                          <SheetTrigger asChild>
                            <Button variant="ghost" size="icon" title="View Raw Data">
                              <FileJson className="h-4 w-4 text-muted-foreground" />
                            </Button>
                          </SheetTrigger>
                          <SheetContent className="w-[400px] sm:w-[540px]">
                            <SheetHeader>
                              <SheetTitle>Policy Details</SheetTitle>
                              <SheetDescription>
                                Raw data extracted from the policy document.
                              </SheetDescription>
                            </SheetHeader>
                            <div className="mt-6 h-full overflow-hidden">
                              <ScrollArea className="h-[calc(100vh-120px)] w-full rounded-md border p-4 bg-muted/50">
                                <pre className="text-xs font-mono whitespace-pre-wrap break-words">
                                  {JSON.stringify(currentPolicy, null, 2)}
                                </pre>
                              </ScrollArea>
                            </div>
                          </SheetContent>
                        </Sheet>
                      )}
                      <Button variant="ghost" size="sm" onClick={() => handleCompareToggle(selectedPolicyId)}>
                        <BarChart3 className="h-4 w-4 mr-2" />
                        Compare
                      </Button>
                      <Button size="sm" className="bg-primary text-primary-foreground hover:bg-primary/90">
                        <MessageSquare className="h-4 w-4 mr-2" />
                        Ask AI
                      </Button>
                    </div>
                  </div>

                  {/* Content Area */}
                  <ScrollArea className="flex-1 p-6">
                    <div className="max-w-5xl mx-auto space-y-8 pb-20">
                      {currentPolicy ? (
                        <Tabs defaultValue="analysis" className="w-full">
                          <TabsList className="w-full justify-start border-b rounded-none bg-transparent h-auto p-0 mb-6">
                            <TabsTrigger 
                              value="analysis" 
                              className="rounded-none border-b-2 border-transparent data-[state=active]:border-primary data-[state=active]:bg-transparent px-4 py-2"
                            >
                              Analysis
                            </TabsTrigger>
                            <TabsTrigger 
                              value="insights" 
                              className="rounded-none border-b-2 border-transparent data-[state=active]:border-primary data-[state=active]:bg-transparent px-4 py-2"
                            >
                              Smart Insights
                            </TabsTrigger>
                          </TabsList>

                          <TabsContent value="analysis" className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-500">
                            {/* Key Metrics Grid - Refactored */}
                            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                              <div className="p-4 rounded-lg bg-muted/50 space-y-1">
                                <p className="text-xs font-medium text-muted-foreground uppercase tracking-wider">Premium</p>
                                <div className="text-xl font-mono font-semibold text-foreground">
                                  {(!currentPolicy.premium || currentPolicy.premium === "Not specified") ? (
                                    <span className="text-sm italic text-muted-foreground">Not specified</span>
                                  ) : (
                                    currentPolicy.premium
                                  )}
                                </div>
                                <p className="text-xs text-muted-foreground">Annual payment</p>
                              </div>
                              
                              <div className="p-4 rounded-lg bg-muted/50 space-y-1">
                                <p className="text-xs font-medium text-muted-foreground uppercase tracking-wider">Coverage</p>
                                <div className="text-xl font-mono font-semibold text-foreground">
                                  {(!currentPolicy.coverageAmount || currentPolicy.coverageAmount === "Not specified") ? (
                                    <span className="text-sm italic text-muted-foreground">Not specified</span>
                                  ) : (
                                    currentPolicy.coverageAmount
                                  )}
                                </div>
                                <p className="text-xs text-muted-foreground">Total sum insured</p>
                              </div>

                              <div className="p-4 rounded-lg bg-muted/50 space-y-1">
                                <p className="text-xs font-medium text-muted-foreground uppercase tracking-wider">Deductible</p>
                                <div className="text-xl font-mono font-semibold text-foreground">
                                  {(!currentPolicy.deductible || currentPolicy.deductible === "Not specified") ? (
                                    <span className="text-sm italic text-muted-foreground">Not specified</span>
                                  ) : (
                                    currentPolicy.deductible
                                  )}
                                </div>
                                <p className="text-xs text-muted-foreground">Out of pocket</p>
                              </div>
                            </div>

                            {/* Claim Readiness Score - New Visual */}
                            <Card className="border-none shadow-none bg-card">
                              <CardContent className="p-0 pt-2">
                                <div className="flex items-center justify-between mb-2">
                                  <div className="space-y-1">
                                    <h3 className="font-medium text-foreground">Claim Readiness Score</h3>
                                    <p className="text-xs text-muted-foreground">Based on document completeness</p>
                                  </div>
                                  <span className={cn(
                                    "text-2xl font-bold",
                                    (currentPolicy.rawAnalysis?.claim_readiness_score || 0) >= 75 ? "text-green-600" :
                                    (currentPolicy.rawAnalysis?.claim_readiness_score || 0) >= 40 ? "text-amber-600" : "text-red-600"
                                  )}>
                                    {currentPolicy.rawAnalysis?.claim_readiness_score || 0}/100
                                  </span>
                                </div>
                                <Progress 
                                  value={currentPolicy.rawAnalysis?.claim_readiness_score || 0} 
                                  className="h-2" 
                                />
                              </CardContent>
                            </Card>

                            {/* Accordion for Details - Progressive Disclosure */}
                            <Accordion type="single" collapsible defaultValue="features" className="w-full border rounded-lg bg-card px-4">
                              <AccordionItem value="features" className="border-b-0">
                                <AccordionTrigger className="text-base font-medium hover:no-underline py-4">Key Features & Inclusions</AccordionTrigger>
                                <AccordionContent>
                                  <ul className="grid grid-cols-1 md:grid-cols-2 gap-3 pb-4">
                                    {currentPolicy.keyFeatures.map((feature, i) => (
                                      <li key={i} className="flex items-start gap-3 text-sm text-muted-foreground">
                                        <CheckCircle className="h-5 w-5 text-teal-600 flex-shrink-0 mt-0.5" />
                                        <span>{feature}</span>
                                      </li>
                                    ))}
                                  </ul>
                                </AccordionContent>
                              </AccordionItem>

                              <AccordionItem value="exclusions" className="border-t">
                                <AccordionTrigger className="text-base font-medium hover:no-underline py-4">Exclusions & Limitations</AccordionTrigger>
                                <AccordionContent>
                                  <div className="text-sm text-muted-foreground leading-relaxed pb-4">
                                    {currentPolicy.rawAnalysis?.exclusions ? (
                                      <div className="whitespace-pre-line">{currentPolicy.rawAnalysis.exclusions}</div>
                                    ) : (
                                      <p className="italic">No specific exclusions detected in the summary analysis.</p>
                                    )}
                                  </div>
                                </AccordionContent>
                              </AccordionItem>

                              <AccordionItem value="waiting" className="border-t border-b-0">
                                <AccordionTrigger className="text-base font-medium hover:no-underline py-4">Waiting Periods</AccordionTrigger>
                                <AccordionContent>
                                  <div className="text-sm text-muted-foreground leading-relaxed pb-4">
                                    {/* Attempt to find waiting periods in raw analysis or show generic message */}
                                    {(currentPolicy.rawAnalysis as any)?.waiting_periods ? (
                                       <div className="whitespace-pre-line">{(currentPolicy.rawAnalysis as any).waiting_periods}</div>
                                    ) : (
                                      <p className="italic">Waiting periods not explicitly extracted. Please check the full policy document.</p>
                                    )}
                                  </div>
                                </AccordionContent>
                              </AccordionItem>
                            </Accordion>

                            {/* AI Insights - Refined to fit background */}
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-6 pt-4">
                              <Card className="bg-muted/30 border-none shadow-sm">
                                <CardHeader className="pb-2">
                                  <CardTitle className="font-serif text-lg flex items-center gap-2 text-foreground">
                                    <Shield className="h-5 w-5 text-primary/80" />
                                    Coverage Analysis
                                  </CardTitle>
                                </CardHeader>
                                <CardContent className="space-y-3">
                                  {currentPolicyInsights.map((insight, i) => (
                                    <p key={i} className="text-sm text-muted-foreground leading-relaxed">
                                      • {insight}
                                    </p>
                                  ))}
                                </CardContent>
                              </Card>

                              <Card className="bg-muted/30 border-none shadow-sm">
                                <CardHeader className="pb-2">
                                  <CardTitle className="font-serif text-lg flex items-center gap-2 text-foreground">
                                    <AlertCircle className="h-5 w-5 text-primary/80" />
                                    Recommendations
                                  </CardTitle>
                                </CardHeader>
                                <CardContent className="space-y-3">
                                  {currentPolicyRecommendations.map((rec, i) => (
                                    <p key={i} className="text-sm text-muted-foreground leading-relaxed">
                                      • {rec}
                                    </p>
                                  ))}
                                </CardContent>
                              </Card>
                            </div>
                          </TabsContent>

                          <TabsContent value="insights">
                            <InsightsPanel insights={currentPolicyInsights} recommendations={currentPolicyRecommendations} />
                          </TabsContent>
                        </Tabs>
                      ) : (
                        <div className="flex flex-col items-center justify-center h-[60vh] text-muted-foreground">
                          <FileText className="h-16 w-16 mb-4 opacity-20" />
                          <p className="text-lg font-medium">Select a policy to view analysis</p>
                          <p className="text-sm">Choose a document from the sidebar</p>
                        </div>
                      )}
                    </div>
                  </ScrollArea>
                </div>
              </ResizablePanel>
            </ResizablePanelGroup>
          )}
        </main>
      </div>
    </ProtectedRoute>
  )
}
