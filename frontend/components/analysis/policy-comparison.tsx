"use client"

import { useState, useEffect } from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { CheckCircle, X, AlertTriangle, TrendingUp, TrendingDown, DollarSign, Shield, BarChart3, ChevronUp, ChevronDown, AlertCircle } from "lucide-react"
import type { PolicySummary } from "@/lib/api"
import { supabase } from "@/lib/supabase"

interface PolicyComparisonProps {
  policies: PolicySummary[]
  onRemovePolicy: (policyId: string) => void
}

export function PolicyComparison({ policies, onRemovePolicy }: PolicyComparisonProps) {
  const [expandedFeatures, setExpandedFeatures] = useState<{ [key: string]: boolean }>({})
  const [comparisonPerformed, setComparisonPerformed] = useState(false)

  // Call backend comparison API when policies are compared
  useEffect(() => {
    if (policies.length >= 2 && !comparisonPerformed) {
      performComparison()
    }
  }, [policies, comparisonPerformed])

  const performComparison = async () => {
    try {
      // Call backend to store comparison
      const session = await supabase.auth.getSession()
      const token = session.data.session?.access_token
      
      if (token && policies.length >= 2) {
        const response = await fetch(`${process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000"}/compare-policies`, {
          method: "POST",
          headers: {
            "Content-Type": "application/x-www-form-urlencoded",
            "Authorization": `Bearer ${token}`
          },
          body: new URLSearchParams({
            policy_1_id: policies[0].id,
            policy_2_id: policies[1].id
          })
        })
        
        if (response.ok) {
          console.log("Comparison stored successfully")
          setComparisonPerformed(true)
          // Trigger dashboard stats refresh
          if (typeof window !== "undefined") {
            window.dispatchEvent(new Event("stats:refresh"))
          }
        }
      }
    } catch (error) {
      console.error("Error performing comparison:", error)
    }
  }

  // Format currency in Indian format
  const formatIndianCurrency = (amount: string) => {
    if (!amount || amount === 'Not specified') return amount
    
    // Extract numeric value
    const numericValue = amount.replace(/[^0-9.]/g, '')
    if (!numericValue) return amount
    
    const number = parseFloat(numericValue)
    if (isNaN(number)) return amount
    
    // Format in Indian numbering system
    return `₹${number.toLocaleString('en-IN')}`
  }

  const toggleFeatures = (policyId: string) => {
    setExpandedFeatures(prev => ({
      ...prev,
      [policyId]: !prev[policyId]
    }))
  }

  const compareValues = (field: keyof PolicySummary) => {
    const values = policies.map((p) => p[field])
    return values
  }

  const getPremiumComparison = (premium: string, allPremiums: string[]) => {
    const numericPremiums = allPremiums.map((p) => Number.parseFloat(p.replace(/[^0-9.]/g, "")))
    const currentPremium = Number.parseFloat(premium.replace(/[^0-9.]/g, ""))
    const minPremium = Math.min(...numericPremiums)
    const maxPremium = Math.max(...numericPremiums)

    if (currentPremium === minPremium) return "lowest"
    if (currentPremium === maxPremium) return "highest"
    return "middle"
  }

  if (policies.length === 0) {
    return (
      <Card className="border-2 border-dashed border-blue-300 bg-blue-50">
        <CardContent className="p-12 text-center">
          <div className="space-y-4">
            <div className="w-16 h-16 mx-auto bg-blue-100 rounded-full flex items-center justify-center">
              <CheckCircle className="w-8 h-8 text-blue-600" />
            </div>
            <div>
              <h3 className="text-lg font-semibold text-blue-900 mb-2">No Policies Selected for Comparison</h3>
              <p className="text-blue-700 mb-4">
                Go to the <strong>Overview</strong> tab and click <strong>"Compare"</strong> on the policies you want to compare side by side.
              </p>
              <Badge className="bg-blue-200 text-blue-800">
                💡 Tip: Select 2-3 policies to see the best comparison insights
              </Badge>
            </div>
          </div>
        </CardContent>
      </Card>
    )
  }

  return (
    <div className="space-y-6">
      {/* Comparison Header */}
      <div className="flex items-center justify-between">
        <h2 className="text-2xl font-bold text-gray-900 dark:text-gray-100">Policy Comparison</h2>
        <p className="text-gray-600 dark:text-gray-300">Comparing {policies.length} policies</p>
      </div>

      {/* AI Transparency Notice */}
      <div className="bg-amber-50/80 border border-amber-200 rounded-xl p-4 shadow-sm dark:bg-amber-950/20 dark:border-amber-800/50">
        <div className="flex items-start gap-3">
          <AlertCircle className="w-5 h-5 text-amber-600 dark:text-amber-400 flex-shrink-0 mt-0.5" />
          <div>
            <p className="text-sm font-medium text-amber-800 dark:text-amber-200 mb-1">
              AI-Powered Comparison
            </p>
            <p className="text-sm text-amber-700 dark:text-amber-300">
              Comparison insights are AI-powered. Please confirm with your insurer before taking decisions.
            </p>
          </div>
        </div>
      </div>

      {/* Enhanced Comparison Content */}
      <div className="space-y-8">
        {/* Quick Comparison Summary */}
        <Card className="bg-gradient-to-r from-indigo-50 to-blue-50 border-indigo-200 dark:from-gray-900 dark:to-gray-950 dark:border-gray-700">
          <CardHeader>
            <CardTitle className="text-xl text-indigo-900 dark:text-indigo-200 flex items-center">
              <BarChart3 className="w-6 h-6 mr-2" />
              Quick Comparison Overview
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              {/* Best Premium */}
              <div className="text-center p-4 bg-white rounded-lg border border-green-200 dark:bg-gray-900 dark:border-green-900">
                <div className="text-sm text-gray-600 dark:text-gray-300 mb-1">Best Premium</div>
                <div className="text-xl font-bold text-green-600 dark:text-green-400">
                  {(() => {
                    const validPremiums = policies.map(p => ({ 
                      policy: p, 
                      amount: parseFloat(p.premium.replace(/[^0-9.]/g, "") || "0") 
                    })).filter(p => p.amount > 0)
                    if (validPremiums.length === 0) return "N/A"
                    const lowest = validPremiums.reduce((min, p) => p.amount < min.amount ? p : min)
                    return formatIndianCurrency(lowest.amount.toString())
                  })()}
                </div>
                <div className="text-xs text-gray-500 dark:text-gray-400">
                  {(() => {
                    const validPremiums = policies.map(p => ({ 
                      policy: p, 
                      amount: parseFloat(p.premium.replace(/[^0-9.]/g, "") || "0") 
                    })).filter(p => p.amount > 0)
                    if (validPremiums.length === 0) return ""
                    const lowest = validPremiums.reduce((min, p) => p.amount < min.amount ? p : min)
                    return lowest.policy.provider
                  })()}
                </div>
              </div>
              
              {/* Highest Coverage */}
              <div className="text-center p-4 bg-white rounded-lg border border-blue-200 dark:bg-gray-900 dark:border-blue-900">
                <div className="text-sm text-gray-600 dark:text-gray-300 mb-1">Highest Coverage</div>
                <div className="text-xl font-bold text-blue-600 dark:text-blue-400">
                  {(() => {
                    const validCoverage = policies.map(p => ({ 
                      policy: p, 
                      amount: parseFloat(p.coverageAmount.replace(/[^0-9.]/g, "") || "0") 
                    })).filter(p => p.amount > 0)
                    if (validCoverage.length === 0) return "N/A"
                    const highest = validCoverage.reduce((max, p) => p.amount > max.amount ? p : max)
                    return `₹${(highest.amount / 100000).toFixed(1)}L`
                  })()}
                </div>
                <div className="text-xs text-gray-500 dark:text-gray-400">
                  {(() => {
                    const validCoverage = policies.map(p => ({ 
                      policy: p, 
                      amount: parseFloat(p.coverageAmount.replace(/[^0-9.]/g, "") || "0") 
                    })).filter(p => p.amount > 0)
                    if (validCoverage.length === 0) return ""
                    const highest = validCoverage.reduce((max, p) => p.amount > max.amount ? p : max)
                    return highest.policy.provider
                  })()}
                </div>
              </div>

              {/* Best Value */}
              <div className="text-center p-4 bg-white rounded-lg border border-purple-200 dark:bg-gray-900 dark:border-purple-900">
                <div className="text-sm text-gray-600 dark:text-gray-300 mb-1">Best Value Score</div>
                <div className="text-xl font-bold text-purple-600 dark:text-purple-400">
                  {(() => {
                    // Calculate value score (coverage/premium ratio)
                    const scores = policies.map(p => {
                      const premium = parseFloat(p.premium.replace(/[^0-9.]/g, "") || "0")
                      const coverage = parseFloat(p.coverageAmount.replace(/[^0-9.]/g, "") || "0")
                      return { policy: p, score: premium > 0 ? coverage / premium : 0 }
                    }).filter(s => s.score > 0)
                    
                    if (scores.length === 0) return "N/A"
                    const best = scores.reduce((max, s) => s.score > max.score ? s : max)
                    return `${(best.score).toFixed(0)}x`
                  })()}
                </div>
                <div className="text-xs text-gray-500 dark:text-gray-400">Coverage/Premium Ratio</div>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Detailed Side-by-Side Comparison */}
        <Card className="dark:bg-gray-900 dark:border-gray-700">
          <CardHeader>
            <CardTitle className="text-lg text-gray-900 dark:text-gray-100">Detailed Policy Comparison</CardTitle>
          </CardHeader>
          <CardContent className="p-0">
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead className="bg-gray-50 dark:bg-gray-800">
                  <tr>
                    <th className="text-left p-4 font-medium text-gray-900 dark:text-gray-100 border-b dark:border-gray-700">Feature</th>
                    {policies.map((policy) => (
                      <th key={policy.id} className="text-center p-4 font-medium text-gray-900 dark:text-gray-100 border-b dark:border-gray-700 min-w-[200px]">
                        <div className="space-y-2">
                          <div className="font-semibold">{policy.fileName}</div>
                          <Badge className="bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200">{policy.policyType}</Badge>
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => onRemovePolicy(policy.id)}
                            className="text-gray-400 hover:text-red-600 dark:hover:text-red-400 ml-2"
                          >
                            <X className="w-3 h-3" />
                          </Button>
                        </div>
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {/* Provider Row */}
                  <tr className="border-b bg-white dark:bg-gray-900 dark:border-gray-700">
                    <td className="p-4 font-medium text-gray-900 dark:text-gray-100 bg-gray-50 dark:bg-gray-800">Provider</td>
                    {policies.map((policy) => (
                      <td key={`${policy.id}-provider`} className="p-4 text-center">
                        <div className="font-semibold text-gray-900 dark:text-gray-100">{policy.provider}</div>
                      </td>
                    ))}
                  </tr>

                  {/* Premium Row with Comparison */}
                  <tr className="border-b bg-gray-25 dark:bg-gray-800 dark:border-gray-700">
                    <td className="p-4 font-medium text-gray-900 dark:text-gray-100 bg-gray-50 dark:bg-gray-800">Annual Premium</td>
                    {policies.map((policy) => {
                      const comparison = getPremiumComparison(policy.premium, policies.map((p) => p.premium))
                      return (
                        <td key={`${policy.id}-premium`} className="p-4 text-center">
                          <div className="space-y-2">
                            <div className="text-lg font-bold text-gray-900 dark:text-gray-100">{formatIndianCurrency(policy.premium)}</div>
                            {comparison === "lowest" && (
                              <Badge className="bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200">
                                <TrendingDown className="w-3 h-3 mr-1" />
                                Best Price
                              </Badge>
                            )}
                            {comparison === "highest" && (
                              <Badge className="bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200">
                                <TrendingUp className="w-3 h-3 mr-1" />
                                Highest
                              </Badge>
                            )}
                          </div>
                        </td>
                      )
                    })}
                  </tr>

                  {/* Coverage Amount Row */}
                  <tr className="border-b bg-white dark:bg-gray-900 dark:border-gray-700">
                    <td className="p-4 font-medium text-gray-900 dark:text-gray-100 bg-gray-50 dark:bg-gray-800">Coverage Amount</td>
                    {policies.map((policy) => (
                      <td key={`${policy.id}-coverage`} className="p-4 text-center">
                        <div className="text-lg font-bold text-blue-600 dark:text-blue-400">{formatIndianCurrency(policy.coverageAmount)}</div>
                      </td>
                    ))}
                  </tr>

                  {/* Deductible Row */}
                  <tr className="border-b bg-gray-25 dark:bg-gray-800 dark:border-gray-700">
                    <td className="p-4 font-medium text-gray-900 dark:text-gray-100 bg-gray-50 dark:bg-gray-800">Deductible</td>
                    {policies.map((policy) => (
                      <td key={`${policy.id}-deductible`} className="p-4 text-center">
                        <div className="text-lg font-semibold text-gray-900 dark:text-gray-100">{formatIndianCurrency(policy.deductible)}</div>
                      </td>
                    ))}
                  </tr>

                  {/* Expiration Row */}
                  <tr className="border-b bg-white dark:bg-gray-900 dark:border-gray-700">
                    <td className="p-4 font-medium text-gray-900 dark:text-gray-100 bg-gray-50 dark:bg-gray-800">Expiration Date</td>
                    {policies.map((policy) => (
                      <td key={`${policy.id}-expiration`} className="p-4 text-center">
                        <div className="space-y-2">
                          <div className="font-medium text-gray-900 dark:text-gray-100">
                            {new Date(policy.expirationDate).toLocaleDateString('en-IN')}
                          </div>
                          {(() => {
                            const daysUntilExpiration = Math.ceil(
                              (new Date(policy.expirationDate).getTime() - new Date().getTime()) / (1000 * 3600 * 24),
                            )
                            if (daysUntilExpiration <= 30) {
                              return (
                                <Badge variant="destructive" className="text-xs">
                                  <AlertTriangle className="w-3 h-3 mr-1" />
                                  {daysUntilExpiration} days left
                                </Badge>
                              )
                            }
                            return <div className="text-xs text-gray-500 dark:text-gray-400">{daysUntilExpiration} days left</div>
                          })()}
                        </div>
                      </td>
                    ))}
                  </tr>

                  {/* Key Features Comparison */}
                  <tr className="border-b bg-gray-25 dark:bg-gray-800 dark:border-gray-700">
                    <td className="p-4 font-medium text-gray-900 dark:text-gray-100 bg-gray-50 dark:bg-gray-800 align-top">Key Features</td>
                    {policies.map((policy) => (
                      <td key={`${policy.id}-features`} className="p-4 align-top">
                        <div className="space-y-2">
                          {policy.keyFeatures.slice(0, expandedFeatures[policy.id] ? undefined : 4).map((feature, index) => (
                            <div key={index} className="flex items-start space-x-2">
                              <CheckCircle className="w-3 h-3 text-green-600 flex-shrink-0 mt-1" />
                              <span className="text-sm text-gray-700 dark:text-gray-200">{feature}</span>
                            </div>
                          ))}
                          {policy.keyFeatures.length > 4 && (
                            <button
                              onClick={() => toggleFeatures(policy.id)}
                              className="text-xs text-blue-600 hover:text-blue-800 dark:text-blue-300 dark:hover:text-blue-200 font-medium flex items-center space-x-1"
                            >
                              {expandedFeatures[policy.id] ? (
                                <>
                                  <ChevronUp className="w-3 h-3" />
                                  <span>Show less</span>
                                </>
                              ) : (
                                <>
                                  <ChevronDown className="w-3 h-3" />
                                  <span>+{policy.keyFeatures.length - 4} more features</span>
                                </>
                              )}
                            </button>
                          )}
                        </div>
                      </td>
                    ))}
                  </tr>
                </tbody>
              </table>
            </div>
          </CardContent>
        </Card>

        {/* Value Comparison Chart */}
        <Card className="dark:bg-gray-900 dark:border-gray-700">
          <CardHeader>
            <CardTitle className="text-lg text-gray-900 dark:text-gray-100 flex items-center">
              <BarChart3 className="w-5 h-5 mr-2" />
              Value Analysis
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {policies.map((policy, index) => {
                const premium = parseFloat(policy.premium.replace(/[^0-9.]/g, "") || "0")
                const coverage = parseFloat(policy.coverageAmount.replace(/[^0-9.]/g, "") || "0")
                const valueScore = premium > 0 ? (coverage / premium) : 0
                const maxValue = Math.max(...policies.map(p => {
                  const prem = parseFloat(p.premium.replace(/[^0-9.]/g, "") || "0")
                  const cov = parseFloat(p.coverageAmount.replace(/[^0-9.]/g, "") || "0")
                  return prem > 0 ? cov / prem : 0
                }))
                const widthPercent = maxValue > 0 ? (valueScore / maxValue) * 100 : 0

                return (
                  <div key={policy.id} className="space-y-2">
                    <div className="flex items-center justify-between">
                      <div className="font-medium text-gray-900 dark:text-gray-100">{policy.fileName}</div>
                      <div className="text-sm text-gray-600 dark:text-gray-300">Score: {valueScore.toFixed(1)}x</div>
                    </div>
                    <div className="w-full bg-gray-200 dark:bg-gray-800 rounded-full h-3">
                      <div
                        className={`h-3 rounded-full transition-all duration-1000 ${
                          index === 0 ? 'bg-blue-500' : 
                          index === 1 ? 'bg-green-500' : 
                          index === 2 ? 'bg-purple-500' : 'bg-orange-500'
                        }`}
                        style={{ width: `${widthPercent}%` }}
                      />
                    </div>
                  </div>
                )
              })}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Comparison Insights */}
      {policies.length >= 2 && (
        <Card className="bg-gradient-to-r from-blue-50 to-indigo-50 border-blue-200 dark:from-gray-900 dark:to-gray-950 dark:border-gray-700">
          <CardHeader>
            <CardTitle className="text-lg text-blue-900 dark:text-blue-200 flex items-center">
              <TrendingUp className="w-5 h-5 mr-2" />
              Smart Comparison Insights
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {/* Premium Savings Analysis */}
              {(() => {
                const premiums = policies.map((p) => Number.parseFloat(p.premium.replace(/[^0-9.]/g, "") || "0"))
                const validPremiums = premiums.filter(p => p > 0)
                if (validPremiums.length >= 2) {
                  const minPremium = Math.min(...validPremiums)
                  const maxPremium = Math.max(...validPremiums)
                  const savings = maxPremium - minPremium
                  const lowestPolicy = policies[premiums.indexOf(minPremium)]
                  
                  return (
                    <div className="bg-white p-4 rounded-lg border border-blue-200 dark:bg-gray-900 dark:border-blue-900">
                      <h4 className="font-semibold text-blue-900 dark:text-blue-200 mb-2 flex items-center">
                        <DollarSign className="w-4 h-4 mr-1" />
                        Premium Analysis
                      </h4>
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
                        <div className="flex items-center space-x-2">
                          <TrendingDown className="w-4 h-4 text-green-600 dark:text-green-400" />
                          <span>
                            <strong>{lowestPolicy.fileName}</strong> offers the lowest premium at <strong>{formatIndianCurrency(lowestPolicy.premium)}</strong>
                          </span>
                        </div>
                        <div className="flex items-center space-x-2">
                          <TrendingUp className="w-4 h-4 text-red-600 dark:text-red-400" />
                          <span>
                            Potential annual savings: <strong className="text-green-600 dark:text-green-400">{formatIndianCurrency(savings.toString())}</strong>
                          </span>
                        </div>
                      </div>
                    </div>
                  )
                }
                return null
              })()}

              {/* Coverage Comparison */}
              <div className="bg-white p-4 rounded-lg border border-blue-200 dark:bg-gray-900 dark:border-blue-900">
                <h4 className="font-semibold text-blue-900 dark:text-blue-200 mb-2 flex items-center">
                  <Shield className="w-4 h-4 mr-1" />
                  Coverage Analysis
                </h4>
                <div className="space-y-2 text-sm">
                  {(() => {
                    const providers = [...new Set(policies.map(p => p.provider))]
                    const policyTypes = [...new Set(policies.map(p => p.policyType))]
                    
                    return (
                      <>
                        <div className="flex items-center space-x-2">
                          <CheckCircle className="w-4 h-4 text-blue-600 dark:text-blue-400" />
                          <span>
                            Comparing <strong>{policies.length} policies</strong> from <strong>{providers.length} provider{providers.length !== 1 ? 's' : ''}</strong>
                            {providers.length > 1 ? ` (${providers.join(', ')})` : ` (${providers[0]})`}
                          </span>
                        </div>
                        {policyTypes.length > 1 && (
                          <div className="flex items-center space-x-2">
                            <AlertTriangle className="w-4 h-4 text-orange-600 dark:text-orange-400" />
                            <span>
                              Note: Comparing different policy types ({policyTypes.join(', ')}) - ensure coverage needs align
                            </span>
                          </div>
                        )}
                      </>
                    )
                  })()}
                </div>
              </div>

              {/* Expiration Warnings */}
              {(() => {
                const expiringSoon = policies.filter((p) => {
                  const daysUntilExpiration = Math.ceil(
                    (new Date(p.expirationDate).getTime() - new Date().getTime()) / (1000 * 3600 * 24)
                  )
                  return daysUntilExpiration <= 60
                })
                
                if (expiringSoon.length > 0) {
                  return (
                    <div className="bg-orange-50 p-4 rounded-lg border border-orange-200 dark:bg-orange-950 dark:border-orange-900">
                      <h4 className="font-semibold text-orange-900 dark:text-orange-200 mb-2 flex items-center">
                        <AlertTriangle className="w-4 h-4 mr-1" />
                        Renewal Timeline
                      </h4>
                      <p className="text-sm text-orange-800 dark:text-orange-200">
                        {expiringSoon.length === 1 
                          ? `${expiringSoon[0].fileName} expires soon` 
                          : `${expiringSoon.length} policies expire within 60 days`
                        } - Consider renewal timing when making decisions.
                      </p>
                    </div>
                  )
                }
                return null
              })()}
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  )
}
