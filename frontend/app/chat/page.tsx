"use client"

import { useState, useRef, useEffect } from "react"
import { ProtectedRoute } from "@/components/auth/protected-route"
import { Header } from "@/components/layout/header"
import { Message } from "@/components/chat/message"
import { SuggestedQuestions } from "@/components/chat/suggested-questions"
import { ChatInput } from "@/components/chat/chat-input"
import { Button } from "@/components/ui/button"
import { Card, CardContent } from "@/components/ui/card"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Badge } from "@/components/ui/badge"
import { ArrowLeft, MessageSquare, Bot, AlertCircle, FileText, Globe, History } from "lucide-react"
import Link from "next/link"
import { supabase } from "@/lib/supabase"
import type { PolicySummary } from "@/lib/api"

import { createApiUrlWithLogging } from "@/lib/url-utils"
import { fetchWithTimeout } from "@/lib/fetch-with-timeout"

interface ChatMessage {
  id: string
  content: string
  role: "user" | "assistant"
  timestamp: Date
  policyReferences?: string[]
  policyId?: string
}

export default function ChatPage() {
  const [messages, setMessages] = useState<ChatMessage[]>([])
  const [policies, setPolicies] = useState<PolicySummary[]>([])
  const [selectedPolicyId, setSelectedPolicyId] = useState<string>("all")
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState("")
  const [chatHistory, setChatHistory] = useState<ChatMessage[]>([])
  const [loadingPolicies, setLoadingPolicies] = useState(true)
  const [historyPage, setHistoryPage] = useState(1)
  const [hasMoreHistory, setHasMoreHistory] = useState(false)
  const [loadingMoreHistory, setLoadingMoreHistory] = useState(false)
  const messagesEndRef = useRef<HTMLDivElement>(null)

  const mapServerHistoryToMessages = (historyData: any): ChatMessage[] => {
    const serverMessages: ChatMessage[] = []
    if (historyData?.chat_logs && Array.isArray(historyData.chat_logs)) {
      historyData.chat_logs.forEach((chat: any) => {
        serverMessages.push({
          id: `user_${chat.id}`,
          content: chat.question,
          role: "user",
          timestamp: new Date(chat.created_at),
          policyId: chat.policy_id,
        })
        serverMessages.push({
          id: `assistant_${chat.id}`,
          content: chat.answer,
          role: "assistant",
          timestamp: new Date(chat.created_at),
          policyId: chat.policy_id,
        })
      })
    }
    return serverMessages
  }

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" })
  }

  useEffect(() => {
    scrollToBottom()
  }, [messages])

  // Load user policies and chat history on component mount
  useEffect(() => {
    const controller = new AbortController()
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
        expirationDate: analysis.expiration_date || new Date(Date.now() + 365 * 24 * 60 * 60 * 1000).toISOString(),
        rawAnalysis: analysis,
      }
    }

    const loadPoliciesAndHistory = async () => {
      try {
        // Load policies via backend API
        const session = await supabase.auth.getSession()
        const token = session.data.session?.access_token
        const user = session.data.session?.user

        if (!user) {
          setError("Please log in to access your policies")
          setLoadingPolicies(false)
          return
        }

        const policiesUrl = createApiUrlWithLogging("/policies")
        const policiesResponse = await fetchWithTimeout(policiesUrl, {
          headers: token ? { Authorization: `Bearer ${token}` } : undefined,
          timeoutMs: 12000,
          signal: controller.signal,
        })

        if (!policiesResponse.ok) {
          setError("Failed to load policies")
          setLoadingPolicies(false)
          return
        }

        const policyPayload = await policiesResponse.json()
        const backendPolicies = Array.isArray(policyPayload?.policies) ? policyPayload.policies : []
        const loadedPolicies = backendPolicies.map(mapPolicyFromBackend)
        setPolicies(loadedPolicies)

        if (loadedPolicies.length > 0) {
          setSelectedPolicyId(loadedPolicies[0].id)
        }

        // Load chat history from server first, with localStorage fallback
        try {
          console.log("Loading chat history from server...")
          const chatHistoryUrl = `${createApiUrlWithLogging("/history")}?page=1&page_size=25`
          const historyResponse = await fetchWithTimeout(chatHistoryUrl, {
            headers: token ? { Authorization: `Bearer ${token}` } : undefined,
            timeoutMs: 12000,
            signal: controller.signal,
          })
          
          if (historyResponse.ok) {
            const historyData = await historyResponse.json()
            const serverMessages = mapServerHistoryToMessages(historyData)
            
            setChatHistory(serverMessages)
            setMessages(serverMessages)
            setHistoryPage(1)
            setHasMoreHistory(Boolean(historyData?.pagination?.has_more_chat_logs))
            console.log(`Loaded ${serverMessages.length} messages from server`)
          } else {
            console.warn("Failed to load chat history from server, using localStorage fallback")
            loadFromLocalStorage(user.id)
          }
        } catch (e) {
          if (e instanceof Error && e.name === "AbortError") {
            return
          }
          console.error("Error loading server chat history:", e)
          loadFromLocalStorage(user.id)
        }

      } catch (e) {
        if (e instanceof Error && e.name === "AbortError") {
          return
        }
        console.error("Error loading policies and history:", e)
        setError("Failed to load policies and chat history")
      } finally {
        setLoadingPolicies(false)
      }
    }

    // Helper function to load from user-specific localStorage
    const loadFromLocalStorage = (userId: string) => {
      const userSpecificKey = `claimwise_chat_history_${userId}`
      const storedHistory = localStorage.getItem(userSpecificKey)
      if (storedHistory) {
        const history = JSON.parse(storedHistory).map((msg: any) => ({
          ...msg,
          timestamp: new Date(msg.timestamp)
        }))
        setChatHistory(history)
        setMessages(history)
        console.log(`Loaded ${history.length} messages from localStorage (user-specific)`)
      }
    }

    loadPoliciesAndHistory()
    return () => controller.abort()
  }, [])

  const handleLoadOlderHistory = async () => {
    if (loadingMoreHistory || !hasMoreHistory) return

    try {
      setLoadingMoreHistory(true)
      const nextPage = historyPage + 1
      const session = await supabase.auth.getSession()
      const token = session.data.session?.access_token
      if (!token) return

      const historyUrl = `${createApiUrlWithLogging("/history")}?page=${nextPage}&page_size=25`
      const response = await fetchWithTimeout(historyUrl, {
        headers: { Authorization: `Bearer ${token}` },
        timeoutMs: 12000,
      })

      if (!response.ok) return

      const historyData = await response.json()
      const olderMessages = mapServerHistoryToMessages(historyData)

      if (olderMessages.length === 0) {
        setHasMoreHistory(false)
        return
      }

      setMessages((prev) => {
        const existingIds = new Set(prev.map((message) => message.id))
        const dedupedOlder = olderMessages.filter((message) => !existingIds.has(message.id))
        return [...dedupedOlder, ...prev]
      })
      setHistoryPage(nextPage)
      setHasMoreHistory(Boolean(historyData?.pagination?.has_more_chat_logs))
    } catch (err) {
      console.error("Failed to load older history:", err)
    } finally {
      setLoadingMoreHistory(false)
    }
  }

  // Smart policy selection based on question content
  const getSmartPolicySelection = (question: string): string => {
    const lowerQuestion = question.toLowerCase()
    
    // Health-related keywords
    if (lowerQuestion.includes("health") || lowerQuestion.includes("medical") || 
        lowerQuestion.includes("hospital") || lowerQuestion.includes("doctor") || 
        lowerQuestion.includes("medicine") || lowerQuestion.includes("surgery") || 
        lowerQuestion.includes("emergency") || lowerQuestion.includes("maternity")) {
      const healthPolicy = policies.find(p => p.policyType.toLowerCase().includes("health"))
      if (healthPolicy) return healthPolicy.id
    }
    
    // Auto-related keywords
    if (lowerQuestion.includes("car") || lowerQuestion.includes("auto") || 
        lowerQuestion.includes("vehicle") || lowerQuestion.includes("rental") || 
        lowerQuestion.includes("accident") || lowerQuestion.includes("collision")) {
      const autoPolicy = policies.find(p => p.policyType.toLowerCase().includes("auto"))
      if (autoPolicy) return autoPolicy.id
    }
    
    // Home-related keywords
    if (lowerQuestion.includes("home") || lowerQuestion.includes("house") || 
        lowerQuestion.includes("property") || lowerQuestion.includes("fire") || 
        lowerQuestion.includes("water") || lowerQuestion.includes("theft")) {
      const homePolicy = policies.find(p => p.policyType.toLowerCase().includes("home"))
      if (homePolicy) return homePolicy.id
    }
    
    // Life-related keywords
    if (lowerQuestion.includes("life") || lowerQuestion.includes("death") || 
        lowerQuestion.includes("beneficiary") || lowerQuestion.includes("term")) {
      const lifePolicy = policies.find(p => p.policyType.toLowerCase().includes("life"))
      if (lifePolicy) return lifePolicy.id
    }
    
    return selectedPolicyId // Return current selection if no smart match
  }

  const handleSendMessage = async (content: string) => {
    const userMessage: ChatMessage = {
      id: Date.now().toString(),
      content,
      role: "user",
      timestamp: new Date(),
    }

    setMessages((prev) => [...prev, userMessage])
    setIsLoading(true)
    setError("")

    try {
      const chatSession = await supabase.auth.getSession()
      const token = chatSession.data.session?.access_token
      
      if (!token) {
        throw new Error("Authentication required")
      }

      let response: Response
      let assistantMessage: ChatMessage

      if (selectedPolicyId === "all") {
        const multiChatUrl = createApiUrlWithLogging("/chat-multiple")
        const multiResponse = await fetch(multiChatUrl, {
          method: "POST",
          headers: {
            Authorization: `Bearer ${token}`,
            "Content-Type": "application/json",
          },
          body: JSON.stringify({ question: content }),
        })

        if (!multiResponse.ok) {
          throw new Error("Failed to get answer across all policies")
        }

        const multiData = await multiResponse.json()
        const combinedAnswer = String(multiData?.answer || "")
        const policyRefs: string[] = policies.map((policy) => policy.fileName).slice(0, 5)

        if (!combinedAnswer) {
          throw new Error("No policies contain enough information to answer your question. Please ensure you have uploaded complete insurance policy documents.")
        }

        assistantMessage = {
          id: (Date.now() + 1).toString(),
          content: combinedAnswer,
          role: "assistant",
          timestamp: new Date(),
          policyReferences: policyRefs,
        }
      } else {
        // Single policy chat
        const actualPolicyId = selectedPolicyId === "auto" ? getSmartPolicySelection(content) : selectedPolicyId
        
        const chatUrl = createApiUrlWithLogging("/chat");
        response = await fetch(chatUrl, {
          method: "POST",
          headers: {
            Authorization: `Bearer ${token}`,
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            policy_id: actualPolicyId,
            question: content,
          }),
        })

        if (!response.ok) {
          if (response.status === 404) {
            throw new Error("Selected policy not found")
          } else {
            throw new Error(`API error: ${response.status}`)
          }
        }

        const data = await response.json()
        const selectedPolicy = policies.find(p => p.id === actualPolicyId)
        
        assistantMessage = {
          id: (Date.now() + 1).toString(),
          content: data.answer,
          role: "assistant",
          timestamp: new Date(),
          policyReferences: selectedPolicy ? [selectedPolicy.fileName] : [],
          policyId: actualPolicyId,
        }
      }

      const newMessages = [...messages, userMessage, assistantMessage]
      setMessages(newMessages)
      
      // Save to user-specific localStorage as backup
      const saveSession = await supabase.auth.getSession()
      const user = saveSession.data.session?.user
      if (user) {
        const userSpecificKey = `claimwise_chat_history_${user.id}`
        localStorage.setItem(userSpecificKey, JSON.stringify(newMessages))
      }
      
      // Note: Server-side saving happens automatically in the backend via chat_logs table
      
    } catch (err) {
      console.error("Chat error:", err)
      setError(err instanceof Error ? err.message : "Failed to get response. Please try again.")
    } finally {
      setIsLoading(false)
    }
  }

  const handleQuestionSelect = (question: string) => {
    handleSendMessage(question)
  }

  const handleClearHistory = async () => {
    setMessages([])
    // Clear user-specific localStorage
    const session = await supabase.auth.getSession()
    const user = session.data.session?.user
    if (user) {
      const userSpecificKey = `claimwise_chat_history_${user.id}`
      localStorage.removeItem(userSpecificKey)
    }
    // Also clear the old global key for backward compatibility
    localStorage.removeItem("claimwise_chat_history")
  }

  const handleCopy = (content: string) => {
    navigator.clipboard.writeText(content)
    // You could show a toast notification here
  }

  const handleFeedback = (messageId: string, feedback: "positive" | "negative") => {
    // Send feedback to analytics service
    console.log("Feedback:", messageId, feedback)
  }

  const getCurrentPolicyName = () => {
    if (selectedPolicyId === "all") return "All Policies"
    if (selectedPolicyId === "auto") return "Smart Selection"
    const policy = policies.find(p => p.id === selectedPolicyId)
    return policy ? policy.fileName : "Select Policy"
  }

  return (
    <ProtectedRoute>
      <div className="min-h-screen bg-slate-50 dark:bg-slate-950">
        <Header />

        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
          {/* Back Button */}
          <div className="mb-8">
            <Button variant="ghost" asChild className="text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800 transition-all duration-200">
              <Link href="/dashboard">
                <ArrowLeft className="w-4 h-4 mr-2" />
                Back to Dashboard
              </Link>
            </Button>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-4 gap-8">
            {/* Chat Area */}
            <div className="lg:col-span-3 space-y-8">
              {/* Header with Policy Selector */}
              <div className="text-center">
                <div className="inline-flex items-center px-4 py-2 rounded-full bg-teal-50 border border-teal-200 text-teal-700 text-sm font-medium mb-6 dark:bg-teal-900/20 dark:border-teal-800 dark:text-teal-400">
                  <MessageSquare className="w-4 h-4 mr-2" />
                  AI Assistant
                </div>
                <h1 className="text-4xl lg:text-5xl font-bold font-serif text-slate-900 dark:text-white mb-6 tracking-tight">
                  Insurance Assistant
                </h1>
                <p className="text-xl text-slate-600 dark:text-slate-300 mb-8 leading-relaxed max-w-3xl mx-auto">
                  Ask questions about your policies and get instant, accurate answers powered by advanced AI.
                </p>

                {/* Policy Selector */}
                {!loadingPolicies && policies.length > 0 && (
                  <div className="flex flex-col sm:flex-row items-center justify-center gap-6 mb-8">
                    <div className="flex items-center space-x-3">
                      <div className="w-10 h-10 bg-slate-900 rounded-lg flex items-center justify-center">
                        <FileText className="w-5 h-5 text-white" />
                      </div>
                      <span className="text-base font-semibold text-slate-700 dark:text-slate-300">Ask about:</span>
                    </div>
                    <Select value={selectedPolicyId} onValueChange={setSelectedPolicyId}>
                      <SelectTrigger className="w-80 h-12 rounded-lg border-slate-200 dark:border-slate-700 shadow-sm hover:shadow-md transition-all duration-200 bg-white dark:bg-slate-800">
                        <SelectValue>
                          <div className="flex items-center space-x-3">
                            <span className="font-semibold text-slate-900 dark:text-slate-100">{getCurrentPolicyName()}</span>
                            {selectedPolicyId !== "all" && selectedPolicyId !== "auto" && (
                              <Badge variant="outline" className="text-xs font-medium bg-slate-50 dark:bg-slate-900 border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-300">
                                {policies.find(p => p.id === selectedPolicyId)?.policyType}
                              </Badge>
                            )}
                          </div>
                        </SelectValue>
                      </SelectTrigger>
                      <SelectContent className="rounded-lg shadow-lg border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900">
                        <SelectItem value="all" className="rounded-md p-3 hover:bg-slate-50 dark:hover:bg-slate-800 transition-all duration-200 cursor-pointer">
                          <div className="flex items-center space-x-3">
                            <div className="w-8 h-8 bg-slate-100 dark:bg-slate-800 rounded-md flex items-center justify-center">
                              <Globe className="w-4 h-4 text-slate-600 dark:text-slate-400" />
                            </div>
                            <span className="font-medium text-slate-900 dark:text-slate-100">All Policies (Comprehensive Search)</span>
                          </div>
                        </SelectItem>
                        <SelectItem value="auto" className="rounded-md p-3 hover:bg-slate-50 dark:hover:bg-slate-800 transition-all duration-200 cursor-pointer">
                          <div className="flex items-center space-x-3">
                            <div className="w-8 h-8 bg-teal-50 dark:bg-teal-900/20 rounded-md flex items-center justify-center">
                              <Bot className="w-4 h-4 text-teal-600 dark:text-teal-400" />
                            </div>
                            <span className="font-medium text-slate-900 dark:text-slate-100">Smart Selection (AI Picks Best Policy)</span>
                          </div>
                        </SelectItem>
                        {policies.map((policy) => (
                          <SelectItem key={policy.id} value={policy.id} className="rounded-md p-3 hover:bg-slate-50 dark:hover:bg-slate-800 transition-all duration-200 cursor-pointer">
                            <div className="flex items-center space-x-3">
                              <div className="w-8 h-8 bg-slate-100 dark:bg-slate-800 rounded-md flex items-center justify-center">
                                <FileText className="w-4 h-4 text-slate-600 dark:text-slate-400" />
                              </div>
                              <div className="flex flex-col">
                                <span className="font-medium text-slate-900 dark:text-slate-100">{policy.fileName}</span>
                                <Badge variant="outline" className="text-xs w-fit border-slate-200 text-slate-500">
                                  {policy.policyType}
                                </Badge>
                              </div>
                            </div>
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    
                    {messages.length > 0 && (
                      <Button 
                        variant="outline" 
                        size="sm" 
                        onClick={handleClearHistory}
                        className="flex items-center space-x-2 rounded-lg border-slate-200 dark:border-slate-700 hover:border-red-300 hover:text-red-600 dark:hover:border-red-500 dark:hover:text-red-400 transition-all duration-200 h-12 px-4"
                      >
                        <History className="w-4 h-4" />
                        <span>Clear History</span>
                      </Button>
                    )}
                  </div>
                )}
              </div>

              {/* Error Alert */}
              {error && (
                <Alert variant="destructive" className="mb-4">
                  <AlertCircle className="h-4 w-4" />
                  <AlertDescription>
                    {error}
                    {(error.includes("quota") || error.includes("429")) && (
                      <div className="mt-2 p-3 bg-orange-50 dark:bg-orange-950/50 border border-orange-200 dark:border-orange-800 rounded-lg">
                        <h4 className="font-semibold text-orange-800 dark:text-orange-200 mb-2">API Quota Exceeded - Solutions:</h4>
                        <ul className="text-sm text-orange-700 dark:text-orange-300 space-y-1">
                          <li>• Wait 24 hours for quota to reset</li>
                          <li>• Review policy documents directly from the analyze page</li>
                          <li>• Use the policy comparison feature instead</li>
                          <li>• Basic answers will be provided using pattern matching</li>
                        </ul>
                      </div>
                    )}
                  </AlertDescription>
                </Alert>
              )}

              {/* Messages */}
              <Card className="min-h-[500px] bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 shadow-sm rounded-xl">
                <CardContent className="p-8 text-slate-900 dark:text-slate-100">
                  {loadingPolicies ? (
                    <div className="text-center py-12">
                      <div className="animate-spin w-8 h-8 border-4 border-teal-600 border-t-transparent rounded-full mx-auto mb-4"></div>
                      <p className="text-slate-600 dark:text-slate-300 font-medium">Loading your policies...</p>
                    </div>
                  ) : policies.length === 0 ? (
                    <div className="text-center py-12">
                      <div className="w-16 h-16 bg-slate-50 dark:bg-slate-800 rounded-xl flex items-center justify-center mb-6 mx-auto border border-slate-200 dark:border-slate-700">
                        <FileText className="w-8 h-8 text-slate-400 dark:text-slate-500" />
                      </div>
                      <h3 className="text-xl font-bold font-serif text-slate-900 dark:text-white mb-3">No Policies Found</h3>
                      <p className="text-slate-600 dark:text-slate-300 mb-8 text-base leading-relaxed">
                        Please upload your insurance policies first to use the AI assistant.
                      </p>
                      <Button asChild className="bg-slate-900 hover:bg-slate-800 text-white rounded-lg shadow-sm hover:shadow-md transition-all duration-200 h-12 px-6">
                        <Link href="/upload">
                          <FileText className="w-4 h-4 mr-2" />
                          Upload Policies
                        </Link>
                      </Button>
                    </div>
                  ) : messages.length === 0 ? (
                    <div className="text-center py-12">
                      <div className="w-16 h-16 bg-teal-50 dark:bg-teal-900/20 rounded-xl flex items-center justify-center mb-6 mx-auto border border-teal-100 dark:border-teal-800">
                        <MessageSquare className="w-8 h-8 text-teal-600 dark:text-teal-400" />
                      </div>
                      <h3 className="text-xl font-bold font-serif text-slate-900 dark:text-white mb-3">Start a conversation</h3>
                      <p className="text-slate-600 dark:text-slate-300 mb-8 text-base leading-relaxed">
                        Ask me anything about your {policies.length} insurance {policies.length === 1 ? 'policy' : 'policies'}. I can help with coverage details, claims, costs, and more.
                      </p>
                      <div className="flex flex-wrap gap-3 justify-center">
                        {policies.slice(0, 3).map((policy) => (
                          <Badge key={policy.id} variant="secondary" className="text-sm font-medium px-4 py-2 rounded-full bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 border border-slate-200 dark:border-slate-700">
                            {policy.fileName} ({policy.policyType})
                          </Badge>
                        ))}
                        {policies.length > 3 && (
                          <Badge variant="secondary" className="text-sm font-medium px-4 py-2 rounded-full bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 border border-slate-200 dark:border-slate-700">
                            +{policies.length - 3} more
                          </Badge>
                        )}
                      </div>
                    </div>
                  ) : (
                    <div className="space-y-8 max-w-4xl mx-auto">
                      {hasMoreHistory && (
                        <div className="flex justify-center">
                          <Button variant="outline" size="sm" onClick={handleLoadOlderHistory} disabled={loadingMoreHistory}>
                            {loadingMoreHistory ? "Loading..." : "Load older history"}
                          </Button>
                        </div>
                      )}
                      {messages.map((message) => (
                        <Message key={message.id} message={message} onCopy={handleCopy} onFeedback={handleFeedback} />
                      ))}
                      {isLoading && (
                        <div className="flex gap-4 justify-start">
                          <div className="w-8 h-8 bg-teal-600 rounded-full flex items-center justify-center shadow-sm">
                            <Bot className="w-4 h-4 text-white" />
                          </div>
                          <Card className="bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-700 shadow-sm rounded-xl max-w-xs">
                            <CardContent className="p-4 text-slate-900 dark:text-slate-100">
                              <div className="flex items-center space-x-3">
                                <div className="flex space-x-1">
                                  <div className="w-2 h-2 bg-teal-400 rounded-full animate-bounce" />
                                  <div className="w-2 h-2 bg-teal-400 rounded-full animate-bounce delay-100" />
                                  <div className="w-2 h-2 bg-teal-400 rounded-full animate-bounce delay-200" />
                                </div>
                                <span className="text-sm text-slate-600 dark:text-slate-300 font-medium">
                                  {selectedPolicyId === "all" ? "Analyzing all policies..." : "AI is thinking..."}
                                </span>
                              </div>
                            </CardContent>
                          </Card>
                        </div>
                      )}
                      <div ref={messagesEndRef} />
                    </div>
                  )}
                </CardContent>
              </Card>

              {/* AI Transparency Notice */}
              {policies.length > 0 && (
                <div className="bg-amber-50 border border-amber-200 rounded-lg p-4 shadow-sm dark:bg-amber-950/20 dark:border-amber-800/50">
                  <div className="flex items-start gap-3">
                    <AlertCircle className="w-5 h-5 text-amber-600 dark:text-amber-400 flex-shrink-0 mt-0.5" />
                    <div>
                      <p className="text-sm font-medium text-amber-800 dark:text-amber-200 mb-1">
                        AI-Powered Assistance
                      </p>
                      <p className="text-sm text-amber-700 dark:text-amber-300">
                        Answers are AI-powered. Please confirm with your insurer before taking decisions.
                      </p>
                    </div>
                  </div>
                </div>
              )}

              {/* Chat Input - Only show if we have policies */}
              {policies.length > 0 && (
                <ChatInput 
                  onSendMessage={handleSendMessage} 
                  isLoading={isLoading}
                  placeholder={
                    selectedPolicyId === "all" 
                      ? "Ask about any of your policies..."
                      : selectedPolicyId === "auto"
                      ? "Ask anything - AI will pick the best policy..."
                      : `Ask about ${getCurrentPolicyName()}...`
                  }
                />
              )}
            </div>

            {/* Sidebar */}
            <div className="lg:col-span-1">
              <SuggestedQuestions 
                onQuestionSelect={handleQuestionSelect} 
                policies={policies}
                selectedPolicyId={selectedPolicyId}
              />
            </div>
          </div>
        </div>
      </div>
    </ProtectedRoute>
  )
}
