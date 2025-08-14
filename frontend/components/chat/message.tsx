"use client"

import { Avatar, AvatarFallback } from "@/components/ui/avatar"
import { Card, CardContent } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Copy, ThumbsUp, ThumbsDown, User, Bot } from "lucide-react"
import { useState } from "react"

interface MessageProps {
  message: {
    id: string
    content: string
    role: "user" | "assistant"
    timestamp: Date
    policyReferences?: string[]
  }
  onCopy?: (content: string) => void
  onFeedback?: (messageId: string, feedback: "positive" | "negative") => void
}

export function Message({ message, onCopy, onFeedback }: MessageProps) {
  const [feedback, setFeedback] = useState<"positive" | "negative" | null>(null)

  const handleFeedback = (type: "positive" | "negative") => {
    setFeedback(type)
    onFeedback?.(message.id, type)
  }

  const handleCopy = () => {
    navigator.clipboard.writeText(message.content)
    onCopy?.(message.content)
  }

  return (
    <div className={`flex gap-4 ${message.role === "user" ? "justify-end" : "justify-start"}`}>
      {message.role === "assistant" && (
        <Avatar className="w-8 h-8 bg-blue-600">
          <AvatarFallback>
            <Bot className="w-4 h-4 text-white" />
          </AvatarFallback>
        </Avatar>
      )}

      <div className={`max-w-3xl ${message.role === "user" ? "order-first" : ""}`}>
        <Card
          className={`${
            message.role === "user" ? "bg-blue-600 text-white border-blue-600" : "bg-white border-gray-200 shadow-sm"
          }`}
        >
          <CardContent className="p-4">
            <div className="prose prose-sm max-w-none">
              <p className={`mb-0 ${message.role === "user" ? "text-white" : "text-gray-900"}`}>{message.content}</p>
            </div>

            {/* Policy References */}
            {message.policyReferences && message.policyReferences.length > 0 && (
              <div className="mt-3 pt-3 border-t border-gray-200">
                <p className="text-xs text-gray-500 mb-2">Referenced policies:</p>
                <div className="flex flex-wrap gap-1">
                  {message.policyReferences.map((policy, index) => (
                    <span key={index} className="inline-block px-2 py-1 bg-blue-100 text-blue-800 text-xs rounded-full">
                      {policy}
                    </span>
                  ))}
                </div>
              </div>
            )}

            {/* Message Actions */}
            {message.role === "assistant" && (
              <div className="flex items-center justify-between mt-3 pt-3 border-t border-gray-200">
                <div className="flex items-center space-x-2">
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={handleCopy}
                    className="h-8 px-2 text-gray-500 hover:text-gray-700"
                  >
                    <Copy className="w-3 h-3" />
                  </Button>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => handleFeedback("positive")}
                    className={`h-8 px-2 ${
                      feedback === "positive" ? "text-green-600" : "text-gray-500 hover:text-green-600"
                    }`}
                  >
                    <ThumbsUp className="w-3 h-3" />
                  </Button>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => handleFeedback("negative")}
                    className={`h-8 px-2 ${
                      feedback === "negative" ? "text-red-600" : "text-gray-500 hover:text-red-600"
                    }`}
                  >
                    <ThumbsDown className="w-3 h-3" />
                  </Button>
                </div>
                <span className="text-xs text-gray-400">{message.timestamp.toLocaleTimeString()}</span>
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {message.role === "user" && (
        <Avatar className="w-8 h-8 bg-gray-600">
          <AvatarFallback>
            <User className="w-4 h-4 text-white" />
          </AvatarFallback>
        </Avatar>
      )}
    </div>
  )
}
