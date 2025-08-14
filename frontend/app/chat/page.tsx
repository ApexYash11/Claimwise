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
import { ArrowLeft, MessageSquare, Bot, AlertCircle } from "lucide-react"
import Link from "next/link"

interface ChatMessage {
  id: string
  content: string
  role: "user" | "assistant"
  timestamp: Date
  policyReferences?: string[]
}

export default function ChatPage() {
  const [messages, setMessages] = useState<ChatMessage[]>([])
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState("")
  const messagesEndRef = useRef<HTMLDivElement>(null)

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" })
  }

  useEffect(() => {
    scrollToBottom()
  }, [messages])

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
      // Mock API call - replace with actual API integration
      await new Promise((resolve) => setTimeout(resolve, 1500))

      const assistantMessage: ChatMessage = {
        id: (Date.now() + 1).toString(),
        content: generateMockResponse(content),
        role: "assistant",
        timestamp: new Date(),
        policyReferences: ["Health Insurance Policy", "Auto Insurance Policy"],
      }

      setMessages((prev) => [...prev, assistantMessage])
    } catch (err) {
      setError("Failed to get response. Please try again.")
    } finally {
      setIsLoading(false)
    }
  }

  const generateMockResponse = (question: string): string => {
    const lowerQuestion = question.toLowerCase()

    if (lowerQuestion.includes("emergency") || lowerQuestion.includes("er")) {
      return "Based on your health insurance policy, emergency room visits are covered with a $150 copay after you meet your deductible. Your policy covers emergency services both in-network and out-of-network, though out-of-network visits may have higher costs. Pre-authorization is not required for true emergencies."
    }

    if (lowerQuestion.includes("rental") || lowerQuestion.includes("car")) {
      return "Your auto insurance policy includes rental car coverage up to $30 per day for a maximum of 30 days. This coverage applies when your vehicle is being repaired due to a covered claim. You can choose any rental car company, but you'll need to pay upfront and submit receipts for reimbursement."
    }

    if (lowerQuestion.includes("water") || lowerQuestion.includes("damage")) {
      return "Your home insurance policy covers sudden and accidental water damage, such as burst pipes or appliance leaks. However, it does not cover gradual water damage, flooding, or damage due to lack of maintenance. For flood coverage, you would need a separate flood insurance policy."
    }

    if (lowerQuestion.includes("deductible") || lowerQuestion.includes("premium")) {
      return "Your deductible is the amount you pay out-of-pocket before insurance coverage begins. Your health insurance has a $1,500 deductible, auto insurance has a $500 deductible, and home insurance has a $2,000 deductible. Increasing your deductibles could lower your premiums - for example, raising your auto deductible to $1,000 could save you approximately $200 annually."
    }

    return "I'd be happy to help you understand your insurance policies better. Based on the policies you've uploaded, I can provide specific information about your coverage, costs, claims process, and policy details. Could you please be more specific about what aspect of your insurance you'd like to know about?"
  }

  const handleQuestionSelect = (question: string) => {
    handleSendMessage(question)
  }

  const handleCopy = (content: string) => {
    // You could show a toast notification here
    console.log("Copied to clipboard:", content)
  }

  const handleFeedback = (messageId: string, feedback: "positive" | "negative") => {
    // You could send feedback to your analytics service here
    console.log("Feedback:", messageId, feedback)
  }

  return (
    <ProtectedRoute>
      <div className="min-h-screen bg-gray-50">
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
              {/* Header */}
              <div className="text-center">
                <div className="mx-auto w-16 h-16 bg-blue-600 rounded-2xl flex items-center justify-center mb-4">
                  <Bot className="w-8 h-8 text-white" />
                </div>
                <h1 className="text-3xl font-bold text-gray-900 mb-2">AI Insurance Assistant</h1>
                <p className="text-lg text-gray-600">
                  Ask questions about your policies and get instant, accurate answers.
                </p>
              </div>

              {/* Error Alert */}
              {error && (
                <Alert variant="destructive">
                  <AlertCircle className="h-4 w-4" />
                  <AlertDescription>{error}</AlertDescription>
                </Alert>
              )}

              {/* Messages */}
              <Card className="min-h-[500px] bg-white border-0 shadow-lg">
                <CardContent className="p-6">
                  {messages.length === 0 ? (
                    <div className="text-center py-12">
                      <MessageSquare className="w-12 h-12 text-gray-400 mx-auto mb-4" />
                      <h3 className="text-lg font-medium text-gray-900 mb-2">Start a conversation</h3>
                      <p className="text-gray-600 mb-6">
                        Ask me anything about your insurance policies. I can help with coverage details, claims, costs,
                        and more.
                      </p>
                    </div>
                  ) : (
                    <div className="space-y-6">
                      {messages.map((message) => (
                        <Message key={message.id} message={message} onCopy={handleCopy} onFeedback={handleFeedback} />
                      ))}
                      {isLoading && (
                        <div className="flex gap-4 justify-start">
                          <div className="w-8 h-8 bg-blue-600 rounded-full flex items-center justify-center">
                            <Bot className="w-4 h-4 text-white" />
                          </div>
                          <Card className="bg-white border-gray-200 shadow-sm">
                            <CardContent className="p-4">
                              <div className="flex items-center space-x-2">
                                <div className="flex space-x-1">
                                  <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce" />
                                  <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce delay-100" />
                                  <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce delay-200" />
                                </div>
                                <span className="text-sm text-gray-500">AI is thinking...</span>
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

              {/* Chat Input */}
              <ChatInput onSendMessage={handleSendMessage} isLoading={isLoading} />
            </div>

            {/* Sidebar */}
            <div className="lg:col-span-1">
              <SuggestedQuestions onQuestionSelect={handleQuestionSelect} />
            </div>
          </div>
        </div>
      </div>
    </ProtectedRoute>
  )
}
