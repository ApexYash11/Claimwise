"use client"

import { ProtectedRoute } from "@/components/auth/protected-route"
import { Header } from "@/components/layout/header"
import { useEffect, useState, useCallback } from "react"
import { useAuth } from "@/hooks/use-auth"
import { ChatWidget } from "@/components/chat/chat-widget"
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { createApiUrlWithLogging } from "@/lib/url-utils"
import { 
  BrainCircuit, 
  ShieldAlert, 
  Shield, 
  Zap, 
  SearchCheck, 
  Plus, 
  Sparkles, 
  MessageSquare, 
  ArrowRight,
  FileSearch,
  Clock,
  AlertCircle
} from "lucide-react"
import Link from "next/link"
import { cn } from "@/lib/utils"

// Circular Progress Component for Protection Score
function CircularProgress({ value, size = 60, strokeWidth = 6 }: { value: number, size?: number, strokeWidth?: number }) {
  const radius = (size - strokeWidth) / 2
  const circumference = radius * 2 * Math.PI
  const offset = circumference - (value / 100) * circumference

  return (
    <div className="relative flex items-center justify-center" style={{ width: size, height: size }}>
      <svg className="transform -rotate-90" width={size} height={size}>
        <circle
          className="text-slate-200 dark:text-slate-800"
          strokeWidth={strokeWidth}
          stroke="currentColor"
          fill="transparent"
          r={radius}
          cx={size / 2}
          cy={size / 2}
        />
        <circle
          className="text-indigo-600 dark:text-indigo-400 transition-all duration-500 ease-in-out"
          strokeWidth={strokeWidth}
          strokeDasharray={circumference}
          strokeDashoffset={offset}
          strokeLinecap="round"
          stroke="currentColor"
          fill="transparent"
          r={radius}
          cx={size / 2}
          cy={size / 2}
        />
      </svg>
      <span className="absolute text-xs font-bold">{value}%</span>
    </div>
  )
}

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

  // Mock data for the new "Intelligence" focus
  const protectionScore = stats?.uploadedDocuments ? 78 : 0
  const risksFound = stats?.uploadedDocuments ? 3 : 0
  const totalCoverage = "₹50.00 Lakh"
  const quickInsight = stats?.uploadedDocuments 
    ? "You could save 15% on premiums by switching to HDFC Ergo."
    : "Scan your first policy to get personalized savings insights."

  const fetchStats = useCallback(async () => {
    setLoading(true)
    try {
      let sessionResult = await (await import("@/lib/supabase")).supabase.auth.getSession()
      let session = sessionResult.data.session
      let token = session?.access_token

      let res;
      if (token) {
        const statsUrl = createApiUrlWithLogging("/dashboard/stats");
        res = await fetch(statsUrl, {
          headers: { Authorization: `Bearer ${token}` },
        })
        if (res.status === 401 || res.status === 404) {
          const devUrl = createApiUrlWithLogging("/dashboard/stats-dev");
          res = await fetch(devUrl)
        }
      } else {
        const devUrl = createApiUrlWithLogging("/dashboard/stats-dev");
        res = await fetch(devUrl)
      }
      if (!res.ok) throw new Error("Failed to fetch stats")
      const data = await res.json()
      setStats({
        uploadedDocuments: data.uploadedDocuments || 0,
        documentsProcessed: data.documentsProcessed || 0,
        analysesCompleted: data.analysesCompleted || 0,
        comparisonsRun: data.comparisonsRun || 0,
      })
    } catch (e) {
      setStats({ uploadedDocuments: 0, documentsProcessed: 0, analysesCompleted: 0, comparisonsRun: 0 })
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    fetchStats()
  }, [fetchStats])

  return (
    <ProtectedRoute>
      <div className="min-h-screen bg-slate-50 dark:bg-slate-950 text-slate-900 dark:text-slate-50">
        <Header />
        <main className="container mx-auto px-4 py-8 space-y-8">
          {/* Welcome Section */}
          <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
            <div>
              <h1 className="text-3xl font-serif font-bold tracking-tight">
                Welcome back, {userName}
              </h1>
              <p className="text-muted-foreground mt-1">
                Your AI Policy Analyst has identified new insights for your portfolio.
              </p>
            </div>
            <div className="flex gap-2">
              <Button variant="outline" size="sm" onClick={fetchStats} className="hidden md:flex">
                Refresh Intelligence
              </Button>
              <Link href="/upload">
                <Button size="sm" className="bg-indigo-600 hover:bg-indigo-700 text-white">
                  <Plus className="mr-2 h-4 w-4" /> Scan New Policy
                </Button>
              </Link>
            </div>
          </div>

          {/* Intelligence Metrics Grid */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            {/* Card 1: Protection Score */}
            <Card className="h-full overflow-hidden border-none shadow-sm bg-card">
              <CardContent className="p-6">
                <div className="flex justify-between items-start">
                  <div className="space-y-1">
                    <p className="text-sm font-medium text-muted-foreground">Protection Score</p>
                    <h3 className="text-2xl font-bold text-card-foreground">{protectionScore}%</h3>
                    <p className="text-xs text-muted-foreground">
                      {protectionScore > 0 ? "Good coverage" : "Scan to calculate"}
                    </p>
                  </div>
                  <CircularProgress value={protectionScore} />
                </div>
              </CardContent>
            </Card>

            {/* Card 2: Risks Identified */}
            <Card className="h-full overflow-hidden border-none shadow-sm bg-card">
              <CardContent className="p-6">
                <div className="flex justify-between items-start">
                  <div className="space-y-1">
                    <p className="text-sm font-medium text-muted-foreground">Risks Identified</p>
                    <div className="flex items-center gap-2">
                      <h3 className="text-2xl font-bold text-card-foreground">{risksFound}</h3>
                      {risksFound > 0 && (
                        <Badge variant="destructive" className="h-5 px-1.5 animate-pulse">
                          Alert
                        </Badge>
                      )}
                    </div>
                    <p className="text-xs text-muted-foreground">
                      {risksFound > 0 ? `${risksFound} Exclusions found` : "No critical risks"}
                    </p>
                  </div>
                  <div className="p-2 bg-amber-100 dark:bg-amber-900/30 rounded-lg">
                    <ShieldAlert className="h-6 w-6 text-amber-600 dark:text-amber-400" />
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Card 3: Total Coverage */}
            <Card className="h-full overflow-hidden border-none shadow-sm bg-card">
              <CardContent className="p-6">
                <div className="flex justify-between items-start">
                  <div className="space-y-1">
                    <p className="text-sm font-medium text-muted-foreground">Total Coverage</p>
                    <h3 className="text-2xl font-bold text-card-foreground">{totalCoverage}</h3>
                    <p className="text-xs text-muted-foreground">Sum Insured</p>
                  </div>
                  <div className="p-2 bg-blue-100 dark:bg-blue-900/30 rounded-lg">
                    <Shield className="h-6 w-6 text-blue-600 dark:text-blue-400" />
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Card 4: Quick Insights */}
            <Card className="h-full overflow-hidden border-none shadow-sm bg-card border-l-4 border-l-purple-500">
              <CardContent className="p-6">
                <div className="flex justify-between items-start">
                  <div className="space-y-1">
                    <p className="text-sm font-medium text-muted-foreground">Quick Insights</p>
                    <p className="text-sm font-medium leading-tight text-card-foreground">
                      {quickInsight}
                    </p>
                  </div>
                  <Zap className="h-6 w-6 text-purple-500" />
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Main Content Grid */}
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
            {/* Left Column: Insight Stream */}
            <div className="lg:col-span-2 space-y-6">
              <div className="flex items-center justify-between">
                <h2 className="text-xl font-bold flex items-center gap-2">
                  <BrainCircuit className="h-5 w-5 text-indigo-600" />
                  Latest Analysis
                </h2>
                <Button variant="ghost" size="sm" className="text-indigo-600">
                  View All <ArrowRight className="ml-1 h-4 w-4" />
                </Button>
              </div>

              {stats?.uploadedDocuments && stats.uploadedDocuments > 0 ? (
                <div className="space-y-4">
                  {/* Mock Analysis Items */}
                  {[
                    { title: "Star Health Premier", outcome: "Analysis Complete - 2 Gaps Found", time: "2 hours ago", status: "warning" },
                    { title: "HDFC Ergo Optima", outcome: "Risk Assessment - High Coverage", time: "Yesterday", status: "success" },
                    { title: "ICICI Lombard", outcome: "Policy Scanned - Waiting for Deep Dive", time: "3 days ago", status: "info" }
                  ].map((item, i) => (
                    <Card key={i} className="border-none shadow-sm hover:shadow-md transition-shadow bg-white dark:bg-slate-900">
                      <CardContent className="p-4 flex items-center justify-between">
                        <div className="flex items-center gap-4">
                          <div className={cn(
                            "p-2 rounded-full",
                            item.status === "warning" ? "bg-amber-100 text-amber-600" : 
                            item.status === "success" ? "bg-emerald-100 text-emerald-600" : "bg-blue-100 text-blue-600"
                          )}>
                            <SearchCheck className="h-5 w-5" />
                          </div>
                          <div>
                            <h4 className="font-bold text-sm">{item.title}</h4>
                            <p className="text-xs text-muted-foreground">{item.outcome}</p>
                          </div>
                        </div>
                        <div className="text-right">
                          <p className="text-[10px] text-muted-foreground uppercase font-bold tracking-wider">{item.time}</p>
                          <Button variant="link" size="sm" className="h-auto p-0 text-indigo-600 text-xs">
                            Details
                          </Button>
                        </div>
                      </CardContent>
                    </Card>
                  ))}
                </div>
              ) : (
                /* Empty State CTA */
                <Card className="border-2 border-dashed border-slate-200 dark:border-slate-800 bg-transparent">
                  <CardContent className="flex flex-col items-center justify-center py-12 text-center">
                    <div className="p-4 bg-indigo-50 dark:bg-indigo-900/20 rounded-full mb-4">
                      <Sparkles className="h-8 w-8 text-indigo-600 dark:text-indigo-400" />
                    </div>
                    <h3 className="text-lg font-bold">Unlock Your Intelligence Stream</h3>
                    <p className="text-muted-foreground max-w-xs mx-auto mt-2 mb-6">
                      Upload your first policy to see AI-driven risks, gaps, and savings opportunities.
                    </p>
                    <Link href="/upload">
                      <Button className="bg-indigo-600 hover:bg-indigo-700 text-white">
                        Upload Your First Policy
                      </Button>
                    </Link>
                  </CardContent>
                </Card>
              )}
            </div>

            {/* Right Column: Intelligence Tools */}
            <div className="space-y-6">
              <h2 className="text-xl font-bold">Intelligence Tools</h2>
              <Card className="border-none shadow-md bg-white dark:bg-slate-900">
                <CardContent className="p-4 space-y-3">
                  <Link href="/upload" className="block">
                    <Button className="w-full justify-start h-12 bg-slate-900 dark:bg-slate-800 hover:bg-slate-800 dark:hover:bg-slate-700 text-white border-none">
                      <Plus className="mr-3 h-5 w-5 text-indigo-400" />
                      <div className="text-left">
                        <div className="text-sm font-bold">Scan New Policy</div>
                        <div className="text-[10px] text-slate-400">Extract data instantly</div>
                      </div>
                      <ArrowRight className="ml-auto h-4 w-4 opacity-50" />
                    </Button>
                  </Link>
                  
                  <Link href="/analyze" className="block">
                    <Button variant="outline" className="w-full justify-start h-12 border-slate-200 dark:border-slate-800 hover:bg-slate-50 dark:hover:bg-slate-800">
                      <FileSearch className="mr-3 h-5 w-5 text-indigo-600" />
                      <div className="text-left">
                        <div className="text-sm font-bold">Deep Dive Analysis</div>
                        <div className="text-[10px] text-muted-foreground">Find hidden exclusions</div>
                      </div>
                    </Button>
                  </Link>

                  <Link href="/chat" className="block">
                    <Button variant="outline" className="w-full justify-start h-12 border-slate-200 dark:border-slate-800 hover:bg-slate-50 dark:hover:bg-slate-800">
                      <MessageSquare className="mr-3 h-5 w-5 text-indigo-600" />
                      <div className="text-left">
                        <div className="text-sm font-bold">Ask AI Advisor</div>
                        <div className="text-[10px] text-muted-foreground">Query your coverage</div>
                      </div>
                    </Button>
                  </Link>
                </CardContent>
              </Card>
            </div>
          </div>
        </main>
        <ChatWidget />
      </div>
    </ProtectedRoute>
  )
}
