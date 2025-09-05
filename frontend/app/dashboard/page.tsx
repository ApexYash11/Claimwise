"use client"

import { ProtectedRoute } from "@/components/auth/protected-route"
import { Header } from "@/components/layout/header"
import { StatsCard } from "@/components/dashboard/stats-card"
import { useEffect, useState, useCallback } from "react"
import { PolicySummary } from "@/lib/api"
import { useAuth } from "@/hooks/use-auth"
import { getPolicies } from "@/lib/api"
import { RecentActivity } from "@/components/dashboard/recent-activity"
import { QuickActions } from "@/components/dashboard/quick-actions"
import { ChatWidget } from "@/components/chat/chat-widget"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
// ...existing code...
import { FileText, IndianRupee, Shield, Calendar, AlertTriangle, CheckCircle, TrendingUp } from "lucide-react"
import Link from "next/link"


export default function DashboardPage() {
  const { user } = useAuth()
  const userName = user?.user_metadata?.full_name || user?.email?.split("@")[0] || "User"

  const [loading, setLoading] = useState(true)
  const [stats, setStats] = useState<{
    uploadedDocuments: number
    documentsProcessed: number
    analysesCompleted: number
    comparisonsRun: number
  } | null>(null)

  // Helper: Format money in Indian lakhs/crores
  const formatINR = (amount: number) => {
    if (amount >= 1e7) {
      return `₹${(amount / 1e7).toFixed(2)} Cr`
    } else if (amount >= 1e5) {
      return `₹${(amount / 1e5).toFixed(2)} Lakh`
    } else {
      return `₹${amount.toLocaleString("en-IN")}`
    }
  }

  // Helper: Parse money string to number (if needed)
  const parseAmount = (str: string) => {
    if (!str) return 0
    const cleaned = str.replace(/[^\d.]/g, "")
    return Number(cleaned) || 0
  }

  // Fetch dashboard stats
  const fetchStats = useCallback(async () => {
    setLoading(true)
    try {
      // Wait for Supabase session to load, and refresh if needed
      let sessionResult = await (await import("@/lib/supabase")).supabase.auth.getSession()
      let session = sessionResult.data.session
      let token = session?.access_token
      // Optionally log the JWT for debugging
      console.log("[DEBUG] Supabase JWT:", token)

      // If no token, try to refresh
      if (!token) {
        const { data: refreshed } = await (await import("@/lib/supabase")).supabase.auth.refreshSession()
        session = refreshed.session
        token = session?.access_token
        console.log("[DEBUG] Refreshed JWT:", token)
      }

      let res;
      if (token) {
        res = await fetch(`${process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000"}/dashboard/stats`, {
          headers: { Authorization: `Bearer ${token}` },
        })
        // If unauthorized or not found, fall back to dev endpoint
        if (res.status === 401 || res.status === 404) {
          res = await fetch(`${process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000"}/dashboard/stats-dev`)
        }
      } else {
        // No token, use dev endpoint
        res = await fetch(`${process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000"}/dashboard/stats-dev`)
      }
      if (!res.ok) throw new Error("Failed to fetch stats from both endpoints")
      const data = await res.json()
      setStats({
        uploadedDocuments: data.uploadedDocuments || 0,
        documentsProcessed: data.documentsProcessed || 0,
        analysesCompleted: data.analysesCompleted || 0,
        comparisonsRun: data.comparisonsRun || 0,
      })
    } catch (e) {
      console.error("fetchStats error:", e)
      setStats({ uploadedDocuments: 0, documentsProcessed: 0, analysesCompleted: 0, comparisonsRun: 0 })
    } finally {
      setLoading(false)
    }
  }, [user])

  useEffect(() => {
    fetchStats()
  }, [fetchStats])

  // Allow other parts of the app to request a stats refresh (e.g., after upload)
  useEffect(() => {
    const handler = () => fetchStats()
    window.addEventListener("stats:refresh", handler)
    return () => window.removeEventListener("stats:refresh", handler)
  }, [fetchStats])

  // Calculate stats
  const totalPolicies = 0

  return (
    <ProtectedRoute>
  <div className="min-h-screen bg-gradient-to-br from-gray-50 to-blue-50 dark:from-gray-950 dark:to-blue-950">
        <Header />
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          {/* Welcome Section */}
          <div className="mb-12">
            <div className="inline-flex items-center px-4 py-2 rounded-full bg-blue-50 border border-blue-200 text-blue-700 text-sm font-medium mb-4 dark:bg-blue-900/20 dark:border-blue-800 dark:text-blue-400">
              <Shield className="w-4 h-4 mr-2" />
              Dashboard Overview
            </div>
            <h1 className="text-4xl lg:text-5xl font-bold text-gray-900 dark:text-white mb-4 tracking-tight">
              Welcome back, 
              <span className="text-transparent bg-gradient-to-r from-blue-600 to-purple-600 bg-clip-text block lg:inline lg:ml-3">
                {userName}!
              </span>
            </h1>
            <p className="text-xl text-gray-600 dark:text-gray-300 leading-relaxed">
              Here's an overview of your insurance portfolio and recent activity analysis.
            </p>
          </div>

          {/* Stats Grid - Analysis focused */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-10 mb-12">
            <div className="relative group">
              <div className="absolute -inset-1 bg-gradient-to-r from-blue-500 to-indigo-500 rounded-3xl blur-sm opacity-30 group-hover:opacity-60 transition duration-300"></div>
              <div className="relative bg-white dark:bg-gray-900 rounded-2xl p-8 shadow-2xl border border-gray-100 dark:border-gray-800 hover:border-blue-200 dark:hover:border-blue-800 transition-all duration-300">
                <div className="flex flex-col items-center text-center space-y-4">
                  <div className="w-16 h-16 bg-gradient-to-br from-blue-500 to-blue-600 rounded-2xl flex items-center justify-center shadow-lg">
                    <FileText className="w-8 h-8 text-white" />
                  </div>
                  <div>
                    <div className="text-4xl font-bold text-gray-900 dark:text-white mb-2">
                      {loading ? "--" : stats?.uploadedDocuments ?? 0}
                    </div>
                    <h3 className="text-lg font-bold text-gray-900 dark:text-white mb-1">Documents Uploaded</h3>
                    <p className="text-gray-600 dark:text-gray-400 text-sm">Policy documents added</p>
                  </div>
                </div>
              </div>
            </div>

            <div className="relative group">
              <div className="absolute -inset-1 bg-gradient-to-r from-green-500 to-emerald-500 rounded-3xl blur-sm opacity-30 group-hover:opacity-60 transition duration-300"></div>
              <div className="relative bg-white dark:bg-gray-900 rounded-2xl p-8 shadow-2xl border border-gray-100 dark:border-gray-800 hover:border-green-200 dark:hover:border-green-800 transition-all duration-300">
                <div className="flex flex-col items-center text-center space-y-4">
                  <div className="w-16 h-16 bg-gradient-to-br from-green-500 to-green-600 rounded-2xl flex items-center justify-center shadow-lg">
                    <TrendingUp className="w-8 h-8 text-white" />
                  </div>
                  <div>
                    <div className="text-4xl font-bold text-gray-900 dark:text-white mb-2">
                      {loading ? "--" : stats?.documentsProcessed ?? 0}
                    </div>
                    <h3 className="text-lg font-bold text-gray-900 dark:text-white mb-1">Documents Processed</h3>
                    <p className="text-gray-600 dark:text-gray-400 text-sm">OCR & parsing completed</p>
                  </div>
                </div>
              </div>
            </div>

            <div className="relative group">
              <div className="absolute -inset-1 bg-gradient-to-r from-purple-500 to-violet-500 rounded-3xl blur-sm opacity-30 group-hover:opacity-60 transition duration-300"></div>
              <div className="relative bg-white dark:bg-gray-900 rounded-2xl p-8 shadow-2xl border border-gray-100 dark:border-gray-800 hover:border-purple-200 dark:hover:border-purple-800 transition-all duration-300">
                <div className="flex flex-col items-center text-center space-y-4">
                  <div className="w-16 h-16 bg-gradient-to-br from-purple-500 to-purple-600 rounded-2xl flex items-center justify-center shadow-lg">
                    <CheckCircle className="w-8 h-8 text-white" />
                  </div>
                  <div>
                    <div className="text-4xl font-bold text-gray-900 dark:text-white mb-2">
                      {loading ? "--" : stats?.analysesCompleted ?? 0}
                    </div>
                    <h3 className="text-lg font-bold text-gray-900 dark:text-white mb-1">Analyses Completed</h3>
                    <p className="text-gray-600 dark:text-gray-400 text-sm">AI analyses generated</p>
                  </div>
                </div>
              </div>
            </div>

            <div className="relative group">
              <div className="absolute -inset-1 bg-gradient-to-r from-orange-500 to-amber-500 rounded-3xl blur-sm opacity-30 group-hover:opacity-60 transition duration-300"></div>
              <div className="relative bg-white dark:bg-gray-900 rounded-2xl p-8 shadow-2xl border border-gray-100 dark:border-gray-800 hover:border-orange-200 dark:hover:border-orange-800 transition-all duration-300">
                <div className="flex flex-col items-center text-center space-y-4">
                  <div className="w-16 h-16 bg-gradient-to-br from-orange-500 to-orange-600 rounded-2xl flex items-center justify-center shadow-lg">
                    <Shield className="w-8 h-8 text-white" />
                  </div>
                  <div>
                    <div className="text-4xl font-bold text-gray-900 dark:text-white mb-2">
                      {loading ? "--" : stats?.comparisonsRun ?? 0}
                    </div>
                    <h3 className="text-lg font-bold text-gray-900 dark:text-white mb-1">Comparisons Run</h3>
                    <p className="text-gray-600 dark:text-gray-400 text-sm">Policy comparisons performed</p>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* No manual refresh — dashboard updates automatically after uploads/analyses */}

          {/* Quick Actions Grid */}
          <div className="mb-12">
            <div className="flex items-center gap-3 mb-6">
              <div className="w-8 h-8 bg-gradient-to-br from-blue-500 to-purple-500 rounded-lg flex items-center justify-center">
                <TrendingUp className="w-4 h-4 text-white" />
              </div>
              <h2 className="text-2xl font-bold text-gray-900 dark:text-white">Quick Actions</h2>
            </div>
            <QuickActions />
          </div>

          {/* Recent Activity */}
          <div className="mb-12">
            <div className="flex items-center gap-3 mb-6">
              <div className="w-8 h-8 bg-gradient-to-br from-green-500 to-blue-500 rounded-lg flex items-center justify-center">
                <Calendar className="w-4 h-4 text-white" />
              </div>
              <h2 className="text-2xl font-bold text-gray-900 dark:text-white">Recent Activity</h2>
            </div>
            <RecentActivity />
          </div>

          {/* Analysis Insights and Document Status */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-12">
            {/* Analysis Results */}
            <Card className="border-0 shadow-2xl bg-gradient-to-br from-white to-blue-50 dark:from-gray-900 dark:to-blue-950/20 hover:shadow-3xl transition-all duration-300">
              <CardHeader className="pb-6">
                <CardTitle className="flex items-center space-x-4">
                  <div className="w-12 h-12 bg-gradient-to-br from-blue-500 to-purple-500 rounded-2xl flex items-center justify-center">
                    <TrendingUp className="w-6 h-6 text-white" />
                  </div>
                  <span className="text-2xl font-bold text-gray-900 dark:text-white">Latest Analysis Results</span>
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-6">
                <div className="flex items-start space-x-4 p-5 bg-gradient-to-r from-green-50 to-emerald-50 dark:from-green-950/20 dark:to-emerald-950/20 rounded-2xl border border-green-200/50 dark:border-green-800/30">
                  <CheckCircle className="w-6 h-6 text-green-600 flex-shrink-0 mt-1" />
                  <div className="space-y-2">
                    <p className="text-base font-semibold text-green-900 dark:text-green-100">Coverage Analysis Complete</p>
                    <p className="text-sm text-green-700 dark:text-green-300 leading-relaxed">
                      {loading ? "Loading..." : `${stats?.analysesCompleted || 0} policies analyzed with comprehensive coverage details and recommendations`}
                    </p>
                  </div>
                </div>
                <div className="flex items-start space-x-4 p-5 bg-gradient-to-r from-blue-50 to-indigo-50 dark:from-blue-950/20 dark:to-indigo-950/20 rounded-2xl border border-blue-200/50 dark:border-blue-800/30">
                  <CheckCircle className="w-6 h-6 text-blue-600 flex-shrink-0 mt-1" />
                  <div className="space-y-2">
                    <p className="text-base font-semibold text-blue-900 dark:text-blue-100">Claim Readiness Assessment</p>
                    <p className="text-sm text-blue-700 dark:text-blue-300 leading-relaxed">
                      {loading ? "Loading..." : stats?.documentsProcessed && stats.documentsProcessed > 0 
                        ? "Your documents are well-organized for efficient claim processing" 
                        : "Upload and analyze policies to assess claim readiness"
                      }
                    </p>
                  </div>
                </div>
                <div className="flex items-start space-x-4 p-5 bg-gradient-to-r from-purple-50 to-violet-50 dark:from-purple-950/20 dark:to-violet-950/20 rounded-2xl border border-purple-200/50 dark:border-purple-800/30">
                  <CheckCircle className="w-6 h-6 text-purple-600 flex-shrink-0 mt-1" />
                  <div className="space-y-2">
                    <p className="text-base font-semibold text-purple-900 dark:text-purple-100">Coverage Gaps Identified</p>
                    <p className="text-sm text-purple-700 dark:text-purple-300 leading-relaxed">
                      {loading ? "Loading..." : stats?.comparisonsRun && stats.comparisonsRun > 0 
                        ? "Review analysis for potential coverage improvements and optimization" 
                        : "Run policy comparisons to identify potential coverage gaps"
                      }
                    </p>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Document Status */}
            <Card className="border-0 shadow-2xl bg-gradient-to-br from-white to-orange-50 dark:from-gray-900 dark:to-orange-950/20 hover:shadow-3xl transition-all duration-300">
              <CardHeader className="pb-6">
                <CardTitle className="flex items-center space-x-4">
                  <div className="w-12 h-12 bg-gradient-to-br from-orange-500 to-red-500 rounded-2xl flex items-center justify-center">
                    <AlertTriangle className="w-6 h-6 text-white" />
                  </div>
                  <span className="text-2xl font-bold text-gray-900 dark:text-white">Document Status</span>
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-6">
                <div className="flex items-start justify-between p-5 bg-gradient-to-r from-green-50 to-emerald-50 dark:from-green-950/20 dark:to-emerald-950/20 rounded-2xl border border-green-200/50 dark:border-green-800/30">
                  <div className="flex items-start space-x-4">
                    <CheckCircle className="w-6 h-6 text-green-600 flex-shrink-0 mt-1" />
                    <div className="space-y-2">
                      <p className="text-base font-semibold text-green-900 dark:text-green-100">All Documents Processed</p>
                      <p className="text-sm text-green-700 dark:text-green-300 leading-relaxed">
                        {loading ? "Loading..." : `${stats?.documentsProcessed || 0} policy documents successfully analyzed and indexed`}
                      </p>
                    </div>
                  </div>
                  <Badge className="bg-gradient-to-r from-green-500 to-emerald-500 text-white border-0 px-3 py-1">
                    {loading ? "..." : (stats?.documentsProcessed && stats.documentsProcessed > 0 ? "Complete" : "Pending")}
                  </Badge>
                </div>
                <div className="flex items-start justify-between p-5 bg-gradient-to-r from-blue-50 to-indigo-50 dark:from-blue-950/20 dark:to-indigo-950/20 rounded-2xl border border-blue-200/50 dark:border-blue-800/30">
                  <div className="flex items-start space-x-4">
                    <CheckCircle className="w-6 h-6 text-blue-600 flex-shrink-0 mt-1" />
                    <div className="space-y-2">
                      <p className="text-base font-semibold text-blue-900 dark:text-blue-100">Ready for Chat Analysis</p>
                      <p className="text-sm text-blue-700 dark:text-blue-300 leading-relaxed">
                        {loading ? "Loading..." : stats?.analysesCompleted && stats.analysesCompleted > 0 
                          ? "Ask questions about your policy coverage and get instant answers" 
                          : "Upload and analyze policies to enable chat analysis"
                        }
                      </p>
                    </div>
                  </div>
                  <Badge className="bg-gradient-to-r from-blue-500 to-indigo-500 text-white border-0 px-3 py-1">
                    {loading ? "..." : (stats?.analysesCompleted && stats.analysesCompleted > 0 ? "Available" : "Pending")}
                  </Badge>
                </div>
                <div className="pt-4">
                  <Button variant="outline" asChild className="w-full bg-gradient-to-r from-orange-50 to-amber-50 dark:from-orange-950/20 dark:to-amber-950/20 border-orange-200 hover:bg-gradient-to-r hover:from-orange-100 hover:to-amber-100 dark:border-orange-800/30 transition-all duration-300 h-12 text-base font-semibold">
                    <Link href="/analyze">Upload More Documents</Link>
                  </Button>
                </div>
              </CardContent>
            </Card>
          </div>
        </div>

        {/* Chat Widget */}
        <ChatWidget />
      </div>
    </ProtectedRoute>
  )
}
