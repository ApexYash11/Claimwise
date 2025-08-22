"use client"

import { useState } from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { FileText, Calendar, DollarSign, Shield, AlertTriangle, CheckCircle, ChevronDown, ChevronUp } from "lucide-react"
import type { PolicySummary } from "@/lib/api"

interface PolicyCardProps {
  policy: PolicySummary
  onViewDetails?: () => void
  onCompare?: () => void
  isSelected?: boolean
}

export function PolicyCard({ policy, onViewDetails, onCompare, isSelected }: PolicyCardProps) {
  const [showAllFeatures, setShowAllFeatures] = useState(false)
  
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
  
  const getPolicyTypeColor = (type: string | undefined | null) => {
    if (!type) return "bg-gray-100 text-gray-800"
    
    switch (type.toLowerCase()) {
      case "health":
        return "bg-green-100 text-green-800"
      case "auto":
        return "bg-blue-100 text-blue-800"
      case "home":
        return "bg-orange-100 text-orange-800"
      case "life":
        return "bg-purple-100 text-purple-800"
      default:
        return "bg-gray-100 text-gray-800"
    }
  }

  const isExpiringSoon = () => {
    if (!policy.expirationDate) return false
    
    const expirationDate = new Date(policy.expirationDate)
    const today = new Date()
    const daysUntilExpiration = Math.ceil((expirationDate.getTime() - today.getTime()) / (1000 * 3600 * 24))
    return daysUntilExpiration <= 30
  }

  return (
    <Card
      className={`border-2 transition-all hover:shadow-lg ${isSelected ? "border-blue-500 bg-blue-50" : "border-gray-200"}`}
    >
      <CardHeader className="pb-3">
        <div className="flex items-start justify-between">
          <div className="flex items-center space-x-3">
            <div className="w-10 h-10 bg-blue-100 rounded-lg flex items-center justify-center">
              <FileText className="w-5 h-5 text-blue-600" />
            </div>
            <div>
              <CardTitle className="text-lg font-semibold text-gray-900">{policy.fileName || 'Unknown Policy'}</CardTitle>
              <div className="flex items-center space-x-2 mt-1">
                <Badge className={getPolicyTypeColor(policy.policyType)}>{policy.policyType || 'Unknown Type'}</Badge>
                {isExpiringSoon() && (
                  <Badge variant="destructive" className="text-xs">
                    <AlertTriangle className="w-3 h-3 mr-1" />
                    Expiring Soon
                  </Badge>
                )}
              </div>
            </div>
          </div>
        </div>
      </CardHeader>

      <CardContent className="space-y-4">
        {/* Provider and Coverage */}
        <div className="grid grid-cols-2 gap-4">
          <div>
            <p className="text-sm text-gray-500">Provider</p>
            <p className="font-medium text-gray-900">{policy.provider || 'Unknown Provider'}</p>
          </div>
          <div>
            <p className="text-sm text-gray-500">Coverage Amount</p>
            <p className="font-medium text-gray-900">{formatIndianCurrency(policy.coverageAmount || 'Not specified')}</p>
          </div>
        </div>

        {/* Premium and Deductible */}
        <div className="grid grid-cols-2 gap-4">
          <div className="flex items-center space-x-2">
            <DollarSign className="w-4 h-4 text-green-600" />
            <div>
              <p className="text-sm text-gray-500">Premium</p>
              <p className="font-medium text-gray-900">{formatIndianCurrency(policy.premium || 'Not specified')}</p>
            </div>
          </div>
          <div className="flex items-center space-x-2">
            <Shield className="w-4 h-4 text-blue-600" />
            <div>
              <p className="text-sm text-gray-500">Deductible</p>
              <p className="font-medium text-gray-900">{formatIndianCurrency(policy.deductible || 'Not specified')}</p>
            </div>
          </div>
        </div>

        {/* Expiration Date */}
        <div className="flex items-center space-x-2">
          <Calendar className="w-4 h-4 text-gray-500" />
          <div>
            <p className="text-sm text-gray-500">Expires</p>
            <p className="font-medium text-gray-900">
              {policy.expirationDate ? new Date(policy.expirationDate).toLocaleDateString() : 'Not specified'}
            </p>
          </div>
        </div>

        {/* Key Features */}
        <div>
          <p className="text-sm text-gray-500 mb-2">Key Features</p>
          <div className="space-y-1">
            {(policy.keyFeatures || []).slice(0, showAllFeatures ? undefined : 3).map((feature, index) => (
              <div key={`feature-${index}`} className="flex items-center space-x-2">
                <CheckCircle className="w-3 h-3 text-green-600 flex-shrink-0" />
                <p className="text-sm text-gray-700">{feature}</p>
              </div>
            ))}
            {(policy.keyFeatures || []).length > 3 && (
              <button
                onClick={() => setShowAllFeatures(!showAllFeatures)}
                className="flex items-center space-x-1 text-sm text-blue-600 hover:text-blue-800 transition-colors mt-2"
              >
                {showAllFeatures ? (
                  <>
                    <ChevronUp className="w-3 h-3" />
                    <span>Show less</span>
                  </>
                ) : (
                  <>
                    <ChevronDown className="w-3 h-3" />
                    <span>+{policy.keyFeatures.length - 3} more features</span>
                  </>
                )}
              </button>
            )}
          </div>
        </div>

        {/* Action Buttons */}
        <div className="flex space-x-2 pt-2">
          <Button variant="outline" onClick={onViewDetails} className="flex-1 bg-transparent">
            View Details
          </Button>
          <Button onClick={onCompare} className="flex-1 bg-blue-600 hover:bg-blue-700">
            {isSelected ? "Remove from Compare" : "Compare"}
          </Button>
        </div>
      </CardContent>
    </Card>
  )
}
