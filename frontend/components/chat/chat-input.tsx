"use client"

import type React from "react"

import { useState } from "react"
import { Button } from "@/components/ui/button"
import { Textarea } from "@/components/ui/textarea"
import { Send, Loader2 } from "lucide-react"

interface ChatInputProps {
  onSendMessage: (message: string) => void
  isLoading?: boolean
  placeholder?: string
}

export function ChatInput({
  onSendMessage,
  isLoading,
  placeholder = "Ask a question about your policies...",
}: ChatInputProps) {
  const [message, setMessage] = useState("")

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    if (message.trim() && !isLoading) {
      onSendMessage(message.trim())
      setMessage("")
    }
  }

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault()
      handleSubmit(e)
    }
  }

  return (
    <form onSubmit={handleSubmit} className="flex gap-3">
      <div className="flex-1">
        <Textarea
          value={message}
          onChange={(e) => setMessage(e.target.value)}
          onKeyDown={handleKeyDown}
          placeholder={placeholder}
          className="min-h-[60px] max-h-32 resize-none border-gray-200 focus:border-blue-400 focus:ring-blue-400 rounded-xl shadow-sm bg-white/80 backdrop-blur-sm text-[15px] leading-relaxed transition-colors"
          disabled={isLoading}
        />
      </div>
      <Button
        type="submit"
        disabled={!message.trim() || isLoading}
        className="self-end bg-gradient-to-r from-blue-600 to-blue-500 hover:from-blue-700 hover:to-blue-600 shadow-lg rounded-xl px-5 py-3 transition-all duration-200 hover:shadow-xl disabled:opacity-50 disabled:cursor-not-allowed"
      >
        {isLoading ? 
          <Loader2 className="w-4 h-4 animate-spin" /> : 
          <Send className="w-4 h-4" />
        }
      </Button>
    </form>
  )
}
