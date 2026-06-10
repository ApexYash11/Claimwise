"use client"

import dynamic from "next/dynamic"
import { ProtectedRoute } from "@/components/auth/protected-route"
import { Header } from "@/components/layout/header"
import { useAuth } from "@/hooks/use-auth"
import { Card } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { useDashboardStats, useDashboardMetrics } from "@/lib/use-queries"
import {
  AlertTriangle,
  Shield,
  Plus,
  Sparkles,
  MessageSquare,
  ArrowRight,
  FileSearch,
  Command,
  TrendingUp,
  FileText,
  Scale,
  AlertCircle,
} from "lucide-react"
import Link from "next/link"
import { motion } from "framer-motion"
import { CommandPalette } from "@/components/dashboard/command-palette"
import { PageWrapper } from "@/components/motion/page-wrapper"
import { Skeleton } from "@/components/ui/skeleton"
import { ErrorBoundary } from "@/components/error-boundary"

const ChatWidget = dynamic(() => import("@/components/chat/chat-widget").then((mod) => mod.ChatWidget), {
  loading: () => <div className="h-12 animate-pulse rounded-lg bg-muted" />,
  ssr: false,
})

const RecentActivity = dynamic(
  () => import("@/components/dashboard/recent-activity").then((mod) => mod.RecentActivity),
  {
    loading: () => <div className="h-64 animate-pulse rounded-lg bg-muted" />,
    ssr: false,
  },
)

export default function DashboardPage() {
  const { user } = useAuth()
  const userName = user?.user_metadata?.full_name || user?.email?.split("@")[0] || "User"

  const { data: stats, isLoading: statsLoading, isError: statsError } = useDashboardStats()
  const { data: metrics, isLoading: metricsLoading, isError: metricsError } = useDashboardMetrics()

  const protectionScore = metrics?.protectionScore ?? 0
  const risksFound = metrics?.risksFound ?? 0
  const totalCoverage = metrics?.totalCoverage ?? "₹0 Lakh"
  const hasData = (stats?.uploadedDocuments ?? 0) > 0

  if (statsLoading || metricsLoading) {
    return (
      <ProtectedRoute>
        <div className="min-h-screen bg-background">
          <Header />
          <main className="page-container py-8 space-y-8">
            <Skeleton className="h-8 w-64" />
            <div className="grid grid-cols-1 gap-6 lg:grid-cols-[1fr_2fr]">
              <Skeleton className="h-40 rounded-xl" />
              <div className="grid grid-cols-3 gap-4">
                <Skeleton className="h-28 rounded-xl" />
                <Skeleton className="h-28 rounded-xl" />
                <Skeleton className="h-28 rounded-xl" />
              </div>
            </div>
          </main>
        </div>
      </ProtectedRoute>
    )
  }

  if (statsError || metricsError) {
    return (
      <ProtectedRoute>
        <div className="min-h-screen bg-background">
          <Header />
          <main className="page-container py-8">
            <Card className="card-flat flex flex-col items-center justify-center py-16 text-center">
              <AlertCircle className="h-8 w-8 text-destructive mb-3" />
              <h2 className="text-lg font-semibold">Failed to load dashboard</h2>
              <p className="mt-1.5 text-sm text-muted-foreground max-w-sm">
                Could not fetch your data. Please try again.
              </p>
              <Button className="mt-4" onClick={() => window.location.reload()}>
                Retry
              </Button>
            </Card>
          </main>
        </div>
      </ProtectedRoute>
    )
  }

  return (
    <ProtectedRoute>
      <div className="min-h-screen bg-background">
        <Header />
        <CommandPalette />
        <PageWrapper>
          <ErrorBoundary>
          <main className="page-container py-8 space-y-8">
            <div className="flex flex-col items-start justify-between gap-4 md:flex-row md:items-center">
              <div>
                <h1>Welcome back, {userName}</h1>
                <p className="mt-1 text-muted-foreground">
                  {hasData ? "Portfolio summary and recommended actions." : "Upload a policy to get started."}
                </p>
              </div>
              <div className="flex items-center gap-2">
                <Link href="/upload">
                  <Button>
                    <Plus className="mr-2 h-4 w-4" />
                    Upload Policy
                  </Button>
                </Link>
              </div>
            </div>

            {hasData && (
              <>
                <div className="grid grid-cols-1 gap-6 lg:grid-cols-[1fr_2fr]">
                  <Card className="card-flat">
                    <p className="metric-label">Portfolio Health</p>
                    <div className="mt-3 flex items-baseline gap-2">
                      <span className="metric-value text-[hsl(var(--success))]">{protectionScore}%</span>
                      <span className="text-sm text-muted-foreground">coverage score</span>
                    </div>
                    <div className="mt-2 h-2 rounded-full bg-muted overflow-hidden">
                      <motion.div
                        className="h-full rounded-full bg-[hsl(var(--success))]"
                        initial={{ width: 0 }}
                        animate={{ width: `${protectionScore}%` }}
                        transition={{ duration: 0.8, ease: [0.16, 1, 0.3, 1] }}
                      />
                    </div>
                    <p className="mt-2 text-xs text-muted-foreground">
                      Based on coverage breadth, exclusion density, and premium efficiency across all policies.
                    </p>
                  </Card>

                  <div className="grid grid-cols-3 gap-4">
                    {[
                      { label: "Active Policies", value: stats?.uploadedDocuments ?? 0, icon: FileText, color: "text-foreground" },
                      { label: "Total Coverage", value: totalCoverage, icon: Shield, color: "text-[hsl(var(--info))]" },
                      { label: "Exclusions Found", value: risksFound, icon: AlertTriangle, color: risksFound > 0 ? "text-[hsl(var(--warning))]" : "text-[hsl(var(--success))]" },
                    ].map((stat) => (
                      <div key={stat.label} className="card-flat-subtle space-y-2">
                        <stat.icon className={`h-4 w-4 ${stat.color}`} />
                        <p className="metric-label">{stat.label}</p>
                        <p className="metric-value">{stat.value}</p>
                      </div>
                    ))}
                  </div>
                </div>

                <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
                  <div className="lg:col-span-2 space-y-6">
                    <div className="flex items-center justify-between">
                      <h2 className="flex items-center gap-2 text-lg font-semibold tracking-tight">
                        <TrendingUp className="h-4 w-4 text-[hsl(var(--success))]" />
                        Recent Activity
                      </h2>
                      <Button variant="ghost" size="sm">
                        View All <ArrowRight className="ml-1 h-3 w-3" />
                      </Button>
                    </div>
                    <RecentActivity />
                  </div>

                  <div className="space-y-6">
                    <div className="flex items-center justify-between">
                      <h2 className="text-lg font-semibold tracking-tight">Quick Actions</h2>
                      <kbd className="hidden items-center gap-1 rounded-md border bg-muted px-1.5 py-0.5 font-mono text-[10px] text-muted-foreground md:flex">
                        <Command className="h-3 w-3" />K
                      </kbd>
                    </div>

                    <div className="space-y-3">
                      {[
                        { href: "/upload", icon: Plus, title: "Upload New Policy", desc: "Analyze a new insurance document", accent: "text-foreground" },
                        { href: "/analyze", icon: FileSearch, title: "Deep Dive Analysis", desc: "Review exclusions and coverage gaps" },
                        { href: "/chat", icon: MessageSquare, title: "Ask AI Advisor", desc: "Ask questions about your policies" },
                        { href: "/compare", icon: Scale, title: "Compare Policies", desc: "Side-by-side coverage comparison" },
                      ].map((item) => (
                        <Link key={item.href} href={item.href}>
                          <div className="flex items-center gap-3 rounded-xl border bg-card p-4 transition-colors hover:bg-muted/50 cursor-pointer">
                            <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg border bg-muted/40">
                              <item.icon className={`h-4 w-4 ${item.accent}`} />
                            </div>
                            <div className="min-w-0 flex-1">
                              <p className="text-sm font-medium">{item.title}</p>
                              <p className="text-xs text-muted-foreground">{item.desc}</p>
                            </div>
                            <ArrowRight className="h-4 w-4 shrink-0 text-muted-foreground" />
                          </div>
                        </Link>
                      ))}
                    </div>
                  </div>
                </div>
              </>
            )}

            {!hasData && (
              <div className="card-flat-subtle flex flex-col items-center justify-center py-16 text-center">
                <div className="mb-4 flex h-12 w-12 items-center justify-center rounded-xl bg-muted">
                  <Sparkles className="h-6 w-6" />
                </div>
                <h2 className="text-lg font-semibold tracking-tight">Start your first analysis</h2>
                <p className="mt-1.5 max-w-sm text-sm text-muted-foreground">
                  Upload an insurance policy PDF to see AI-powered risk detection, coverage scoring, and optimization recommendations.
                </p>
                <Link href="/upload" className="mt-6">
                  <Button>
                    Upload Your First Policy
                    <ArrowRight className="ml-2 h-4 w-4" />
                  </Button>
                </Link>
              </div>
            )}
          </main>
        </ErrorBoundary>
        </PageWrapper>
        <ChatWidget />
      </div>
    </ProtectedRoute>
  )
}
