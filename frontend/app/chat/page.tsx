"use client"

import { useState, useRef, useEffect } from "react"
import { ProtectedRoute } from "@/components/auth/protected-route"
import { Header } from "@/components/layout/header"
import { Message } from "@/components/chat/message"
import { SuggestedQuestions } from "@/components/chat/suggested-questions"
import { ChatInput } from "@/components/chat/chat-input"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Badge } from "@/components/ui/badge"
import { ArrowLeft, MessageSquare, Bot, AlertCircle, FileText, Globe, History } from "lucide-react"
import Link from "next/link"
import { supabase } from "@/lib/supabase"
import type { PolicySummary } from "@/lib/api"

const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000"

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
  const messagesEndRef = useRef<HTMLDivElement>(null)

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" })
  }

  useEffect(() => {
    scrollToBottom()
  }, [messages])

  // Load user policies and chat history on component mount
  useEffect(() => {
    const loadPoliciesAndHistory = async () => {
      try {
        // Load policies
        let policyIds: string[] = []
        if (typeof window !== "undefined") {
          const storedIds = localStorage.getItem("claimwise_uploaded_policy_ids")
          if (storedIds) {
            policyIds = JSON.parse(storedIds)
          }
        }

        if (policyIds.length > 0) {
          const session = await supabase.auth.getSession()
          const token = session.data.session?.access_token

          // Analyze policies to get details
          const policyPromises = policyIds.map(async (policyId) => {
            try {
              const formData = new FormData()
              formData.append("policy_id", policyId)
              const response = await fetch(`${API_BASE_URL}/analyze-policy`, {
                method: "POST",
                headers: token ? { Authorization: `Bearer ${token}` } : undefined,
                body: formData,
              })
              
              if (response.ok) {
                const data = await response.json()
                return {
                  id: policyId,
                  fileName: data.analysis.policy_number ? `Policy ${data.analysis.policy_number}` : `Policy ${policyId.slice(-8)}`,
                  policyType: data.analysis.policy_type || "Unknown",
                  provider: data.analysis.provider || "Unknown Provider",
                  premium: data.analysis.premium || "Not specified",
                  coverageAmount: data.analysis.coverage_amount || "Not specified",
                  deductible: data.analysis.deductible || "Not specified",
                  keyFeatures: data.analysis.key_features || [],
                  expirationDate: data.analysis.expiration_date || new Date(Date.now() + 365 * 24 * 60 * 60 * 1000).toISOString(),
                  rawAnalysis: data.analysis
                }
              }
              return null
            } catch (e) {
              console.error(`Error loading policy ${policyId}:`, e)
              return null
            }
          })

          const loadedPolicies = (await Promise.all(policyPromises)).filter(Boolean) as PolicySummary[]
          setPolicies(loadedPolicies)
          
          // Set first policy as selected by default if we have policies
          if (loadedPolicies.length > 0) {
            setSelectedPolicyId(loadedPolicies[0].id)
          }
        }

        // Load chat history from localStorage (for now)
        const storedHistory = localStorage.getItem("claimwise_chat_history")
        if (storedHistory) {
          const history = JSON.parse(storedHistory).map((msg: any) => ({
            ...msg,
            timestamp: new Date(msg.timestamp)
          }))
          setChatHistory(history)
          setMessages(history)
        }

      } catch (e) {
        console.error("Error loading policies and history:", e)
        setError("Failed to load policies and chat history")
      } finally {
        setLoadingPolicies(false)
      }
    }

    loadPoliciesAndHistory()
  }, [])

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
      const session = await supabase.auth.getSession()
      const token = session.data.session?.access_token
      
      if (!token) {
        throw new Error("Authentication required")
      }

      let response: Response
      let assistantMessage: ChatMessage

      if (selectedPolicyId === "all") {
        // Multi-policy chat - ask across all policies
        const allPolicyResponses = await Promise.all(
          policies.map(async (policy) => {
            try {
              const params = new URLSearchParams({
                policy_id: policy.id,
                question: content,
              })
              
              const res = await fetch(`${API_BASE_URL}/chat?${params}`, {
                method: "POST",
                headers: {
                  Authorization: `Bearer ${token}`,
                  "Content-Type": "application/json",
                },
              })
              
              if (res.ok) {
                const data = await res.json()
                return {
                  policyName: policy.fileName,
                  policyType: policy.policyType,
                  answer: data.answer,
                  policyId: policy.id
                }
              }
              return null
            } catch (e) {
              return null
            }
          })
        )

        const validResponses = allPolicyResponses.filter(Boolean)
        
        if (validResponses.length === 0) {
          throw new Error("No policies could answer your question")
        }

        // Combine responses intelligently
        let combinedAnswer = "Based on your uploaded policies:\n\n"
        const policyRefs: string[] = []
        
        validResponses.forEach((resp, index) => {
          if (resp && resp.answer && !resp.answer.includes("Error") && resp.answer.length > 50) {
            combinedAnswer += `**${resp.policyName} (${resp.policyType}):**\n${resp.answer}\n\n`
            policyRefs.push(`${resp.policyName}`)
          }
        })

        if (policyRefs.length === 0) {
          throw new Error("No relevant information found in your policies")
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
        
        const params = new URLSearchParams({
          policy_id: actualPolicyId,
          question: content,
        })
        
        response = await fetch(`${API_BASE_URL}/chat?${params}`, {
          method: "POST",
          headers: {
            Authorization: `Bearer ${token}`,
            "Content-Type": "application/json",
          },
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
      
      // Save to localStorage (and could also sync to backend)
      localStorage.setItem("claimwise_chat_history", JSON.stringify(newMessages))
      
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

  const handleClearHistory = () => {
    setMessages([])
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
      <div className="min-h-screen bg-gradient-to-br from-gray-50 via-white to-gray-100 dark:from-gray-900 dark:via-gray-800 dark:to-black">
        <Header />

        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          {/* Back Button */}
          <div className="mb-6">
            <Button variant="ghost" asChild className="text-gray-600 hover:text-gray-900">
              <Link href="/dashboard">
                <ArrowLeft className="w-4 h-4 mr-2" />
                Back to Dashboard
              </Link>
            </Button>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-4 gap-8">
            {/* Chat Area */}
            <div className="lg:col-span-3 space-y-6">
              {/* Header with Policy Selector */}
              <div className="text-center">
                <div className="mx-auto w-16 h-16 bg-gradient-to-br from-blue-600 to-blue-500 rounded-2xl flex items-center justify-center mb-4 shadow-lg">
                  <Bot className="w-8 h-8 text-white" />
                </div>
                <h1 className="text-3xl font-bold text-gray-900 mb-2">AI Insurance Assistant</h1>
                <p className="text-lg text-gray-600 mb-4 leading-relaxed">
                  Ask questions about your policies and get instant, accurate answers.
                </p>

                {/* Policy Selector */}
                {!loadingPolicies && policies.length > 0 && (
                  <div className="flex flex-col sm:flex-row items-center justify-center gap-4 mb-6">
                    <div className="flex items-center space-x-2">
                      <FileText className="w-4 h-4 text-gray-500" />
                      <span className="text-sm font-medium text-gray-700">Ask about:</span>
                    </div>
                    <Select value={selectedPolicyId} onValueChange={setSelectedPolicyId}>
                      <SelectTrigger className="w-64 h-11 rounded-xl border-gray-200 shadow-sm hover:border-blue-300 transition-colors">
                        <SelectValue>
                          <div className="flex items-center space-x-2">
                            <span className="font-medium">{getCurrentPolicyName()}</span>
                            {selectedPolicyId !== "all" && selectedPolicyId !== "auto" && (
                              <Badge variant="outline" className="text-xs font-medium border-blue-200 text-blue-700">
                                {policies.find(p => p.id === selectedPolicyId)?.policyType}
                              </Badge>
                            )}
                          </div>
                        </SelectValue>
                      </SelectTrigger>
                      <SelectContent className="rounded-xl shadow-lg border-gray-200">
                        <SelectItem value="all" className="rounded-lg">
                          <div className="flex items-center space-x-2">
                            <Globe className="w-4 h-4" />
                            <span>All Policies (Comprehensive Search)</span>
                          </div>
                        </SelectItem>
                        <SelectItem value="auto" className="rounded-lg">
                          <div className="flex items-center space-x-2">
                            <Bot className="w-4 h-4" />
                            <span>Smart Selection (AI Picks Best Policy)</span>
                          </div>
                        </SelectItem>
                        {policies.map((policy) => (
                          <SelectItem key={policy.id} value={policy.id} className="rounded-lg">
                            <div className="flex items-center space-x-2">
                              <FileText className="w-4 h-4" />
                              <span>{policy.fileName}</span>
                              <Badge variant="outline" className="text-xs">
                                {policy.policyType}
                              </Badge>
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
                        className="flex items-center space-x-2 rounded-xl border-gray-200 hover:border-red-300 hover:text-red-600 transition-colors"
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
                <Alert variant="destructive">
                  <AlertCircle className="h-4 w-4" />
                  <AlertDescription>{error}</AlertDescription>
                </Alert>
              )}

              {/* Messages */}
              <Card className="min-h-[500px] bg-white/80 backdrop-blur-sm border-0 shadow-xl rounded-2xl">
                <CardContent className="p-8">
                  {loadingPolicies ? (
                    <div className="text-center py-12">
                      <div className="animate-spin w-8 h-8 border-4 border-blue-600 border-t-transparent rounded-full mx-auto mb-4"></div>
                      <p className="text-gray-600 font-medium">Loading your policies...</p>
                    </div>
                  ) : policies.length === 0 ? (
                    <div className="text-center py-12">
                      <FileText className="w-12 h-12 text-gray-400 mx-auto mb-4" />
                      <h3 className="text-lg font-semibold text-gray-900 mb-2">No Policies Found</h3>
                      <p className="text-gray-600 mb-6 text-[15px]">
                        Please upload your insurance policies first to use the AI assistant.
                      </p>
                      <Button asChild className="bg-gradient-to-r from-blue-600 to-blue-500 hover:from-blue-700 hover:to-blue-600">
                        <Link href="/upload">Upload Policies</Link>
                      </Button>
                    </div>
                  ) : messages.length === 0 ? (
                    <div className="text-center py-12">
                      <MessageSquare className="w-12 h-12 text-gray-400 mx-auto mb-4" />
                      <h3 className="text-lg font-semibold text-gray-900 mb-2">Start a conversation</h3>
                      <p className="text-gray-600 mb-6 text-[15px] leading-relaxed">
                        Ask me anything about your {policies.length} insurance {policies.length === 1 ? 'policy' : 'policies'}. I can help with coverage details, claims, costs, and more.
                      </p>
                      <div className="flex flex-wrap gap-2 justify-center">
                        {policies.slice(0, 3).map((policy) => (
                          <Badge key={policy.id} variant="secondary" className="text-xs font-medium px-3 py-1 rounded-full bg-blue-50 text-blue-700 border-blue-200">
                            {policy.fileName} ({policy.policyType})
                          </Badge>
                        ))}
                        {policies.length > 3 && (
                          <Badge variant="secondary" className="text-xs font-medium px-3 py-1 rounded-full bg-blue-50 text-blue-700 border-blue-200">
                            +{policies.length - 3} more
                          </Badge>
                        )}
                      </div>
                    </div>
                  ) : (
                    <div className="space-y-6">
                      {messages.map((message) => (
                        <Message key={message.id} message={message} onCopy={handleCopy} onFeedback={handleFeedback} />
                      ))}
                      {isLoading && (
                        <div className="flex gap-4 justify-start">
                          <div className="w-8 h-8 bg-gradient-to-br from-blue-600 to-blue-500 rounded-full flex items-center justify-center shadow-lg">
                            <Bot className="w-4 h-4 text-white" />
                          </div>
                          <Card className="bg-white/90 border-gray-200/50 shadow-lg rounded-2xl max-w-xs">
                            <CardContent className="p-4">
                              <div className="flex items-center space-x-3">
                                <div className="flex space-x-1">
                                  <div className="w-2 h-2 bg-blue-400 rounded-full animate-bounce" />
                                  <div className="w-2 h-2 bg-blue-400 rounded-full animate-bounce delay-100" />
                                  <div className="w-2 h-2 bg-blue-400 rounded-full animate-bounce delay-200" />
                                </div>
                                <span className="text-sm text-gray-600 font-medium">
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
