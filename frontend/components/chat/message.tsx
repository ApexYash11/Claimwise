"use client"

import { Avatar, AvatarFallback } from "@/components/ui/avatar"
import { Card, CardContent } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Copy, ThumbsUp, ThumbsDown, User, Bot, FileText } from "lucide-react"
import { useState } from "react"

// Component to format assistant responses with proper styling
function FormattedContent({ content }: { content: string }) {
  // Split content into paragraphs and format
  const formatContent = (text: string) => {
    // Split by double newlines for paragraphs
    const paragraphs = text.split(/\n\s*\n/).filter(p => p.trim())
    
    return paragraphs.map((paragraph, index) => {
      const trimmed = paragraph.trim()
      
      // Check if it's a "Referenced policies" section or similar
      if (trimmed.match(/^(Referenced policies:|Sources:|References:)/i)) {
        return (
          <div key={index} className="mb-6 p-4 bg-gradient-to-r from-blue-50 to-indigo-50 border border-blue-200 rounded-xl dark:from-blue-950/50 dark:to-indigo-950/50 dark:border-blue-800">
            <h4 className="font-semibold text-blue-900 dark:text-blue-100 text-sm mb-3 flex items-center gap-2">
              <FileText className="w-4 h-4" />
              Referenced policies:
            </h4>
            <div className="ml-6">
              {trimmed.split('\n').slice(1).filter(line => line.trim()).map((line, lineIndex) => (
                <p key={lineIndex} className="text-blue-800 dark:text-blue-200 text-sm mb-2 font-medium">
                  {line.trim()}
                </p>
              ))}
            </div>
          </div>
        )
      }

      // Check if it's a section header (starts with common policy section indicators)
      if (trimmed.match(/^(Coverage|Benefits|Exclusions|Terms|Conditions|Section|Article|\d+\.)/i)) {
        return (
          <div key={index} className="mb-4">
            <h4 className="font-semibold text-blue-900 dark:text-blue-100 text-sm mb-2 flex items-center gap-2">
              <FileText className="w-4 h-4" />
              {trimmed}
            </h4>
          </div>
        )
      }
      
      // Check if it contains bullet points or lists
      if (trimmed.includes('•') || trimmed.match(/^\s*[-*]\s/m)) {
        const listItems = trimmed.split(/\n/).filter(line => line.trim())
        return (
          <div key={index} className="mb-4">
            <ul className="space-y-2 ml-4">
              {listItems.map((item, itemIndex) => {
                const cleanItem = item.replace(/^[\s•\-*]+/, '').trim()
                if (cleanItem) {
                  return (
                    <li key={itemIndex} className="text-gray-700 dark:text-gray-200 text-[15px] leading-relaxed flex items-start">
                      <span className="w-2 h-2 bg-blue-500 rounded-full mr-3 mt-2 flex-shrink-0"></span>
                      <span>{cleanItem}</span>
                    </li>
                  )
                }
                return null
              }).filter(Boolean)}
            </ul>
          </div>
        )
      }
      
      // Check if it contains policy references or specific sections
      if (trimmed.match(/section\s+[\d\.\*]+/i) || trimmed.match(/\*\*.*\*\*/)) {
        // Parse bold text markers
        const parts = trimmed.split(/(\*\*.*?\*\*)/)
        return (
          <div key={index} className="mb-4 p-3 bg-blue-50/50 border-l-4 border-blue-400 rounded-r-lg dark:bg-blue-950/30 dark:border-blue-500">
            <p className="text-gray-800 dark:text-gray-100 text-[15px] leading-relaxed">
              {parts.map((part, partIndex) => {
                if (part.match(/\*\*(.*?)\*\*/)) {
                  const boldText = part.replace(/\*\*/g, '')
                  return (
                    <strong key={partIndex} className="font-semibold text-blue-800 dark:text-blue-200">
                      {boldText}
                    </strong>
                  )
                }
                return <span key={partIndex}>{part}</span>
              })}
            </p>
          </div>
        )
      }
      
      // Regular paragraph
      return (
        <p key={index} className="mb-6 text-gray-700 dark:text-gray-200 text-[15px] leading-relaxed">
          {trimmed}
        </p>
      )
    })
  }

  return <div className="space-y-2">{formatContent(content)}</div>
}

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

      <div className={`max-w-4xl ${message.role === "user" ? "order-first ml-auto" : "mr-auto"}`}> 
        <Card
          className={`$
            message.role === "user"
              ? "bg-gray-100 border-gray-200 text-gray-900 shadow-lg dark:bg-gray-800 dark:border-gray-700 dark:text-gray-100"
              : "bg-gray-50 border-gray-200/50 shadow-md dark:bg-gray-900 dark:border-gray-700"
          } rounded-2xl`}
        >
          <CardContent className="p-5">
            <div className="prose prose-sm max-w-none">
              {message.role === "assistant" ? (
                <FormattedContent content={message.content} />
              ) : (
                <p className="mb-0 text-[15px] leading-relaxed text-gray-900 dark:text-gray-100">
                  {message.content}
                </p>
              )}
            </div>

            {/* Policy References */}
            {message.policyReferences && message.policyReferences.length > 0 && (
              <div className="mt-4">
                <Card className="bg-blue-50/80 border border-blue-100 shadow-none rounded-xl dark:bg-blue-950/60 dark:border-blue-900/60">
                  <CardContent className="p-3">
                    <p className="text-xs font-semibold text-blue-800 mb-2 dark:text-blue-200">Referenced policies:</p>
                    <div className="flex flex-wrap gap-2">
                      {message.policyReferences.map((policy, index) => (
                        <span 
                          key={index} 
                          className="inline-block px-3 py-1 bg-blue-100 border border-blue-200 text-blue-900 text-xs rounded-full font-semibold shadow-sm hover:bg-blue-200 transition-colors duration-150 dark:bg-blue-900/70 dark:border-blue-800 dark:text-blue-100 dark:hover:bg-blue-800/80"
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
              <div className="flex items-center justify-between mt-4 pt-3 border-t border-gray-200/70 dark:border-gray-700/70">
                <div className="flex items-center space-x-2">
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={handleCopy}
                    className="h-8 px-3 text-gray-500 hover:text-gray-700 hover:bg-gray-100 rounded-lg transition-colors duration-150 dark:text-gray-300 dark:hover:text-blue-400 dark:hover:bg-gray-800"
                  >
                    <Copy className="w-3 h-3" />
                  </Button>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => handleFeedback("positive")}
                    className={`h-8 px-3 rounded-lg transition-colors duration-150 ${
                      feedback === "positive" 
                        ? "text-green-600 bg-green-50 dark:text-green-400 dark:bg-green-900/30" 
                        : "text-gray-500 hover:text-green-600 hover:bg-green-50 dark:text-gray-300 dark:hover:text-green-400 dark:hover:bg-green-900/30"
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
                        ? "text-red-600 bg-red-50 dark:text-red-400 dark:bg-red-900/30" 
                        : "text-gray-500 hover:text-red-600 hover:bg-red-50 dark:text-gray-300 dark:hover:text-red-400 dark:hover:bg-red-900/30"
                    }`}
                  >
                    <ThumbsDown className="w-3 h-3" />
                  </Button>
                </div>
                <span className="text-xs text-gray-400 font-medium dark:text-gray-500">
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
