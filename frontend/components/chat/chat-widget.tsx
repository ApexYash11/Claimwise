"use client"

import { useState, useCallback, useMemo } from "react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { ChatInput } from "./chat-input"
import { Message } from "./message"
import { MessageSquare, X, Minimize2 } from "lucide-react"

interface ChatMessage {
  id: string
  content: string
  role: "user" | "assistant"
  timestamp: Date
  policyReferences?: string[]
}

export function ChatWidget() {
  const [isOpen, setIsOpen] = useState(false)
  const [isMinimized, setIsMinimized] = useState(false)
  const [messages, setMessages] = useState<ChatMessage[]>([])
  const [isLoading, setIsLoading] = useState(false)

  const handleSendMessage = useCallback(async (content: string) => {
    const userMessage: ChatMessage = {
      id: Date.now().toString(),
      content,
      role: "user",
      timestamp: new Date(),
    }

    setMessages((prev) => [...prev, userMessage])
    setIsLoading(true)

    // Use requestIdleCallback for better responsiveness
    if (typeof requestIdleCallback !== 'undefined') {
      requestIdleCallback(() => {
        setTimeout(() => {
          const assistantMessage: ChatMessage = {
            id: (Date.now() + 1).toString(),
            content:
              "I'd be happy to help you with that question about your insurance policies. Let me analyze your coverage details...",
            role: "assistant",
            timestamp: new Date(),
          }
          setMessages((prev) => [...prev, assistantMessage])
          setIsLoading(false)
        }, 300) // Reduced from 1500ms
      })
    } else {
      setTimeout(() => {
        const assistantMessage: ChatMessage = {
          id: (Date.now() + 1).toString(),
          content:
            "I'd be happy to help you with that question about your insurance policies. Let me analyze your coverage details...",
          role: "assistant",
          timestamp: new Date(),
        }
        setMessages((prev) => [...prev, assistantMessage])
        setIsLoading(false)
      }, 300)
    }
  }, [])

  // Memoize message list rendering
  const renderedMessages = useMemo(() => messages.map((message) => <Message key={message.id} message={message} />), [messages])

  if (!isOpen) {
    return (
      <div className="fixed bottom-6 right-6 z-50">
        <Button
          onClick={() => setIsOpen(true)}
          className="w-14 h-14 rounded-full bg-blue-600 hover:bg-blue-700 shadow-lg"
        >
          <MessageSquare className="w-6 h-6" />
        </Button>
      </div>
    )
  }

  return (
    <div className="fixed bottom-6 right-6 z-50 w-[calc(100%-2rem)] sm:w-96 max-h-[calc(100vh-3rem)] h-[500px]">
      <Card className="h-full flex flex-col shadow-2xl border-0">
        <CardHeader className="flex-shrink-0 bg-blue-600 text-white rounded-t-lg">
          <div className="flex items-center justify-between">
            <CardTitle className="text-lg truncate">AI Assistant</CardTitle>
            <div className="flex items-center space-x-2 flex-shrink-0">
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setIsMinimized(!isMinimized)}
                className="text-white hover:bg-blue-700 h-8 w-8 p-0"
              >
                <Minimize2 className="w-4 h-4" />
              </Button>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setIsOpen(false)}
                className="text-white hover:bg-blue-700 h-8 w-8 p-0"
              >
                <X className="w-4 h-4" />
              </Button>
            </div>
          </div>
        </CardHeader>

        {!isMinimized && (
          <>
            <CardContent className="flex-1 overflow-y-auto p-4 space-y-4 scroll-smooth">
              {messages.length === 0 ? (
                <div className="text-center py-8">
                  <MessageSquare className="w-8 h-8 text-gray-400 mx-auto mb-2" />
                  <p className="text-sm text-gray-600">Ask me about your insurance policies!</p>
                </div>
              ) : (
                renderedMessages
              )}
              {isLoading && (
                <div className="flex items-center space-x-2 text-sm text-gray-500">
                  <div className="flex space-x-1">
                    <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce" />
                    <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: '0.1s' }} />
                    <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: '0.2s' }} />
                  </div>
                  <span>AI is thinking...</span>
                </div>
              )}
            </CardContent>

            <div className="flex-shrink-0 p-4 border-t bg-white">
              <ChatInput
                onSendMessage={handleSendMessage}
                isLoading={isLoading}
                placeholder="Ask about your policies..."
              />
            </div>
          </>
        )}
      </Card>
    </div>
  )
}
