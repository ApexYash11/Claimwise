"use client"

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { FileText, MessageSquare, BarChart3, Upload, Clock, ArrowRight } from "lucide-react"
import { useEffect, useState } from "react"
import { supabase } from "@/lib/supabase"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"

import { createApiUrlWithLogging } from "@/lib/url-utils"

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

  // Fetch activities from API
  useEffect(() => {
    const fetchActivities = async () => {
      try {
        // Wait for Supabase session to load, and refresh if needed
        let sessionResult = await supabase.auth.getSession()
        let session = sessionResult.data.session
        let token = session?.access_token

        // If no token, try to refresh
        if (!token) {
          const { data: refreshed } = await supabase.auth.refreshSession()
          session = refreshed.session
          token = session?.access_token
        }

        let response;
        if (token) {
          const activitiesUrl = createApiUrlWithLogging("/activities");
          response = await fetch(activitiesUrl, {
            headers: {
              "Authorization": `Bearer ${token}`,
              "Content-Type": "application/json",
            },
          })
        }
        
        if (response && response.ok) {
          const data = await response.json()
          if (data.success && data.activities) {
            setActivities(data.activities)
          } else {
            setActivities([])
          }
        } else {
          setActivities([])
        }
      } catch (error) {
        setActivities([])
      } finally {
        setLoading(false)
      }
    }
    fetchActivities()
  }, [])

  const getIcon = (type: string) => {
    switch (type) {
      case "upload": return <Upload className="h-4 w-4 text-slate-500" />
      case "analysis": return <FileText className="h-4 w-4 text-teal-600" />
      case "chat": return <MessageSquare className="h-4 w-4 text-blue-500" />
      case "comparison": return <BarChart3 className="h-4 w-4 text-amber-500" />
      default: return <Clock className="h-4 w-4 text-slate-400" />
    }
  }

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString("en-US", {
      month: "short",
      day: "numeric",
      hour: "2-digit",
      minute: "2-digit"
    })
  }

  return (
    <Card className="h-full">
      <CardHeader className="flex flex-row items-center justify-between pb-2">
        <CardTitle className="text-lg font-serif">Recent Activity</CardTitle>
        <Button variant="ghost" size="sm" className="text-xs text-muted-foreground">
          View All <ArrowRight className="ml-1 h-3 w-3" />
        </Button>
      </CardHeader>
      <CardContent>
        {loading ? (
          <div className="space-y-2">
            {[1, 2, 3].map((i) => (
              <div key={i} className="h-12 w-full bg-slate-100 animate-pulse rounded-md" />
            ))}
          </div>
        ) : activities.length === 0 ? (
          <div className="text-center py-8 text-muted-foreground text-sm">
            No recent activity found.
          </div>
        ) : (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="w-[30px]"></TableHead>
                <TableHead>Activity</TableHead>
                <TableHead className="text-right">Date</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {activities.slice(0, 5).map((activity) => (
                <TableRow key={activity.id}>
                  <TableCell>{getIcon(activity.type)}</TableCell>
                  <TableCell>
                    <div className="font-medium text-sm">{activity.title}</div>
                    <div className="text-xs text-muted-foreground truncate max-w-[200px]">{activity.description}</div>
                  </TableCell>
                  <TableCell className="text-right text-xs text-muted-foreground font-mono">
                    {formatDate(activity.timestamp)}
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        )}
      </CardContent>
    </Card>
  )
}
