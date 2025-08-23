import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { FileText, MessageSquare, BarChart3, Upload, Clock } from "lucide-react"
import { useEffect, useState } from "react"
import { supabase } from "@/lib/supabase"

const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000"

interface ActivityItem {
  id: string
  type: "upload" | "analysis" | "chat" | "comparison"
  title: string
  description: string
  timestamp: string
  status?: "completed" | "processing" | "failed"
  details?: any
}

export function RecentActivity() {
  // Force recompilation
  const [activities, setActivities] = useState<ActivityItem[]>([])
  const [loading, setLoading] = useState(true)
  const [showAll, setShowAll] = useState(false)

  // Fetch activities from API
  useEffect(() => {
    const fetchActivities = async () => {
      try {
        const session = await supabase.auth.getSession()
        const token = session.data.session?.access_token

        if (!token) {
          console.log("No auth token for activities")
          setLoading(false)
          return
        }

        const response = await fetch(`${API_BASE_URL}/activities`, {
          headers: {
            "Authorization": `Bearer ${token}`,
            "Content-Type": "application/json",
          },
        })

        if (response.ok) {
          const data = await response.json()
          console.log("Activities data:", data)
          
          if (data.success && data.activities) {
            setActivities(data.activities)
          } else {
            // Use minimal sample data if no activities
            setActivities([
              {
                id: "welcome",
                type: "upload",
                title: "Welcome to ClaimWise!",
                description: "Upload your first policy to see activities here",
                timestamp: new Date().toISOString(),
                status: "completed"
              }
            ])
          }
        } else {
          console.error("Failed to fetch activities")
        }
      } catch (error) {
        console.error("Error fetching activities:", error)
      } finally {
        setLoading(false)
      }
    }

    fetchActivities()
  }, [])

  const getActivityIcon = (type: string) => {
    switch (type) {
      case "upload":
        return Upload
      case "analysis":
        return FileText
      case "chat":
        return MessageSquare
      case "comparison":
        return BarChart3
      default:
        return FileText
    }
  }

  const getStatusColor = (status?: string) => {
    switch (status) {
      case "completed":
        return "bg-green-100 text-green-800"
      case "processing":
        return "bg-yellow-100 text-yellow-800"
      case "failed":
        return "bg-red-100 text-red-800"
      default:
        return "bg-gray-100 text-gray-800"
    }
  }

  const formatTimeAgo = (timestamp: string) => {
    const date = new Date(timestamp)
    const now = new Date()
    const diffInHours = Math.floor((now.getTime() - date.getTime()) / (1000 * 60 * 60))

    if (diffInHours < 1) return "Just now"
    if (diffInHours < 24) return `${diffInHours}h ago`
    const diffInDays = Math.floor(diffInHours / 24)
    return `${diffInDays}d ago`
  }

  return (
    <Card className="border-0 shadow-lg">
      <CardHeader className="flex flex-row items-center justify-between">
        <CardTitle className="text-lg">Recent Activity</CardTitle>
        <Button 
          variant="ghost" 
          onClick={() => {
            console.log('View All button clicked, current showAll:', showAll);
            console.log('Activities array length:', activities.length);
            setShowAll(!showAll);
          }}
          className="text-blue-600 hover:text-blue-700"
        >
          {showAll ? "Show Less" : "View All"} ({activities.length} total)
        </Button>
      </CardHeader>
      <CardContent className="pb-4">
        {loading ? (
          <div className="space-y-4">
            {[1, 2, 3].map((i) => (
              <div key={i} className="flex items-start space-x-3 p-3">
                <div className="w-8 h-8 bg-gray-200 rounded-lg animate-pulse"></div>
                <div className="flex-1">
                  <div className="h-4 bg-gray-200 rounded animate-pulse mb-2"></div>
                  <div className="h-3 bg-gray-200 rounded animate-pulse"></div>
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div className="space-y-4">
            {activities.slice(0, showAll ? activities.length : 3).map((activity) => {
              const Icon = getActivityIcon(activity.type)
              return (
                <div
                  key={activity.id}
                  className="flex items-start space-x-3 p-3 rounded-lg hover:bg-gray-50 transition-colors"
                >
                  <div className="w-8 h-8 bg-blue-100 rounded-lg flex items-center justify-center flex-shrink-0">
                    <Icon className="w-4 h-4 text-blue-600" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between">
                      <p className="text-sm font-medium text-gray-900 truncate">{activity.title}</p>
                      <div className="flex items-center space-x-2">
                        {activity.status && (
                          <Badge className={`text-xs ${getStatusColor(activity.status)}`}>{activity.status}</Badge>
                        )}
                        <div className="flex items-center text-xs text-gray-500">
                          <Clock className="w-3 h-3 mr-1" />
                          {formatTimeAgo(activity.timestamp)}
                        </div>
                      </div>
                    </div>
                    <p className="text-sm text-gray-600 mt-1">{activity.description}</p>
                  </div>
                </div>
              )
            })}
          </div>
        )}
      </CardContent>
    </Card>
  )
}
