"use client"

import { Avatar, AvatarFallback } from "@/components/ui/avatar"
import { Card, CardContent } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Copy, ThumbsUp, ThumbsDown, User, Bot, FileText } from "lucide-react"
import { useState, memo } from "react"

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
          <div key={index} className="mb-6 p-4 bg-slate-50 border border-slate-200 rounded-lg dark:bg-slate-900 dark:border-slate-800">
            <h4 className="font-semibold text-slate-900 dark:text-slate-100 text-sm mb-3 flex items-center gap-2">
              <FileText className="w-4 h-4" />
              Referenced policies:
            </h4>
            <div className="ml-6">
              {trimmed.split('\n').slice(1).filter(line => line.trim()).map((line, lineIndex) => (
                <p key={lineIndex} className="text-slate-700 dark:text-slate-300 text-sm mb-2 font-medium">
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
            <h4 className="font-serif font-semibold text-slate-900 dark:text-slate-100 text-sm mb-2 flex items-center gap-2">
              <FileText className="w-4 h-4 text-teal-600" />
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
                    <li key={itemIndex} className="text-slate-700 dark:text-slate-300 text-[15px] leading-relaxed flex items-start">
                      <span className="w-1.5 h-1.5 bg-teal-500 rounded-full mr-3 mt-2 flex-shrink-0"></span>
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
          <div key={index} className="mb-4 p-3 bg-slate-50 border-l-4 border-teal-500 rounded-r-lg dark:bg-slate-900 dark:border-teal-600">
            <p className="text-slate-800 dark:text-slate-200 text-[15px] leading-relaxed">
              {parts.map((part, partIndex) => {
                if (part.match(/\*\*(.*?)\*\*/)) {
                  const boldText = part.replace(/\*\*/g, '')
                  return (
                    <strong key={partIndex} className="font-semibold text-slate-900 dark:text-slate-100">
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
        <p key={index} className="mb-6 text-slate-700 dark:text-slate-300 text-[15px] leading-relaxed">
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
        <Avatar className="w-10 h-10 bg-teal-600 shadow-sm ring-2 ring-teal-50 flex-shrink-0">
          <AvatarFallback className="bg-transparent">
            <Bot className="w-5 h-5 text-white" />
          </AvatarFallback>
        </Avatar>
      )}

      <div className={`max-w-4xl ${message.role === "user" ? "order-first ml-auto" : "mr-auto"}`}> 
        <Card
          className={`${
            message.role === "user"
              ? "bg-slate-900 border-slate-800 text-white shadow-md dark:bg-slate-800 dark:border-slate-700"
              : "bg-white border-slate-200 shadow-sm dark:bg-slate-900 dark:border-slate-800"
          } rounded-xl`}
        >
          <CardContent className="p-5">
            <div className="prose prose-sm max-w-none">
              {message.role === "assistant" ? (
                <FormattedContent content={message.content} />
              ) : (
                <p className="mb-0 text-[15px] leading-relaxed text-white dark:text-slate-100">
                  {message.content}
                </p>
              )}
            </div>

            {/* Policy References */}
            {message.policyReferences && message.policyReferences.length > 0 && (
              <div className="mt-4">
                <Card className="bg-slate-50 border border-slate-200 shadow-none rounded-lg dark:bg-slate-800 dark:border-slate-700">
                  <CardContent className="p-3">
                    <p className="text-xs font-semibold text-slate-600 mb-2 dark:text-slate-400">Referenced policies:</p>
                    <div className="flex flex-wrap gap-2">
                      {message.policyReferences.map((policy, index) => (
                        <span 
                          key={index} 
                          className="inline-block px-3 py-1 bg-white border border-slate-200 text-slate-700 text-xs rounded-full font-medium shadow-sm dark:bg-slate-900 dark:border-slate-700 dark:text-slate-300"
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
              <div className="flex items-center justify-between mt-4 pt-3 border-t border-slate-100 dark:border-slate-800">
                <div className="flex items-center space-x-2">
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={handleCopy}
                    className="h-8 px-3 text-slate-400 hover:text-slate-700 hover:bg-slate-100 rounded-lg transition-colors duration-150 dark:text-slate-500 dark:hover:text-slate-300 dark:hover:bg-slate-800"
                  >
                    <Copy className="w-3 h-3" />
                  </Button>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => handleFeedback("positive")}
                    className={`h-8 px-3 rounded-lg transition-colors duration-150 ${
                      feedback === "positive" 
                        ? "text-teal-600 bg-teal-50 dark:text-teal-400 dark:bg-teal-900/30" 
                        : "text-slate-400 hover:text-teal-600 hover:bg-teal-50 dark:text-slate-500 dark:hover:text-teal-400 dark:hover:bg-teal-900/30"
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
                        : "text-slate-400 hover:text-red-600 hover:bg-red-50 dark:text-slate-500 dark:hover:text-red-400 dark:hover:bg-red-900/30"
                    }`}
                  >
                    <ThumbsDown className="w-3 h-3" />
                  </Button>
                </div>
                <span className="text-xs text-slate-400 font-medium dark:text-slate-500">
                  {message.timestamp.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                </span>
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {message.role === "user" && (
        <Avatar className="w-10 h-10 bg-slate-200 shadow-sm ring-2 ring-slate-50 flex-shrink-0">
          <AvatarFallback className="bg-transparent">
            <User className="w-5 h-5 text-slate-600" />
          </AvatarFallback>
        </Avatar>
      )}
    </div>
  )
}

export default memo(Message)
