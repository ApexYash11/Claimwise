"use client"

import dynamic from "next/dynamic"
import { ProtectedRoute } from "@/components/auth/protected-route"
import { Header } from "@/components/layout/header"
import { useAuth } from "@/hooks/use-auth"
import { Card, CardContent } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { useDashboardStats, useDashboardMetrics } from "@/lib/use-queries"
import {
  BrainCircuit,
  ShieldAlert,
  Shield,
  Zap,
  Plus,
  Sparkles,
  MessageSquare,
  ArrowRight,
  FileSearch,
  Command,
} from "lucide-react"
import Link from "next/link"
import { motion } from "framer-motion"
import { CommandPalette } from "@/components/dashboard/command-palette"
import { PageWrapper } from "@/components/motion/page-wrapper"
import { StaggerContainer, StaggerItem } from "@/components/motion/stagger-children"

const ChatWidget = dynamic(() => import("@/components/chat/chat-widget").then((mod) => mod.ChatWidget), {
  loading: () => <div className="h-12 animate-pulse rounded-lg bg-slate-200 dark:bg-slate-800" />,
  ssr: false,
})

const RecentActivity = dynamic(
  () => import("@/components/dashboard/recent-activity").then((mod) => mod.RecentActivity),
  {
    loading: () => <div className="h-64 animate-pulse rounded-lg bg-slate-200 dark:bg-slate-800" />,
    ssr: false,
  },
)

function CircularProgress({ value, size = 60, strokeWidth = 6 }: { value: number; size?: number; strokeWidth?: number }) {
  const radius = (size - strokeWidth) / 2
  const circumference = radius * 2 * Math.PI
  const offset = circumference - (value / 100) * circumference

  return (
    <motion.div
      className="relative flex items-center justify-center"
      style={{ width: size, height: size }}
      initial={{ opacity: 0, scale: 0.8 }}
      animate={{ opacity: 1, scale: 1 }}
      transition={{ duration: 0.5, ease: [0.16, 1, 0.3, 1] }}
    >
      <svg className="-rotate-90" width={size} height={size}>
        <circle
          className="text-slate-200 dark:text-slate-800"
          strokeWidth={strokeWidth}
          stroke="currentColor"
          fill="transparent"
          r={radius}
          cx={size / 2}
          cy={size / 2}
        />
        <motion.circle
          className="text-indigo-600 dark:text-indigo-400"
          strokeWidth={strokeWidth}
          strokeDasharray={circumference}
          stroke="currentColor"
          fill="transparent"
          r={radius}
          cx={size / 2}
          cy={size / 2}
          strokeLinecap="round"
          initial={{ strokeDashoffset: circumference }}
          animate={{ strokeDashoffset: offset }}
          transition={{ duration: 1, delay: 0.3, ease: [0.16, 1, 0.3, 1] }}
        />
      </svg>
      <span className="absolute text-xs font-bold">{value}%</span>
    </motion.div>
  )
}

export default function DashboardPage() {
  const { user } = useAuth()
  const userName = user?.user_metadata?.full_name || user?.email?.split("@")[0] || "User"

  const { data: stats, isLoading: statsLoading } = useDashboardStats()
  const { data: metrics, isLoading: metricsLoading } = useDashboardMetrics()

  const protectionScore = metrics?.protectionScore ?? 0
  const risksFound = metrics?.risksFound ?? 0
  const totalCoverage = metrics?.totalCoverage ?? "₹0 Lakh"
  const quickInsight = metrics?.quickInsight ?? "Scan your first policy to get personalized savings insights."
  const statsError = null

  return (
    <ProtectedRoute>
      <div className="min-h-screen bg-slate-50 dark:bg-slate-950 text-slate-900 dark:text-slate-50">
        <Header />
        <CommandPalette />
        <PageWrapper>
          <main className="container mx-auto space-y-8 px-4 py-8">
            {/* Welcome Section */}
            <div className="flex flex-col items-start justify-between gap-4 md:flex-row md:items-center">
              <div>
                <h1 className="text-3xl font-bold tracking-tight">
                  Welcome back, {userName}
                </h1>
                <p className="mt-1 text-muted-foreground">
                  Your AI Policy Analyst has identified new insights for your portfolio.
                </p>
                {statsError && (
                  <p className="mt-2 text-sm text-red-600 dark:text-red-400">{statsError}</p>
                )}
              </div>
              <div className="flex items-center gap-2">
                <Button variant="outline" size="sm" onClick={() => {}} className="hidden md:flex">
                  Refresh Intelligence
                </Button>
                <Link href="/upload">
                  <Button size="sm">
                    <Plus className="mr-2 h-4 w-4" /> Scan New Policy
                  </Button>
                </Link>
              </div>
            </div>

            {/* Intelligence Metrics Grid */}
            <StaggerContainer className="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-4">
              <StaggerItem>
                <Card className="group h-full overflow-hidden border-none shadow-sm transition-all duration-300 hover:-translate-y-0.5 hover:shadow-md bg-card">
                  <CardContent className="p-6">
                    <div className="flex items-start justify-between">
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
              </StaggerItem>

              <StaggerItem>
                <Card className="group h-full overflow-hidden border-none shadow-sm transition-all duration-300 hover:-translate-y-0.5 hover:shadow-md bg-card">
                  <CardContent className="p-6">
                    <div className="flex items-start justify-between">
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
                      <motion.div
                        className="rounded-lg bg-amber-100 p-2 dark:bg-amber-900/30"
                        whileHover={{ scale: 1.1, rotate: 4 }}
                        transition={{ type: "spring", stiffness: 400, damping: 10 }}
                      >
                        <ShieldAlert className="h-6 w-6 text-amber-600 dark:text-amber-400" />
                      </motion.div>
                    </div>
                  </CardContent>
                </Card>
              </StaggerItem>

              <StaggerItem>
                <Card className="group h-full overflow-hidden border-none shadow-sm transition-all duration-300 hover:-translate-y-0.5 hover:shadow-md bg-card">
                  <CardContent className="p-6">
                    <div className="flex items-start justify-between">
                      <div className="space-y-1">
                        <p className="text-sm font-medium text-muted-foreground">Total Coverage</p>
                        <h3 className="text-2xl font-bold text-card-foreground">{totalCoverage}</h3>
                        <p className="text-xs text-muted-foreground">Sum Insured</p>
                      </div>
                      <motion.div
                        className="rounded-lg bg-blue-100 p-2 dark:bg-blue-900/30"
                        whileHover={{ scale: 1.1, rotate: 4 }}
                        transition={{ type: "spring", stiffness: 400, damping: 10 }}
                      >
                        <Shield className="h-6 w-6 text-blue-600 dark:text-blue-400" />
                      </motion.div>
                    </div>
                  </CardContent>
                </Card>
              </StaggerItem>

              <StaggerItem>
                <Card className="group h-full overflow-hidden border-l-4 border-l-purple-500 border-none shadow-sm transition-all duration-300 hover:-translate-y-0.5 hover:shadow-md bg-card">
                  <CardContent className="p-6">
                    <div className="flex items-start justify-between">
                      <div className="space-y-1">
                        <p className="text-sm font-medium text-muted-foreground">Quick Insights</p>
                        <p className="text-sm font-medium leading-tight text-card-foreground">
                          {quickInsight}
                        </p>
                      </div>
                      <motion.div whileHover={{ scale: 1.1 }} transition={{ type: "spring", stiffness: 400, damping: 10 }}>
                        <Zap className="h-6 w-6 text-purple-500" />
                      </motion.div>
                    </div>
                  </CardContent>
                </Card>
              </StaggerItem>
            </StaggerContainer>

            {/* Main Content Grid */}
            <div className="grid grid-cols-1 gap-8 lg:grid-cols-3">
              {/* Left Column: Insight Stream */}
              <div className="space-y-6 lg:col-span-2">
                <div className="flex items-center justify-between">
                  <h2 className="flex items-center gap-2 text-xl font-bold">
                    <BrainCircuit className="h-5 w-5 text-indigo-600" />
                    Latest Analysis
                  </h2>
                  <Button variant="ghost" size="sm" className="text-indigo-600">
                    View All <ArrowRight className="ml-1 h-4 w-4" />
                  </Button>
                </div>

                {stats?.uploadedDocuments && stats.uploadedDocuments > 0 ? (
                  <RecentActivity />
                ) : (
                  <motion.div
                    initial={{ opacity: 0, y: 12 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ duration: 0.4, delay: 0.2 }}
                  >
                    <Card className="border-2 border-dashed border-slate-200 bg-transparent dark:border-slate-800">
                      <CardContent className="flex flex-col items-center justify-center py-12 text-center">
                        <motion.div
                          className="mb-4 rounded-full bg-indigo-50 p-4 dark:bg-indigo-900/20"
                          animate={{ scale: [1, 1.05, 1] }}
                          transition={{ duration: 3, repeat: Infinity, ease: "easeInOut" }}
                        >
                          <Sparkles className="h-8 w-8 text-indigo-600 dark:text-indigo-400" />
                        </motion.div>
                        <h3 className="text-lg font-bold">Unlock Your Intelligence Stream</h3>
                        <p className="mx-auto mt-2 max-w-xs text-muted-foreground">
                          Upload your first policy to see AI-driven risks, gaps, and savings opportunities.
                        </p>
                        <Link href="/upload" className="mt-6">
                          <Button>Upload Your First Policy</Button>
                        </Link>
                      </CardContent>
                    </Card>
                  </motion.div>
                )}
              </div>

              {/* Right Column: Intelligence Tools */}
              <div className="space-y-6">
                <div className="flex items-center justify-between">
                  <h2 className="text-xl font-bold">Intelligence Tools</h2>
                  <kbd className="hidden items-center gap-1 rounded-md border bg-muted px-1.5 py-0.5 font-mono text-[10px] text-muted-foreground md:flex">
                    <Command className="h-3 w-3" />K
                  </kbd>
                </div>
                <Card className="border-none bg-white shadow-md dark:bg-slate-900">
                  <CardContent className="space-y-3 p-4">
                    <Link href="/upload" className="block">
                      <motion.div whileHover={{ scale: 1.01 }} whileTap={{ scale: 0.99 }}>
                        <Button className="flex h-12 w-full items-center justify-start border-none bg-slate-900 text-white hover:bg-slate-800 dark:bg-slate-800 dark:hover:bg-slate-700">
                          <Plus className="mr-3 h-5 w-5 text-indigo-400" />
                          <div className="text-left">
                            <div className="text-sm font-bold">Scan New Policy</div>
                            <div className="text-[10px] text-slate-400">Extract data instantly</div>
                          </div>
                          <ArrowRight className="ml-auto h-4 w-4 opacity-50" />
                        </Button>
                      </motion.div>
                    </Link>

                    <Link href="/analyze" className="block">
                      <motion.div whileHover={{ scale: 1.01 }} whileTap={{ scale: 0.99 }}>
                        <Button
                          variant="outline"
                          className="flex h-12 w-full items-center justify-start border-slate-200 hover:bg-slate-50 dark:border-slate-800 dark:hover:bg-slate-800"
                        >
                          <FileSearch className="mr-3 h-5 w-5 text-indigo-600" />
                          <div className="text-left">
                            <div className="text-sm font-bold">Deep Dive Analysis</div>
                            <div className="text-[10px] text-muted-foreground">Find hidden exclusions</div>
                          </div>
                        </Button>
                      </motion.div>
                    </Link>

                    <Link href="/chat" className="block">
                      <motion.div whileHover={{ scale: 1.01 }} whileTap={{ scale: 0.99 }}>
                        <Button
                          variant="outline"
                          className="flex h-12 w-full items-center justify-start border-slate-200 hover:bg-slate-50 dark:border-slate-800 dark:hover:bg-slate-800"
                        >
                          <MessageSquare className="mr-3 h-5 w-5 text-indigo-600" />
                          <div className="text-left">
                            <div className="text-sm font-bold">Ask AI Advisor</div>
                            <div className="text-[10px] text-muted-foreground">Query your coverage</div>
                          </div>
                        </Button>
                      </motion.div>
                    </Link>
                  </CardContent>
                </Card>
              </div>
            </div>
          </main>
        </PageWrapper>
        <ChatWidget />
      </div>
    </ProtectedRoute>
  )
}
