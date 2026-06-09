"use client"

import { useState, useEffect, useMemo } from "react"
import dynamic from "next/dynamic"
import { ProtectedRoute } from "@/components/auth/protected-route"
import { Header } from "@/components/layout/header"
import { Button } from "@/components/ui/button"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Badge } from "@/components/ui/badge"
import { ScrollArea } from "@/components/ui/scroll-area"
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion"
import { ArrowLeft, BarChart3, FileText, MessageSquare, CheckCircle, Shield, AlertTriangle, Lightbulb, ScrollText, ChevronRight, Trash2 } from "lucide-react"
import Link from "next/link"
import type { PolicySummary } from "@/lib/api"
import { cn } from "@/lib/utils"
import { Skeleton } from "@/components/ui/skeleton"
import { ErrorBoundary } from "@/components/error-boundary"
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog"
import { toast } from "sonner"
import { PageWrapper } from "@/components/motion/page-wrapper"

import { usePolicies } from "@/lib/use-queries"
import { useQueryClient } from "@tanstack/react-query"
import { getSupabase } from "@/lib/get-supabase"
import { createApiUrlWithLogging } from "@/lib/url-utils"
import { fetchWithTimeout } from "@/lib/fetch-with-timeout"

const InsightsPanel = dynamic(
  () => import("@/components/analysis/insights-panel").then((mod) => ({ default: mod.InsightsPanel })),
  {
    loading: () => <div className="h-48 w-full rounded-lg bg-muted animate-pulse" />,
    ssr: false,
  },
)

export default function AnalyzePage() {
  const [selectedPolicyId, setSelectedPolicyId] = useState<string>("")
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false)
  const [deleteTargetId, setDeleteTargetId] = useState<string | null>(null)
  const [isDeleting, setIsDeleting] = useState(false)
  const [sidebarOpen, setSidebarOpen] = useState(true)
  const [tabValue, setTabValue] = useState("analysis")

  const queryClient = useQueryClient()
  const { data: policiesData, isLoading, isError } = usePolicies()

  const mapPolicy = (policyData: any): PolicySummary => {
    const analysis = policyData?.validation_metadata?.analysis_result || {}
    return {
      id: policyData.id,
      fileName: policyData.policy_name || (policyData.policy_number ? `Policy ${policyData.policy_number}` : `Policy ${String(policyData.id).slice(0, 8)}`),
      policyType: analysis.policy_type || policyData.policy_type || "Insurance",
      provider: analysis.provider || policyData.provider || "Unknown Provider",
      coverageAmount: analysis.coverage_amount || "Not specified",
      premium: analysis.premium || "Not specified",
      deductible: analysis.deductible || "Not specified",
      keyFeatures: Array.isArray(analysis.key_features) ? analysis.key_features : [analysis.coverage || "Basic coverage"],
      expirationDate: analysis.expiration_date || "Not specified",
      rawAnalysis: analysis,
    }
  }

  const policies: PolicySummary[] = useMemo(
    () => policiesData?.policies?.map(mapPolicy) ?? [],
    [policiesData]
  )
  const loading = isLoading
  const currentPolicy = selectedPolicyId ? policies.find((p) => p.id === selectedPolicyId) : (policies[0] ?? null)

  useEffect(() => {
    if (!loading && policies.length > 0 && !selectedPolicyId) {
      setSelectedPolicyId(policies[0].id)
    }
  }, [loading, policies, selectedPolicyId])

  const getClaimScore = (policy: PolicySummary) => policy.rawAnalysis?.claim_readiness_score || 0

  const getRiskItems = (policy: PolicySummary) => {
    const items: { severity: "critical" | "warning" | "info"; title: string; desc: string; source?: string }[] = []
    const s = getClaimScore(policy)
    if (s < 60) items.push({ severity: "critical", title: "Low claim readiness", desc: `Score of ${s}/100 indicates documentation gaps that may delay claims.`, source: "Claim Readiness Assessment" })
    if (policy.rawAnalysis?.exclusions) items.push({ severity: "warning", title: "Exclusions detected", desc: policy.rawAnalysis.exclusions.slice(0, 120) + "...", source: "Section 4 - Exclusions" })
    if (policy.rawAnalysis?.waiting_period && policy.rawAnalysis.waiting_period !== "Not specified") items.push({ severity: "warning", title: "Active waiting period", desc: policy.rawAnalysis.waiting_period, source: "Section 2 - Waiting Periods" })
    if (policy.rawAnalysis?.copay && policy.rawAnalysis.copay !== "Not specified" && policy.rawAnalysis.copay !== "None") items.push({ severity: "info", title: "Co-pay applies", desc: policy.rawAnalysis.copay, source: "Section 3 - Cost Sharing" })
    if (!items.length) items.push({ severity: "info", title: "No critical risks detected", desc: "Preliminary scan shows standard coverage terms.", source: "AI Analysis" })
    return items
  }

  const handleDeleteClick = (e: React.MouseEvent, policyId: string) => {
    e.stopPropagation()
    setDeleteTargetId(policyId)
    setDeleteDialogOpen(true)
  }

  const handleDeleteConfirm = async () => {
    if (!deleteTargetId) return
    setIsDeleting(true)
    try {
      const supabase = await getSupabase()
      const session = await supabase.auth.getSession()
      const token = session.data.session?.access_token
      const deleteUrl = createApiUrlWithLogging(`/policies/${deleteTargetId}`)
      const response = await fetchWithTimeout(deleteUrl, {
        method: "DELETE",
        headers: token ? { Authorization: `Bearer ${token}` } : undefined,
        timeoutMs: 12000,
      })
      if (!response.ok) {
        let errorMessage = "Failed to delete policy"
        try { const errorData = await response.json(); errorMessage = errorData.detail || errorMessage } catch { errorMessage = `Error ${response.status}` }
        throw new Error(errorMessage)
      }
      const updatedIds = policies.filter(p => p.id !== deleteTargetId).map(p => p.id)
      if (selectedPolicyId === deleteTargetId) setSelectedPolicyId(updatedIds.length > 0 ? updatedIds[0] : "")
      localStorage.setItem("claimwise_uploaded_policy_ids", JSON.stringify(updatedIds))
      queryClient.invalidateQueries({ queryKey: ["policies"] })
      toast.success("Policy deleted")
    } catch (err: unknown) {
      toast.error(err instanceof Error ? err.message : "Delete failed")
    } finally {
      setIsDeleting(false)
      setDeleteDialogOpen(false)
      setDeleteTargetId(null)
    }
  }

  return (
    <ProtectedRoute>
      <ErrorBoundary>
      <div className="h-screen flex flex-col bg-background overflow-hidden">
        <Header />
        <main className="flex-1 overflow-hidden">
          <PageWrapper className="h-full">
            {loading ? (
              <div className="flex flex-col h-full">
                <div className="flex-1 flex">
                  <div className="w-64 border-r bg-muted/20 p-4 space-y-3">
                    <Skeleton className="h-4 w-24" />
                    {[1, 2, 3].map((i) => <Skeleton key={i} className="h-16 w-full rounded-lg" />)}
                  </div>
                  <div className="flex-1 p-6 space-y-6">
                    <Skeleton className="h-8 w-64" />
                    <div className="grid grid-cols-3 gap-4">
                      <Skeleton className="h-24 rounded-xl" />
                      <Skeleton className="h-24 rounded-xl" />
                      <Skeleton className="h-24 rounded-xl" />
                    </div>
                    <Skeleton className="h-48 rounded-xl" />
                  </div>
                </div>
              </div>
            ) : isError ? (
              <div className="flex items-center justify-center h-full">
                <div className="text-center space-y-4 max-w-md mx-auto p-6">
                  <AlertTriangle className="h-12 w-12 text-destructive mx-auto" />
                  <h3 className="text-lg font-medium">Analysis Error</h3>
                  <p className="text-muted-foreground">Failed to load policies. Please try again.</p>
                  <Button onClick={() => window.location.reload()}>Try Again</Button>
                </div>
              </div>
            ) : policies.length === 0 ? (
              <div className="flex items-center justify-center h-full">
                <div className="text-center space-y-4 max-w-md mx-auto p-6">
                  <FileText className="h-12 w-12 text-muted-foreground mx-auto opacity-40" />
                  <h3 className="text-lg font-medium">No policies found</h3>
                  <p className="text-muted-foreground">Upload a policy to get started with AI-powered analysis.</p>
                  <Button asChild><Link href="/upload">Upload Policy</Link></Button>
                </div>
              </div>
            ) : (
              <div className="h-full flex">
                {sidebarOpen && (
                  <div className="w-64 border-r bg-muted/20 flex flex-col shrink-0">
                    <div className="flex items-center justify-between p-4 border-b">
                      <h2 className="text-sm font-medium flex items-center gap-2">
                        <FileText className="h-4 w-4" />
                        Documents
                      </h2>
                      <Button variant="ghost" size="icon" className="h-6 w-6" onClick={() => setSidebarOpen(false)}>
                        <ChevronRight className="h-3 w-3" />
                      </Button>
                    </div>
                    <ScrollArea className="flex-1">
                      <div className="p-3 space-y-1">
                        {policies.map((policy) => (
                          <div key={policy.id} className="group">
                            <div
                              onClick={() => setSelectedPolicyId(policy.id)}
                              role="button"
                              tabIndex={0}
                              onKeyDown={(e) => { if (e.key === "Enter" || e.key === " ") setSelectedPolicyId(policy.id) }}
                              className={cn(
                                "cursor-pointer w-full text-left px-3 py-2.5 rounded-lg text-sm transition-colors",
                                selectedPolicyId === policy.id
                                  ? "bg-muted font-medium"
                                  : "hover:bg-muted/50 text-muted-foreground hover:text-foreground",
                              )}
                            >
                              <div className="flex items-start justify-between gap-2">
                                <span className="line-clamp-1">{policy.fileName}</span>
                                <button onClick={(e) => handleDeleteClick(e, policy.id)} className="opacity-40 group-hover:opacity-100 text-muted-foreground hover:text-destructive shrink-0">
                                  <Trash2 className="h-3 w-3" />
                                </button>
                              </div>
                              <div className="flex items-center gap-2 mt-1">
                                <Badge variant="secondary" className="text-[10px] h-4 px-1 font-normal">{policy.policyType}</Badge>
                                <span className="text-xs text-muted-foreground">{policy.provider}</span>
                              </div>
                            </div>
                          </div>
                        ))}
                      </div>
                    </ScrollArea>
                    <div className="p-3 border-t">
                      <Button variant="outline" className="w-full text-xs h-8" asChild>
                        <Link href="/upload"><ArrowLeft className="h-3 w-3 mr-2" />Upload New</Link>
                      </Button>
                    </div>
                  </div>
                )}

                <div className="flex-1 flex flex-col min-w-0">
                  {!sidebarOpen && (
                    <div className="border-b px-4 py-2">
                      <Button variant="ghost" size="sm" onClick={() => setSidebarOpen(true)}>
                        <FileText className="h-4 w-4 mr-2" />Show Documents
                      </Button>
                    </div>
                  )}

                  {currentPolicy ? (
                    <ScrollArea className="flex-1">
                      <div className="max-w-5xl mx-auto p-6 lg:p-8 space-y-8 pb-24">
                        <div className="flex items-start justify-between gap-4">
                          <div>
                            <div className="flex items-center gap-2 text-sm text-muted-foreground mb-1">
                              <span>{currentPolicy.provider}</span>
                              <span>·</span>
                              <span>{currentPolicy.policyType}</span>
                            </div>
                            <h1 className="font-serif text-2xl font-normal tracking-tight">{currentPolicy.fileName}</h1>
                          </div>
                          <div className="flex items-center gap-2 shrink-0">
                            <Button variant="outline" size="sm" asChild>
                              <Link href="/compare"><BarChart3 className="h-4 w-4 mr-2" />Compare</Link>
                            </Button>
                            <Button size="sm" asChild>
                              <Link href="/chat"><MessageSquare className="h-4 w-4 mr-2" />Ask AI</Link>
                            </Button>
                          </div>
                        </div>

                        <div className="grid grid-cols-3 gap-4">
                          {[
                            { label: "Annual Premium", value: currentPolicy.premium },
                            { label: "Coverage Amount", value: currentPolicy.coverageAmount },
                            { label: "Deductible", value: currentPolicy.deductible },
                          ].map((stat) => (
                            <div key={stat.label} className="card-flat-subtle space-y-1">
                              <p className="metric-label">{stat.label}</p>
                              <p className={cn("font-mono text-lg font-semibold", stat.value === "Not specified" && "text-muted-foreground italic text-sm font-normal")}>
                                {stat.value !== "Not specified" ? stat.value : "N/A"}
                              </p>
                            </div>
                          ))}
                        </div>

                        <div className="rounded-xl border bg-card p-6">
                          <div className="flex items-center justify-between mb-5">
                            <h2 className="text-base font-semibold tracking-tight">Executive Summary</h2>
                            <div className="flex items-center gap-2">
                              <span className="metric-label">Claim Readiness</span>
                              <span className={cn("font-serif text-xl", getClaimScore(currentPolicy) >= 75 ? "text-[hsl(var(--success))]" : getClaimScore(currentPolicy) >= 40 ? "text-[hsl(var(--warning))]" : "text-[hsl(var(--critical))]")}>
                                {getClaimScore(currentPolicy)}/100
                              </span>
                            </div>
                          </div>

                          <div className="space-y-3">
                            {getRiskItems(currentPolicy).map((item, i) => (
                              <div key={i} className={`flex gap-3 rounded-lg p-4 priority-${item.severity}`}>
                                {item.severity === "critical" ? <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0 text-[hsl(var(--critical))]" /> :
                                 item.severity === "warning" ? <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0 text-[hsl(var(--warning))]" /> :
                                 <Lightbulb className="mt-0.5 h-4 w-4 shrink-0 text-[hsl(var(--info))]" />}
                                <div className="min-w-0 flex-1">
                                  <div className="flex items-start justify-between gap-2">
                                    <p className="text-sm font-medium">{item.title}</p>
                                    {item.source && (
                                      <span className="text-xs text-muted-foreground shrink-0 flex items-center gap-1">
                                        <ScrollText className="h-3 w-3" />
                                        {item.source}
                                      </span>
                                    )}
                                  </div>
                                  <p className="text-sm text-muted-foreground mt-0.5">{item.desc}</p>
                                </div>
                              </div>
                            ))}
                          </div>
                          {getClaimScore(currentPolicy) < 60 && (
                            <div className="flex gap-3 pt-2">
                              <Button size="sm" asChild>
                                <Link href={`/chat?policy=${currentPolicy.id}`}>
                                  <MessageSquare className="h-3.5 w-3.5 mr-1.5" />Review Coverage Gaps
                                </Link>
                              </Button>
                              <Button variant="outline" size="sm" onClick={() => setTabValue("insights")}>
                                <Lightbulb className="h-3.5 w-3.5 mr-1.5" />Get Recommendations
                              </Button>
                            </div>
                          )}
                        </div>

                        <Tabs value={tabValue} onValueChange={setTabValue} className="w-full">
                          <TabsList className="bg-muted/40">
                            <TabsTrigger value="analysis">Analysis</TabsTrigger>
                            <TabsTrigger value="insights">Smart Insights</TabsTrigger>
                            <TabsTrigger value="features">Features & Exclusions</TabsTrigger>
                          </TabsList>

                          <TabsContent value="analysis" className="mt-6 space-y-6">
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                              <div className="card-flat-subtle space-y-4">
                                <h3 className="text-sm font-medium flex items-center gap-2">
                                  <Shield className="h-4 w-4" />
                                  Coverage Details
                                </h3>
                                <div className="space-y-3">
                                  {[
                                    { label: "Premium", value: currentPolicy.premium },
                                    { label: "Coverage", value: currentPolicy.coverageAmount },
                                    { label: "Deductible", value: currentPolicy.deductible },
                                    { label: "Expiration", value: currentPolicy.expirationDate },
                                    { label: "Provider", value: currentPolicy.provider },
                                  ].map((item) => (
                                    <div key={item.label} className="flex justify-between text-sm">
                                      <span className="text-muted-foreground">{item.label}</span>
                                      <span className="font-medium">{item.value !== "Not specified" ? item.value : "—"}</span>
                                    </div>
                                  ))}
                                </div>
                              </div>

                              <div className="card-flat-subtle space-y-4">
                                <h3 className="text-sm font-medium flex items-center gap-2">
                                  <CheckCircle className="h-4 w-4 text-[hsl(var(--success))]" />
                                  Key Features
                                </h3>
                                <ul className="space-y-2">
                                  {currentPolicy.keyFeatures.map((feature, i) => (
                                    <li key={i} className="flex items-start gap-2 text-sm text-muted-foreground">
                                      <CheckCircle className="h-3.5 w-3.5 mt-0.5 shrink-0 text-[hsl(var(--success))]" />
                                      {feature}
                                    </li>
                                  ))}
                                </ul>
                              </div>
                            </div>

                            <Accordion type="single" collapsible className="w-full border rounded-xl">
                              <AccordionItem value="exclusions">
                                <AccordionTrigger className="px-4 py-3 text-sm font-medium hover:no-underline">
                                  Exclusions & Limitations
                                </AccordionTrigger>
                                <AccordionContent className="px-4 pb-4">
                                  <div className="text-sm text-muted-foreground leading-relaxed">
                                    {currentPolicy.rawAnalysis?.exclusions ? (
                                      <div className="whitespace-pre-line">{currentPolicy.rawAnalysis.exclusions}</div>
                                    ) : (
                                      <p className="italic">No specific exclusions detected in the summary analysis. Review the full policy document for complete terms.</p>
                                    )}
                                  </div>
                                </AccordionContent>
                              </AccordionItem>
                              <AccordionItem value="waiting" className="border-t">
                                <AccordionTrigger className="px-4 py-3 text-sm font-medium hover:no-underline">
                                  Waiting Periods
                                </AccordionTrigger>
                                <AccordionContent className="px-4 pb-4">
                                  <div className="text-sm text-muted-foreground leading-relaxed">
                                    {currentPolicy.rawAnalysis?.waiting_period && currentPolicy.rawAnalysis.waiting_period !== "Not specified" ? (
                                      <div className="whitespace-pre-line">{currentPolicy.rawAnalysis.waiting_period}</div>
                                    ) : (
                                      <p className="italic">Waiting periods not explicitly extracted. Please check the full policy document.</p>
                                    )}
                                  </div>
                                </AccordionContent>
                              </AccordionItem>
                            </Accordion>
                          </TabsContent>

                          <TabsContent value="insights" className="mt-6">
                            <InsightsPanel insights={[]} recommendations={[]} />
                          </TabsContent>

                          <TabsContent value="features" className="mt-6">
                            <div className="space-y-4">
                              {currentPolicy.keyFeatures.map((feature, i) => (
                                <div key={i} className="flex items-start gap-3 rounded-xl border bg-card p-4">
                                  <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg border bg-muted/40">
                                    <CheckCircle className="h-4 w-4 text-[hsl(var(--success))]" />
                                  </div>
                                  <div>
                                    <p className="text-sm font-medium">Feature {i + 1}</p>
                                    <p className="text-sm text-muted-foreground mt-0.5">{feature}</p>
                                  </div>
                                </div>
                              ))}
                              {currentPolicy.rawAnalysis?.exclusions && (
                                <div className="flex items-start gap-3 rounded-xl border bg-card p-4">
                                  <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg border bg-destructive/10">
                                    <AlertTriangle className="h-4 w-4 text-destructive" />
                                  </div>
                                  <div>
                                    <p className="text-sm font-medium">Exclusions</p>
                                    <p className="text-sm text-muted-foreground mt-0.5">{currentPolicy.rawAnalysis.exclusions.slice(0, 200)}</p>
                                  </div>
                                </div>
                              )}
                            </div>
                          </TabsContent>
                        </Tabs>
                      </div>
                    </ScrollArea>
                  ) : (
                    <div className="flex flex-col items-center justify-center h-full text-muted-foreground">
                      <FileText className="h-16 w-16 mb-4 opacity-20" />
                      <p className="text-lg font-medium">Select a policy to view analysis</p>
                      <p className="text-sm">Choose a document from the sidebar</p>
                    </div>
                  )}
                </div>
              </div>
            )}
          </PageWrapper>
        </main>
      </div>

      <AlertDialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Policy</AlertDialogTitle>
            <AlertDialogDescription>Are you sure you want to delete this policy? This action cannot be undone.</AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={isDeleting}>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={handleDeleteConfirm} disabled={isDeleting} className="bg-destructive hover:bg-destructive/90">
              {isDeleting ? <span className="flex items-center gap-2"><div className="h-4 w-4 rounded-full border-2 border-background border-t-transparent animate-spin" />Deleting...</span> : "Delete"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
      </ErrorBoundary>
    </ProtectedRoute>
  )
}
