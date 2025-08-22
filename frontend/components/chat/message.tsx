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
        <Avatar className="w-10 h-10 bg-gradient-to-br from-blue-500 via-blue-600 to-indigo-600 shadow-lg ring-2 ring-blue-100 flex-shrink-0 transition-all duration-200 hover:shadow-xl hover:scale-105">
          <AvatarFallback className="bg-transparent">
            <Bot className="w-5 h-5 text-white drop-shadow-sm" />
          </AvatarFallback>
        </Avatar>
      )}

      <div className={`max-w-2xl ${message.role === "user" ? "order-first" : ""}`}>
        <Card
          className={`${
            message.role === "user" 
              ? "bg-gradient-to-br from-blue-500 to-blue-400 text-white border-blue-500 shadow-lg" 
              : "bg-gray-50 border-gray-200/50 shadow-md"
          } rounded-2xl`}
        >
          <CardContent className="p-5">
            <div className="prose prose-sm max-w-none">
              <p className={`mb-0 text-[15px] leading-relaxed ${
                message.role === "user" ? "text-white" : "text-gray-900"
              }`}>
                {message.content}
              </p>
            </div>

            {/* Policy References */}
            {message.policyReferences && message.policyReferences.length > 0 && (
              <div className="mt-4">
                <Card className="bg-blue-50 border-blue-200/60 hover:border-blue-300/80 transition-colors duration-200 rounded-xl">
                  <CardContent className="p-3">
                    <p className="text-xs font-medium text-blue-700 mb-2">Referenced policies:</p>
                    <div className="flex flex-wrap gap-2">
                      {message.policyReferences.map((policy, index) => (
                        <span 
                          key={index} 
                          className="inline-block px-3 py-1 bg-blue-100 text-blue-800 text-xs rounded-full font-medium hover:bg-blue-200 transition-colors duration-150"
                        >
                          {policy}
                        </span>
                      ))}
                    </div>
                  </CardContent>
                </Card>
              </div>
            )}

            {/* Message Actions */}
            {message.role === "assistant" && (
              <div className="flex items-center justify-between mt-4 pt-3 border-t border-gray-200/70">
                <div className="flex items-center space-x-2">
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={handleCopy}
                    className="h-8 px-3 text-gray-500 hover:text-gray-700 hover:bg-gray-100 rounded-lg transition-colors duration-150"
                  >
                    <Copy className="w-3 h-3" />
                  </Button>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => handleFeedback("positive")}
                    className={`h-8 px-3 rounded-lg transition-colors duration-150 ${
                      feedback === "positive" 
                        ? "text-green-600 bg-green-50" 
                        : "text-gray-500 hover:text-green-600 hover:bg-green-50"
                    }`}
                  >
                    <ThumbsUp className="w-3 h-3" />
                  </Button>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => handleFeedback("negative")}
                    className={`h-8 px-3 rounded-lg transition-colors duration-150 ${
                      feedback === "negative" 
                        ? "text-red-600 bg-red-50" 
                        : "text-gray-500 hover:text-red-600 hover:bg-red-50"
                    }`}
                  >
                    <ThumbsDown className="w-3 h-3" />
                  </Button>
                </div>
                <span className="text-xs text-gray-400 font-medium">
                  {message.timestamp.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                </span>
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {message.role === "user" && (
        <Avatar className="w-10 h-10 bg-gradient-to-br from-emerald-500 via-teal-500 to-cyan-500 shadow-lg ring-2 ring-emerald-100 flex-shrink-0 transition-all duration-200 hover:shadow-xl hover:scale-105">
          <AvatarFallback className="bg-transparent">
            <User className="w-5 h-5 text-white drop-shadow-sm" />
          </AvatarFallback>
        </Avatar>
      )}
    </div>
  )
}
