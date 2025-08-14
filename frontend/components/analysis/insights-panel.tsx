import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { CheckCircle, AlertTriangle, TrendingUp, Shield, DollarSign, Calendar } from "lucide-react"

interface InsightsPanelProps {
  insights: string[]
  recommendations: string[]
}

export function InsightsPanel({ insights, recommendations }: InsightsPanelProps) {
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
      {/* AI Insights */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center space-x-2">
            <TrendingUp className="w-5 h-5 text-blue-600" />
            <span>AI Insights</span>
          </CardTitle>
        </CardHeader>
        <CardContent>
          {insights.length > 0 ? (
            <div className="space-y-4">
              {insights.map((insight, index) => {
                const insightType = getInsightType(insight)
                return (
                  <div key={index} className="flex items-start space-x-3 p-3 bg-gray-50 rounded-lg">
                    {getInsightIcon(insight)}
                    <div className="flex-1">
                      <div className="flex items-start justify-between">
                        <p className="text-sm text-gray-700 flex-1">{insight}</p>
                        <Badge className={`ml-2 text-xs ${insightType.color}`}>{insightType.type}</Badge>
                      </div>
                    </div>
                  </div>
                )
              })}
            </div>
          ) : (
            <p className="text-gray-500 text-center py-4">No insights available yet. Upload policies to get started.</p>
          )}
        </CardContent>
      </Card>

      {/* Recommendations */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center space-x-2">
            <CheckCircle className="w-5 h-5 text-green-600" />
            <span>Recommendations</span>
          </CardTitle>
        </CardHeader>
        <CardContent>
          {recommendations.length > 0 ? (
            <div className="space-y-3">
              {recommendations.map((recommendation, index) => (
                <Alert key={index} className="border-green-200 bg-green-50">
                  <CheckCircle className="h-4 w-4 text-green-600" />
                  <AlertDescription className="text-green-800">{recommendation}</AlertDescription>
                </Alert>
              ))}
            </div>
          ) : (
            <p className="text-gray-500 text-center py-4">
              No recommendations available yet. Upload and analyze policies to get personalized suggestions.
            </p>
          )}
        </CardContent>
      </Card>

      {/* Quick Actions */}
      <Card className="bg-blue-50 border-blue-200">
        <CardHeader>
          <CardTitle className="text-blue-900">Quick Actions</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-2">
            <div className="flex items-center space-x-2 text-sm text-blue-800">
              <CheckCircle className="w-4 h-4" />
              <span>Review coverage gaps identified in your policies</span>
            </div>
            <div className="flex items-center space-x-2 text-sm text-blue-800">
              <CheckCircle className="w-4 h-4" />
              <span>Compare premiums to find potential savings</span>
            </div>
            <div className="flex items-center space-x-2 text-sm text-blue-800">
              <CheckCircle className="w-4 h-4" />
              <span>Set reminders for upcoming policy renewals</span>
            </div>
            <div className="flex items-center space-x-2 text-sm text-blue-800">
              <CheckCircle className="w-4 h-4" />
              <span>Ask our AI assistant specific questions about your coverage</span>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
