import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { CheckCircle, AlertTriangle, TrendingUp, Shield, DollarSign, Calendar } from "lucide-react"

interface InsightsPanelProps {
  insights: string[]
  recommendations: string[]
}

export function InsightsPanel({ insights, recommendations }: InsightsPanelProps) {
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

  const getInsightIcon = (insight: string) => {
    if (insight.toLowerCase().includes("save") || insight.toLowerCase().includes("lower")) {
      return <DollarSign className="w-4 h-4 text-green-600" />
    }
    if (insight.toLowerCase().includes("gap") || insight.toLowerCase().includes("missing")) {
      return <AlertTriangle className="w-4 h-4 text-orange-600" />
    }
    if (insight.toLowerCase().includes("expir") || insight.toLowerCase().includes("renew")) {
      return <Calendar className="w-4 h-4 text-blue-600" />
    }
    if (insight.toLowerCase().includes("coverage") || insight.toLowerCase().includes("protect")) {
      return <Shield className="w-4 h-4 text-purple-600" />
    }
    return <TrendingUp className="w-4 h-4 text-blue-600" />
  }

  const getInsightType = (insight: string) => {
    if (insight.toLowerCase().includes("save") || insight.toLowerCase().includes("lower")) {
      return { type: "savings", color: "bg-green-100 text-green-800" }
    }
    if (insight.toLowerCase().includes("gap") || insight.toLowerCase().includes("missing")) {
      return { type: "warning", color: "bg-orange-100 text-orange-800" }
    }
    if (insight.toLowerCase().includes("expir") || insight.toLowerCase().includes("renew")) {
      return { type: "renewal", color: "bg-blue-100 text-blue-800" }
    }
    return { type: "general", color: "bg-gray-100 text-gray-800" }
  }

  return (
    <div className="space-y-6">
      {/* Summary Stats */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card className="bg-gradient-to-r from-blue-500 to-blue-600 text-white">
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-blue-100 text-sm font-medium">Total Insights</p>
                <p className="text-2xl font-bold">{insights.length}</p>
              </div>
              <TrendingUp className="w-8 h-8 text-blue-200" />
            </div>
          </CardContent>
        </Card>
        
        <Card className="bg-gradient-to-r from-green-500 to-green-600 text-white">
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-green-100 text-sm font-medium">Recommendations</p>
                <p className="text-2xl font-bold">{recommendations.length}</p>
              </div>
              <CheckCircle className="w-8 h-8 text-green-200" />
            </div>
          </CardContent>
        </Card>
        
        <Card className="bg-gradient-to-r from-purple-500 to-purple-600 text-white">
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-purple-100 text-sm font-medium">Action Items</p>
                <p className="text-2xl font-bold">
                  {recommendations.filter(r => r.toLowerCase().includes('consider') || r.toLowerCase().includes('review')).length}
                </p>
              </div>
              <AlertTriangle className="w-8 h-8 text-purple-200" />
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Main Insights and Recommendations Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        {/* AI Insights Card */}
        <Card className="shadow-md hover:shadow-lg transition-shadow duration-300 rounded-xl border-blue-200 bg-gradient-to-br from-blue-50 to-white h-fit">
          <CardHeader className="pb-4">
            <CardTitle className="flex items-center space-x-3 text-blue-900">
              <div className="p-2 bg-blue-100 rounded-lg">
                <TrendingUp className="w-5 h-5 text-blue-600" />
              </div>
              <span className="text-xl font-semibold">AI Insights</span>
            </CardTitle>
          </CardHeader>
          <CardContent className="px-6 pb-6">
            {insights.length > 0 ? (
              <div className="space-y-3">
                {insights.slice(0, 5).map((insight, index) => {
                  const insightType = getInsightType(insight)
                  return (
                    <div key={index} className="group">
                      <div className="flex items-start space-x-3 p-3 bg-white rounded-lg border border-blue-100 hover:border-blue-200 transition-colors duration-200 shadow-sm hover:shadow-md">
                        <div className="flex-shrink-0 mt-0.5">
                          {getInsightIcon(insight)}
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="flex items-start justify-between gap-2">
                            <p className="text-sm text-gray-700 leading-relaxed flex-1 font-medium">{insight}</p>
                            <Badge className={`text-xs font-medium px-2 py-0.5 ${insightType.color} flex-shrink-0 capitalize`}>
                              {insightType.type}
                            </Badge>
                          </div>
                        </div>
                      </div>
                    </div>
                  )
                })}
                {insights.length > 5 && (
                  <div className="text-center pt-2">
                    <Badge variant="secondary" className="text-xs">
                      +{insights.length - 5} more insights available
                    </Badge>
                  </div>
                )}
              </div>
            ) : (
              <div className="text-center py-12">
                <TrendingUp className="w-12 h-12 text-blue-300 mx-auto mb-4" />
                <p className="text-blue-600 font-medium mb-2">No insights available yet</p>
                <p className="text-blue-500 text-sm">Upload policies to get AI-powered insights</p>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Recommendations Card */}
        <Card className="shadow-md hover:shadow-lg transition-shadow duration-300 rounded-xl border-green-200 bg-gradient-to-br from-green-50 to-white h-fit">
          <CardHeader className="pb-4">
            <CardTitle className="flex items-center space-x-3 text-green-900">
              <div className="p-2 bg-green-100 rounded-lg">
                <CheckCircle className="w-5 h-5 text-green-600" />
              </div>
              <span className="text-xl font-semibold">Recommendations</span>
            </CardTitle>
          </CardHeader>
          <CardContent className="px-6 pb-6">
            {recommendations.length > 0 ? (
              <div className="space-y-3">
                {recommendations.slice(0, 6).map((recommendation, index) => (
                  <Alert key={index} className="border-green-200 bg-white hover:bg-green-50 transition-colors duration-200 rounded-lg shadow-sm hover:shadow-md p-3">
                    <CheckCircle className="h-4 w-4 text-green-600 mt-0.5" />
                    <AlertDescription className="text-green-800 font-medium leading-relaxed ml-1 text-sm">
                      {recommendation}
                    </AlertDescription>
                  </Alert>
                ))}
                {recommendations.length > 6 && (
                  <div className="text-center pt-2">
                    <Badge variant="secondary" className="text-xs">
                      +{recommendations.length - 6} more recommendations
                    </Badge>
                  </div>
                )}
              </div>
            ) : (
              <div className="text-center py-12">
                <CheckCircle className="w-12 h-12 text-green-300 mx-auto mb-4" />
                <p className="text-green-600 font-medium mb-2">No recommendations available yet</p>
                <p className="text-green-500 text-sm">Analyze policies to get personalized suggestions</p>
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Quick Actions Card - Full Width */}
      <Card className="shadow-md hover:shadow-lg transition-shadow duration-300 rounded-xl border-indigo-200 bg-gradient-to-r from-indigo-50 via-blue-50 to-indigo-50">
        <CardHeader className="pb-4">
          <CardTitle className="flex items-center space-x-3 text-indigo-900">
            <div className="p-2 bg-indigo-100 rounded-lg">
              <Shield className="w-5 h-5 text-indigo-600" />
            </div>
            <span className="text-xl font-semibold">Quick Actions</span>
          </CardTitle>
        </CardHeader>
        <CardContent className="px-6 pb-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="flex items-center space-x-3 p-3 bg-white rounded-lg border border-indigo-100 hover:border-indigo-200 transition-colors duration-200 shadow-sm hover:shadow-md">
              <CheckCircle className="w-4 h-4 text-indigo-600 flex-shrink-0" />
              <span className="text-sm text-indigo-800 font-medium">Review coverage gaps identified in your policies</span>
            </div>
            <div className="flex items-center space-x-3 p-3 bg-white rounded-lg border border-indigo-100 hover:border-indigo-200 transition-colors duration-200 shadow-sm hover:shadow-md">
              <CheckCircle className="w-4 h-4 text-indigo-600 flex-shrink-0" />
              <span className="text-sm text-indigo-800 font-medium">Compare premiums to find potential savings</span>
            </div>
            <div className="flex items-center space-x-3 p-3 bg-white rounded-lg border border-indigo-100 hover:border-indigo-200 transition-colors duration-200 shadow-sm hover:shadow-md">
              <CheckCircle className="w-4 h-4 text-indigo-600 flex-shrink-0" />
              <span className="text-sm text-indigo-800 font-medium">Set reminders for upcoming policy renewals</span>
            </div>
            <div className="flex items-center space-x-3 p-3 bg-white rounded-lg border border-indigo-100 hover:border-indigo-200 transition-colors duration-200 shadow-sm hover:shadow-md">
              <CheckCircle className="w-4 h-4 text-indigo-600 flex-shrink-0" />
              <span className="text-sm text-indigo-800 font-medium">Ask our AI assistant specific questions about your coverage</span>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
