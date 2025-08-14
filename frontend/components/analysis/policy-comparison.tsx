"use client"

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { CheckCircle, X, AlertTriangle, TrendingUp, TrendingDown } from "lucide-react"
import type { PolicySummary } from "@/lib/api"

interface PolicyComparisonProps {
  policies: PolicySummary[]
  onRemovePolicy: (policyId: string) => void
}

export function PolicyComparison({ policies, onRemovePolicy }: PolicyComparisonProps) {
  if (policies.length === 0) {
    return (
      <Card className="border-2 border-dashed border-gray-300">
        <CardContent className="p-8 text-center">
          <p className="text-gray-500">Select policies to compare them side by side</p>
        </CardContent>
      </Card>
    )
  }

  const compareValues = (field: keyof PolicySummary) => {
    const values = policies.map((p) => p[field])
    // Simple comparison logic - in real app, this would be more sophisticated
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

  return (
    <div className="space-y-6">
      {/* Comparison Header */}
      <div className="flex items-center justify-between">
        <h2 className="text-2xl font-bold text-gray-900">Policy Comparison</h2>
        <p className="text-gray-600">Comparing {policies.length} policies</p>
      </div>

      {/* Comparison Table */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {policies.map((policy) => (
          <Card key={policy.id} className="border-2 border-gray-200">
            <CardHeader className="pb-3">
              <div className="flex items-start justify-between">
                <div>
                  <CardTitle className="text-lg font-semibold text-gray-900">{policy.fileName}</CardTitle>
                  <Badge className="mt-1 bg-blue-100 text-blue-800">{policy.policyType}</Badge>
                </div>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => onRemovePolicy(policy.id)}
                  className="text-gray-400 hover:text-red-600"
                >
                  <X className="w-4 h-4" />
                </Button>
              </div>
            </CardHeader>

            <CardContent className="space-y-4">
              {/* Provider */}
              <div>
                <p className="text-sm font-medium text-gray-500">Provider</p>
                <p className="text-lg font-semibold text-gray-900">{policy.provider}</p>
              </div>

              {/* Premium with Comparison */}
              <div>
                <p className="text-sm font-medium text-gray-500">Premium</p>
                <div className="flex items-center space-x-2">
                  <p className="text-lg font-semibold text-gray-900">{policy.premium}</p>
                  {(() => {
                    const comparison = getPremiumComparison(
                      policy.premium,
                      policies.map((p) => p.premium),
                    )
                    if (comparison === "lowest") {
                      return (
                        <Badge className="bg-green-100 text-green-800">
                          <TrendingDown className="w-3 h-3 mr-1" />
                          Lowest
                        </Badge>
                      )
                    }
                    if (comparison === "highest") {
                      return (
                        <Badge className="bg-red-100 text-red-800">
                          <TrendingUp className="w-3 h-3 mr-1" />
                          Highest
                        </Badge>
                      )
                    }
                    return null
                  })()}
                </div>
              </div>

              {/* Coverage Amount */}
              <div>
                <p className="text-sm font-medium text-gray-500">Coverage</p>
                <p className="text-lg font-semibold text-gray-900">{policy.coverageAmount}</p>
              </div>

              {/* Deductible */}
              <div>
                <p className="text-sm font-medium text-gray-500">Deductible</p>
                <p className="text-lg font-semibold text-gray-900">{policy.deductible}</p>
              </div>

              {/* Expiration */}
              <div>
                <p className="text-sm font-medium text-gray-500">Expires</p>
                <div className="flex items-center space-x-2">
                  <p className="font-medium text-gray-900">{new Date(policy.expirationDate).toLocaleDateString()}</p>
                  {(() => {
                    const daysUntilExpiration = Math.ceil(
                      (new Date(policy.expirationDate).getTime() - new Date().getTime()) / (1000 * 3600 * 24),
                    )
                    if (daysUntilExpiration <= 30) {
                      return (
                        <Badge variant="destructive" className="text-xs">
                          <AlertTriangle className="w-3 h-3 mr-1" />
                          Soon
                        </Badge>
                      )
                    }
                    return null
                  })()}
                </div>
              </div>

              {/* Key Features */}
              <div>
                <p className="text-sm font-medium text-gray-500 mb-2">Key Features</p>
                <div className="space-y-1">
                  {policy.keyFeatures.slice(0, 4).map((feature, index) => (
                    <div key={index} className="flex items-start space-x-2">
                      <CheckCircle className="w-3 h-3 text-green-600 flex-shrink-0 mt-0.5" />
                      <p className="text-sm text-gray-700">{feature}</p>
                    </div>
                  ))}
                  {policy.keyFeatures.length > 4 && (
                    <p className="text-xs text-gray-500 pl-5">+{policy.keyFeatures.length - 4} more</p>
                  )}
                </div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Comparison Insights */}
      <Card className="bg-blue-50 border-blue-200">
        <CardHeader>
          <CardTitle className="text-lg text-blue-900">Comparison Insights</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            <div className="flex items-start space-x-2">
              <CheckCircle className="w-4 h-4 text-blue-600 flex-shrink-0 mt-0.5" />
              <p className="text-sm text-blue-800">
                The lowest premium option could save you {(() => {
                  const premiums = policies.map((p) => Number.parseFloat(p.premium.replace(/[^0-9.]/g, "")))
                  const savings = Math.max(...premiums) - Math.min(...premiums)
                  return `$${savings.toFixed(0)}`
                })()} annually compared to the highest.
              </p>
            </div>
            <div className="flex items-start space-x-2">
              <CheckCircle className="w-4 h-4 text-blue-600 flex-shrink-0 mt-0.5" />
              <p className="text-sm text-blue-800">
                All policies provide similar core coverage - consider premium and deductible differences.
              </p>
            </div>
            <div className="flex items-start space-x-2">
              <AlertTriangle className="w-4 h-4 text-orange-600 flex-shrink-0 mt-0.5" />
              <p className="text-sm text-orange-800">
                {policies.filter((p) => {
                  const daysUntilExpiration = Math.ceil(
                    (new Date(p.expirationDate).getTime() - new Date().getTime()) / (1000 * 3600 * 24),
                  )
                  return daysUntilExpiration <= 30
                }).length > 0
                  ? "Some policies are expiring soon - consider renewal timing."
                  : "All policies have adequate time before expiration."}
              </p>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
