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
        // Load policies directly from database
        const session = await supabase.auth.getSession()
        const token = session.data.session?.access_token
        const user = session.data.session?.user

        if (!user) {
          setError("Please log in to access your policies")
          setLoadingPolicies(false)
          return
        }

        // Fetch policies from database
        const { data: dbPolicies, error: dbError } = await supabase
          .from("policies")
          .select("id, policy_name, policy_number, created_at, extracted_text")
          .eq("user_id", user.id)
          .order("created_at", { ascending: false })

        if (dbError) {
          console.error("Database error:", dbError)
          setError("Failed to load policies from database")
          setLoadingPolicies(false)
          return
        }

        console.log(`Found ${dbPolicies.length} policies in database`)

        if (dbPolicies.length > 0) {
          // Check if we have real policy content or just test data
          const hasRealContent = dbPolicies.some(p => {
            const text = p.extracted_text || ""
            return text.length > 100 && !text.includes("test insurance policy for automated testing")
          })

          if (!hasRealContent) {
            console.warn("All policies appear to be test data with minimal content")
            setError("Your policies contain minimal content. Please upload actual insurance policy documents for meaningful chat interactions.")
            setPolicies([])
            setLoadingPolicies(false)
            return
          }

          // Analyze policies to get details
          const policyPromises = dbPolicies.map(async (policy) => {
            try {
              const formData = new FormData()
              formData.append("policy_id", policy.id)
              const response = await fetch(`${API_BASE_URL}/analyze-policy`, {
                method: "POST",
                headers: token ? { Authorization: `Bearer ${token}` } : undefined,
                body: formData,
              })
              
              if (response.ok) {
                const data = await response.json()
                return {
                  id: policy.id,
                  fileName: policy.policy_name || (data.analysis.policy_number ? `Policy ${data.analysis.policy_number}` : `Policy ${policy.id.slice(-8)}`),
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
              console.error(`Error loading policy ${policy.id}:`, e)
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
              const res = await fetch(`${API_BASE_URL}/chat`, {
                method: "POST",
                headers: {
                  Authorization: `Bearer ${token}`,
                  "Content-Type": "application/json",
                },
                body: JSON.stringify({
                  policy_id: policy.id,
                  question: content,
                }),
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
          throw new Error("No policies contain enough information to answer your question. Please ensure you have uploaded complete insurance policy documents.")
        }

        // Combine responses intelligently
        let combinedAnswer = "Based on your uploaded policies:\n\n"
        const policyRefs: string[] = []
        
        validResponses.forEach((resp, index) => {
          if (resp && resp.answer && 
              !resp.answer.includes("Error") && 
              !resp.answer.includes("This information is not available") &&
              !resp.answer.includes("Error answering Question") &&
              resp.answer.length > 50) {
            combinedAnswer += `**${resp.policyName} (${resp.policyType}):**\n${resp.answer}\n\n`
            policyRefs.push(`${resp.policyName}`)
          }
        })

        if (policyRefs.length === 0) {
          throw new Error("The uploaded policies don't contain sufficient information to answer this question. This may be because the policies are test documents or the OCR extraction didn't capture the relevant details.")
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
        
        response = await fetch(`${API_BASE_URL}/chat`, {
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
  <div className="min-h-screen bg-gradient-to-br from-gray-50 to-blue-50 dark:from-gray-950 dark:to-blue-950">
        <Header />

        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
          {/* Back Button */}
          <div className="mb-8">
            <Button variant="ghost" asChild className="text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white rounded-xl hover:bg-gray-100 dark:hover:bg-gray-800 transition-all duration-200">
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
                <div className="inline-flex items-center px-4 py-2 rounded-full bg-green-50 border border-green-200 text-green-700 text-sm font-medium mb-6 dark:bg-green-900/20 dark:border-green-800 dark:text-green-400">
                  <MessageSquare className="w-4 h-4 mr-2" />
                  AI Assistant
                </div>
                <h1 className="text-4xl lg:text-5xl font-bold text-gray-900 dark:text-white mb-6 tracking-tight">
                  Insurance
                  <span className="text-transparent bg-gradient-to-r from-green-600 to-blue-600 bg-clip-text block lg:inline lg:ml-3">
                    Assistant
                  </span>
                </h1>
                <p className="text-xl text-gray-600 dark:text-gray-300 mb-8 leading-relaxed max-w-3xl mx-auto">
                  Ask questions about your policies and get instant, accurate answers powered by advanced AI.
                </p>

                {/* Policy Selector */}
                {!loadingPolicies && policies.length > 0 && (
                  <div className="flex flex-col sm:flex-row items-center justify-center gap-6 mb-8">
                    <div className="flex items-center space-x-3">
                      <div className="w-10 h-10 bg-gradient-to-br from-blue-500 to-purple-500 rounded-xl flex items-center justify-center">
                        <FileText className="w-5 h-5 text-white" />
                      </div>
                      <span className="text-base font-semibold text-gray-700 dark:text-gray-300">Ask about:</span>
                    </div>
                    <Select value={selectedPolicyId} onValueChange={setSelectedPolicyId}>
                      <SelectTrigger className="w-80 h-12 rounded-2xl border-gray-200 dark:border-gray-700 shadow-lg hover:shadow-xl transition-all duration-200 bg-white/80 dark:bg-gray-800/80 backdrop-blur-sm">
                        <SelectValue>
                          <div className="flex items-center space-x-3">
                            <span className="font-semibold">{getCurrentPolicyName()}</span>
                            {selectedPolicyId !== "all" && selectedPolicyId !== "auto" && (
                              <Badge variant="outline" className="text-xs font-medium bg-gradient-to-r from-blue-50 to-purple-50 dark:from-blue-950/20 dark:to-purple-950/20 border-blue-200 dark:border-blue-800 text-blue-700 dark:text-blue-400">
                                {policies.find(p => p.id === selectedPolicyId)?.policyType}
                              </Badge>
                            )}
                          </div>
                        </SelectValue>
                      </SelectTrigger>
                      <SelectContent className="rounded-2xl shadow-xl border-gray-200/50 dark:border-gray-700/50 bg-white/95 dark:bg-gray-900/95 backdrop-blur-xl">
                        <SelectItem value="all" className="rounded-xl p-3 hover:bg-gradient-to-r hover:from-blue-50 hover:to-purple-50 dark:hover:from-blue-950/20 dark:hover:to-purple-950/20 transition-all duration-200">
                          <div className="flex items-center space-x-3">
                            <div className="w-8 h-8 bg-gradient-to-br from-blue-500 to-purple-500 rounded-lg flex items-center justify-center">
                              <Globe className="w-4 h-4 text-white" />
                            </div>
                            <span className="font-medium">All Policies (Comprehensive Search)</span>
                          </div>
                        </SelectItem>
                        <SelectItem value="auto" className="rounded-xl p-3 hover:bg-gradient-to-r hover:from-green-50 hover:to-blue-50 dark:hover:from-green-950/20 dark:hover:to-blue-950/20 transition-all duration-200">
                          <div className="flex items-center space-x-3">
                            <div className="w-8 h-8 bg-gradient-to-br from-green-500 to-blue-500 rounded-lg flex items-center justify-center">
                              <Bot className="w-4 h-4 text-white" />
                            </div>
                            <span className="font-medium">Smart Selection (AI Picks Best Policy)</span>
                          </div>
                        </SelectItem>
                        {policies.map((policy) => (
                          <SelectItem key={policy.id} value={policy.id} className="rounded-xl p-3 hover:bg-gradient-to-r hover:from-gray-50 hover:to-blue-50 dark:hover:from-gray-800 dark:hover:to-blue-950/20 transition-all duration-200">
                            <div className="flex items-center space-x-3">
                              <div className="w-8 h-8 bg-gradient-to-br from-gray-500 to-gray-600 rounded-lg flex items-center justify-center">
                                <FileText className="w-4 h-4 text-white" />
                              </div>
                              <div className="flex flex-col">
                                <span className="font-medium">{policy.fileName}</span>
                                <Badge variant="outline" className="text-xs w-fit">
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
                        className="flex items-center space-x-2 rounded-xl border-gray-200 dark:border-gray-700 hover:border-red-300 hover:text-red-600 dark:hover:border-red-500 dark:hover:text-red-400 transition-all duration-200 h-12 px-4"
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
                      <div className="mt-2 p-3 bg-orange-50 border border-orange-200 rounded-lg">
                        <h4 className="font-semibold text-orange-800 mb-2">API Quota Exceeded - Solutions:</h4>
                        <ul className="text-sm text-orange-700 space-y-1">
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
              <Card className="min-h-[500px] bg-white/80 dark:bg-gray-900/80 backdrop-blur-xl border border-gray-200/50 dark:border-gray-700/50 shadow-xl rounded-2xl">
                <CardContent className="p-8 text-gray-900 dark:text-gray-100">
                  {loadingPolicies ? (
                    <div className="text-center py-12">
                      <div className="animate-spin w-8 h-8 border-4 border-blue-600 border-t-transparent rounded-full mx-auto mb-4"></div>
                      <p className="text-gray-600 dark:text-gray-300 font-medium">Loading your policies...</p>
                    </div>
                  ) : policies.length === 0 ? (
                    <div className="text-center py-12">
                      <div className="w-16 h-16 bg-gradient-to-br from-blue-50 to-purple-50 dark:from-blue-950/20 dark:to-purple-950/20 rounded-2xl flex items-center justify-center mb-6 mx-auto border border-gray-200/50 dark:border-gray-700/50">
                        <FileText className="w-8 h-8 text-gray-600 dark:text-gray-400" />
                      </div>
                      <h3 className="text-xl font-bold text-gray-900 dark:text-white mb-3">No Policies Found</h3>
                      <p className="text-gray-600 dark:text-gray-300 mb-8 text-base leading-relaxed">
                        Please upload your insurance policies first to use the AI assistant.
                      </p>
                      <Button asChild className="bg-gradient-to-r from-blue-600 to-blue-500 hover:from-blue-700 hover:to-blue-600 rounded-xl shadow-lg hover:shadow-xl transition-all duration-200 h-12 px-6">
                        <Link href="/upload">
                          <FileText className="w-4 h-4 mr-2" />
                          Upload Policies
                        </Link>
                      </Button>
                    </div>
                  ) : messages.length === 0 ? (
                    <div className="text-center py-12">
                      <div className="w-16 h-16 bg-gradient-to-br from-green-50 to-blue-50 dark:from-green-950/20 dark:to-blue-950/20 rounded-2xl flex items-center justify-center mb-6 mx-auto border border-gray-200/50 dark:border-gray-700/50">
                        <MessageSquare className="w-8 h-8 text-gray-600 dark:text-gray-400" />
                      </div>
                      <h3 className="text-xl font-bold text-gray-900 dark:text-white mb-3">Start a conversation</h3>
                      <p className="text-gray-600 dark:text-gray-300 mb-8 text-base leading-relaxed">
                        Ask me anything about your {policies.length} insurance {policies.length === 1 ? 'policy' : 'policies'}. I can help with coverage details, claims, costs, and more.
                      </p>
                      <div className="flex flex-wrap gap-3 justify-center">
                        {policies.slice(0, 3).map((policy) => (
                          <Badge key={policy.id} variant="secondary" className="text-sm font-medium px-4 py-2 rounded-full bg-gradient-to-r from-blue-50 to-purple-50 dark:from-blue-950/20 dark:to-purple-950/20 text-blue-700 dark:text-blue-300 border border-blue-200/50 dark:border-blue-800/50">
                            {policy.fileName} ({policy.policyType})
                          </Badge>
                        ))}
                        {policies.length > 3 && (
                          <Badge variant="secondary" className="text-sm font-medium px-4 py-2 rounded-full bg-gradient-to-r from-gray-50 to-blue-50 dark:from-gray-900/20 dark:to-blue-950/20 text-blue-700 dark:text-blue-300 border border-blue-200/50 dark:border-blue-800/50">
                            +{policies.length - 3} more
                          </Badge>
                        )}
                      </div>
                    </div>
                  ) : (
                    <div className="space-y-8 max-w-4xl mx-auto">
                      {messages.map((message) => (
                        <Message key={message.id} message={message} onCopy={handleCopy} onFeedback={handleFeedback} />
                      ))}
                      {isLoading && (
                        <div className="flex gap-4 justify-start">
                          <div className="w-8 h-8 bg-gradient-to-br from-blue-600 to-blue-500 rounded-full flex items-center justify-center shadow-lg">
                            <Bot className="w-4 h-4 text-white" />
                          </div>
                          <Card className="bg-white/90 dark:bg-gray-900/90 border-gray-200/50 dark:border-gray-700/50 shadow-lg rounded-2xl max-w-xs">
                            <CardContent className="p-4 text-gray-900 dark:text-gray-100">
                              <div className="flex items-center space-x-3">
                                <div className="flex space-x-1">
                                  <div className="w-2 h-2 bg-blue-400 rounded-full animate-bounce" />
                                  <div className="w-2 h-2 bg-blue-400 rounded-full animate-bounce delay-100" />
                                  <div className="w-2 h-2 bg-blue-400 rounded-full animate-bounce delay-200" />
                                </div>
                                <span className="text-sm text-gray-600 dark:text-gray-300 font-medium">
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
                <div className="bg-amber-50/80 border border-amber-200 rounded-xl p-4 shadow-sm dark:bg-amber-950/20 dark:border-amber-800/50">
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
