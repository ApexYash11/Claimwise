"use client"

import { useState, useRef, useEffect } from "react"
import dynamic from "next/dynamic"
import { ProtectedRoute } from "@/components/auth/protected-route"
import { Header } from "@/components/layout/header"
import { Button } from "@/components/ui/button"
import { ArrowLeft, MessageSquare, Bot, FileText, Globe, History, Sparkles, ScrollText, BarChart3, CheckCircle2, Lightbulb, AlertTriangle } from "lucide-react"
import Link from "next/link"
import type { PolicySummary } from "@/types/policies"
import { PageWrapper } from "@/components/motion/page-wrapper"
import { Skeleton } from "@/components/ui/skeleton"

import { getSupabase } from "@/lib/get-supabase"
import { createApiUrlWithLogging } from "@/lib/url-utils"
import { fetchWithTimeout } from "@/lib/fetch-with-timeout"
import type { BackendHistoryResponse } from "@/types/history"
import { usePolicies, useHistory } from "@/lib/use-queries"

const Message = dynamic(() => import("@/components/chat/message").then((mod) => ({ default: mod.Message })), {
  loading: () => <div className="h-24 w-full rounded-lg bg-muted animate-pulse" />,
  ssr: false,
})

const ChatInput = dynamic(() => import("@/components/chat/chat-input").then((mod) => ({ default: mod.ChatInput })), {
  loading: () => <div className="h-16 w-full rounded-lg bg-muted animate-pulse" />,
  ssr: false,
})

interface ChatMessage {
  id: string
  content: string
  role: "user" | "assistant"
  timestamp: Date
  policyReferences?: string[]
  policyId?: string
}

const QUICK_ACTIONS = [
  { icon: ScrollText, label: "Summarize Policy", action: "Summarize my policy coverage in 3 bullet points" },
  { icon: AlertTriangle, label: "Find Exclusions", action: "What are the key exclusions I should know about?" },
  { icon: BarChart3, label: "Compare Policies", action: "Compare my policies side by side" },
  { icon: CheckCircle2, label: "Claim Checklist", action: "What do I need to file a claim?" },
  { icon: Lightbulb, label: "Optimize Premium", action: "How can I reduce my premium?" },
  { icon: Globe, label: "Ask Anything", action: "" },
]

export default function ChatPage() {
  const [messages, setMessages] = useState<ChatMessage[]>([])
  const [selectedPolicyId, setSelectedPolicyId] = useState<string>("all")
  const [isLoading, setIsLoading] = useState(false)
  const [streamingMessageId, setStreamingMessageId] = useState<string | null>(null)
  const { data: policiesData, isLoading: loadingPolicies } = usePolicies()
  const { data: historyData } = useHistory(1, 25)
  const [historyPage, setHistoryPage] = useState(1)
  const [hasMoreHistory, setHasMoreHistory] = useState(false)
  const [loadingMoreHistory, setLoadingMoreHistory] = useState(false)
  const messagesEndRef = useRef<HTMLDivElement>(null)

  const mapServerHistoryToMessages = (historyData: BackendHistoryResponse): ChatMessage[] => {
    const serverMessages: ChatMessage[] = []
    if (historyData?.chat_logs && Array.isArray(historyData.chat_logs)) {
      historyData.chat_logs.forEach((chat) => {
        serverMessages.push({ id: `user_${chat.id}`, content: chat.question, role: "user", timestamp: new Date(chat.created_at), policyId: chat.policy_id })
        serverMessages.push({ id: `assistant_${chat.id}`, content: chat.answer, role: "assistant", timestamp: new Date(chat.created_at), policyId: chat.policy_id })
      })
    }
    return serverMessages
  }

  const scrollToBottom = () => messagesEndRef.current?.scrollIntoView({ behavior: "smooth" })

  useEffect(() => { scrollToBottom() }, [messages])

  const mapPolicyFromBackend = (policy: any): PolicySummary => {
    const analysis = policy?.validation_metadata?.analysis_result || {}
    return {
      id: policy.id,
      fileName: policy.policy_name || (policy.policy_number ? `Policy ${policy.policy_number}` : `Policy ${String(policy.id).slice(-8)}`),
      policyType: analysis.policy_type || policy.policy_type || "Unknown",
      provider: analysis.provider || policy.provider || "Unknown Provider",
      premium: analysis.premium || "Not specified",
      coverageAmount: analysis.coverage_amount || "Not specified",
      deductible: analysis.deductible || "Not specified",
      keyFeatures: Array.isArray(analysis.key_features) ? analysis.key_features : [],
      expirationDate: analysis.expiration_date || "Not specified",
      rawAnalysis: analysis,
    }
  }

  const policies: PolicySummary[] = policiesData?.policies?.map(mapPolicyFromBackend) ?? []
  const serverHistoryMessages = mapServerHistoryToMessages(historyData)

  useEffect(() => {
    if (policies.length > 0 && selectedPolicyId === "all") {
      setSelectedPolicyId(policies[0].id)
    }
  }, [policies])

  useEffect(() => {
    if (serverHistoryMessages.length > 0 && messages.length === 0) {
      setMessages(serverHistoryMessages)
      setHasMoreHistory(Boolean(historyData?.pagination?.has_more_chat_logs))
    }
  }, [serverHistoryMessages])

  const handleLoadOlderHistory = async () => {
    if (loadingMoreHistory || !hasMoreHistory) return
    try {
      setLoadingMoreHistory(true)
      const nextPage = historyPage + 1
      const supabase = await getSupabase()
      const session = await supabase.auth.getSession()
      const token = session.data.session?.access_token
      if (!token) return
      const historyUrl = `${createApiUrlWithLogging("/history")}?page=${nextPage}&page_size=25`
      const response = await fetchWithTimeout(historyUrl, { headers: { Authorization: `Bearer ${token}` }, timeoutMs: 12000 })
      if (!response.ok) return
      const hData = (await response.json()) as BackendHistoryResponse
      const olderMessages = mapServerHistoryToMessages(hData)
      if (olderMessages.length === 0) { setHasMoreHistory(false); return }
      setMessages((prev) => { const existingIds = new Set(prev.map((m) => m.id)); const deduped = olderMessages.filter((m) => !existingIds.has(m.id)); return [...deduped, ...prev] })
      setHistoryPage(nextPage)
      setHasMoreHistory(Boolean(hData?.pagination?.has_more_chat_logs))
    } catch { } finally { setLoadingMoreHistory(false) }
  }

  const handleSendMessage = async (content: string) => {
    const userMessage: ChatMessage = { id: Date.now().toString(), content, role: "user", timestamp: new Date() }
    setMessages((prev) => [...prev, userMessage])
    setIsLoading(true)

    try {
      const supabase = await getSupabase()
      const session = await supabase.auth.getSession()
      const token = session.data.session?.access_token
      if (!token) throw new Error("Authentication required")

      let assistantMessage: ChatMessage

      if (selectedPolicyId === "all") {
        const multiChatUrl = createApiUrlWithLogging("/chat-multiple")
        const multiResponse = await fetch(multiChatUrl, { method: "POST", headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" }, body: JSON.stringify({ question: content }) })
        if (!multiResponse.ok) throw new Error("Failed to get answer")
        const multiData = await multiResponse.json()
        const combinedAnswer = String(multiData?.answer || "")
        const policyRefs: string[] = policies.map((p) => p.fileName).slice(0, 5)
        if (!combinedAnswer) throw new Error("No policies contain enough information to answer.")
        assistantMessage = { id: (Date.now() + 1).toString(), content: combinedAnswer, role: "assistant", timestamp: new Date(), policyReferences: policyRefs }
      } else {
        const chatUrl = createApiUrlWithLogging("/chat")
        const response = await fetch(chatUrl, { method: "POST", headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" }, body: JSON.stringify({ policy_id: selectedPolicyId, question: content }) })
        if (!response.ok) { if (response.status === 404) throw new Error("Policy not found"); throw new Error(`API error: ${response.status}`) }
        const data = await response.json()
        const selectedPolicy = policies.find((p) => p.id === selectedPolicyId)
        assistantMessage = { id: (Date.now() + 1).toString(), content: data.answer, role: "assistant", timestamp: new Date(), policyReferences: selectedPolicy ? [selectedPolicy.fileName] : [], policyId: selectedPolicyId }
      }

      const newMessages = [...messages, userMessage, assistantMessage]
      setMessages(newMessages)
      setStreamingMessageId(assistantMessage.id)
    } catch { } finally {
      setIsLoading(false)
    }
  }

  const getCurrentPolicyName = () => {
    if (selectedPolicyId === "all") return "All Policies"
    const policy = policies.find((p) => p.id === selectedPolicyId)
    return policy ? policy.fileName : "Select Policy"
  }

  return (
    <ProtectedRoute>
      <div className="h-screen flex flex-col bg-background overflow-hidden">
        <Header />
        <PageWrapper>
          <div className="flex-1 flex flex-col max-w-7xl mx-auto w-full px-6 py-6 overflow-hidden">
            <div className="flex items-center justify-between mb-4 shrink-0">
              <Button variant="ghost" asChild className="text-muted-foreground">
                <Link href="/dashboard"><ArrowLeft className="h-4 w-4 mr-2" />Dashboard</Link>
              </Button>
              {messages.length > 0 && (
                <Button variant="ghost" size="sm" className="text-muted-foreground" onClick={async () => {
                  setMessages([]); setStreamingMessageId(null)
                  const supabase = await getSupabase(); const s = await supabase.auth.getSession(); const u = s.data.session?.user
                  if (u) localStorage.removeItem(`claimwise_chat_history_${u.id}`)
                  localStorage.removeItem("claimwise_chat_history")
                }}>
                  <History className="h-4 w-4 mr-2" />Clear
                </Button>
              )}
            </div>

            <div className="flex-1 flex gap-6 min-h-0">
              <div className="flex-1 flex flex-col min-h-0">
                {!loadingPolicies && policies.length > 0 && (
                  <div className="flex items-center gap-3 mb-4 shrink-0 overflow-x-auto pb-2">
                    <span className="text-sm text-muted-foreground whitespace-nowrap">Ask about:</span>
                    <button onClick={() => setSelectedPolicyId("all")} className={`whitespace-nowrap inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-medium transition-colors ${selectedPolicyId === "all" ? "bg-foreground text-background" : "bg-muted text-muted-foreground hover:bg-muted/80"}`}>
                      <Globe className="h-3 w-3" />All Policies
                    </button>
                    {policies.slice(0, 6).map((policy) => (
                      <button key={policy.id} onClick={() => setSelectedPolicyId(policy.id)} className={`whitespace-nowrap inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-medium transition-colors ${selectedPolicyId === policy.id ? "bg-foreground text-background" : "bg-muted text-muted-foreground hover:bg-muted/80"}`}>
                        <FileText className="h-3 w-3" />{policy.fileName.length > 20 ? policy.fileName.slice(0, 20) + "..." : policy.fileName}
                      </button>
                    ))}
                  </div>
                )}

                <div className="flex-1 flex flex-col min-h-0 rounded-xl border bg-card">
                  <div className="flex-1 overflow-y-auto p-6">
                    {loadingPolicies ? (
                      <div className="space-y-4">
                        <Skeleton className="h-10 w-48 mx-auto" />
                        <Skeleton className="h-24 w-full" />
                        <Skeleton className="h-24 w-3/4" />
                      </div>
                    ) : policies.length === 0 ? (
                      <div className="flex flex-col items-center justify-center h-full text-center">
                        <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-muted mb-4">
                          <FileText className="h-6 w-6" />
                        </div>
                        <h2 className="text-lg font-semibold tracking-tight">No policies uploaded</h2>
                        <p className="text-sm text-muted-foreground mt-1 mb-6">Upload an insurance policy to start asking questions.</p>
                        <Button asChild><Link href="/upload">Upload Policy</Link></Button>
                      </div>
                    ) : messages.length === 0 ? (
                      <div className="flex flex-col items-center justify-center h-full text-center max-w-lg mx-auto">
                        <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-[hsl(var(--success)/0.1)] mb-4">
                          <MessageSquare className="h-6 w-6 text-[hsl(var(--success))]" />
                        </div>
                        <h2 className="text-lg font-semibold tracking-tight">Ask about your policies</h2>
                        <p className="text-sm text-muted-foreground mt-1 mb-8">
                          I can answer questions about coverage, exclusions, claims, and more across {policies.length} policy{policies.length > 1 ? "ies" : "y"}.
                        </p>
                        <div className="grid grid-cols-2 gap-2 w-full max-w-sm">
                          {QUICK_ACTIONS.filter((a) => a.action).map((action) => (
                            <button key={action.label} onClick={() => handleSendMessage(action.action)}
                              className="flex items-center gap-2 rounded-lg border bg-card p-3 text-left text-sm transition-colors hover:bg-muted/50">
                              <action.icon className="h-4 w-4 shrink-0 text-muted-foreground" />
                              <span className="text-xs">{action.label}</span>
                            </button>
                          ))}
                        </div>
                      </div>
                    ) : (
                      <div className="max-w-3xl mx-auto space-y-6">
                        {hasMoreHistory && (
                          <div className="flex justify-center">
                            <Button variant="outline" size="sm" onClick={handleLoadOlderHistory} disabled={loadingMoreHistory}>
                              {loadingMoreHistory ? "Loading..." : "Load older messages"}
                            </Button>
                          </div>
                        )}
                        {messages.map((message) => (
                          <Message key={message.id} message={message} onCopy={(c) => navigator.clipboard.writeText(c)} onFeedback={() => {}} isStreaming={message.role === "assistant" && message.id === streamingMessageId} />
                        ))}
                        {isLoading && (
                          <div className="flex gap-3">
                            <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-muted">
                              <Bot className="h-4 w-4" />
                            </div>
                            <div className="rounded-xl bg-muted/40 px-4 py-3">
                              <div className="flex items-center gap-1.5 h-4">
                                <div className="w-1.5 h-1.5 rounded-full bg-muted-foreground typing-dot" />
                                <div className="w-1.5 h-1.5 rounded-full bg-muted-foreground typing-dot" style={{ animationDelay: "0.2s" }} />
                                <div className="w-1.5 h-1.5 rounded-full bg-muted-foreground typing-dot" style={{ animationDelay: "0.4s" }} />
                              </div>
                            </div>
                          </div>
                        )}
                        <div ref={messagesEndRef} />
                      </div>
                    )}
                  </div>

                  {policies.length > 0 && (
                    <div className="border-t p-4">
                      <ChatInput onSendMessage={handleSendMessage} isLoading={isLoading} placeholder={
                        selectedPolicyId === "all" ? "Ask about any of your policies..." : `Ask about ${getCurrentPolicyName()}...`
                      } />
                    </div>
                  )}
                </div>

                {policies.length > 0 && (
                  <div className="mt-3 flex items-center gap-2 text-xs text-muted-foreground">
                    <Sparkles className="h-3 w-3" />
                    AI responses are based on your policy documents. Verify critical decisions with your insurer.
                  </div>
                )}
              </div>

              {messages.length === 0 && policies.length > 0 && (
                <div className="w-64 shrink-0 hidden lg:block">
                  <div className="rounded-xl border bg-card p-5 space-y-4">
                    <p className="text-xs font-medium uppercase tracking-wider text-muted-foreground">Quick Actions</p>
                    <div className="space-y-2">
                      {QUICK_ACTIONS.map((action) => (
                        <button key={action.label} onClick={() => action.action && handleSendMessage(action.action)}
                          className="flex w-full items-center gap-3 rounded-lg p-2.5 text-left text-sm transition-colors hover:bg-muted/50">
                          <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-md border bg-muted/40">
                            <action.icon className="h-3.5 w-3.5" />
                          </div>
                          <span className="text-xs">{action.label}</span>
                        </button>
                      ))}
                    </div>
                  </div>
                </div>
              )}
            </div>
          </div>
        </PageWrapper>
      </div>
    </ProtectedRoute>
  )
}
