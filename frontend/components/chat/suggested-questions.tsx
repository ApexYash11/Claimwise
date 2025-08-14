"use client"

import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { MessageSquare, HelpCircle, BarChart3, Shield, DollarSign, Calendar } from "lucide-react"

interface SuggestedQuestionsProps {
  onQuestionSelect: (question: string) => void
}

const suggestedQuestions = [
  {
    category: "Coverage",
    icon: Shield,
    questions: [
      "What does my health insurance cover for emergency room visits?",
      "Am I covered for rental cars with my auto insurance?",
      "Does my home insurance cover water damage?",
      "What's the difference between my deductible and out-of-pocket maximum?",
    ],
  },
  {
    category: "Costs",
    icon: DollarSign,
    questions: [
      "How much would I save by increasing my deductible?",
      "What are my monthly premium costs across all policies?",
      "Are there any discounts I'm missing out on?",
      "How do my premiums compare to industry averages?",
    ],
  },
  {
    category: "Claims",
    icon: BarChart3,
    questions: [
      "How do I file a claim for my auto insurance?",
      "What documentation do I need for a home insurance claim?",
      "What's the typical processing time for claims?",
      "Will filing a claim affect my premium rates?",
    ],
  },
  {
    category: "Policy Details",
    icon: Calendar,
    questions: [
      "When do my policies expire?",
      "What happens if I miss a premium payment?",
      "Can I make changes to my coverage mid-term?",
      "How do I add a new driver to my auto policy?",
    ],
  },
]

export function SuggestedQuestions({ onQuestionSelect }: SuggestedQuestionsProps) {
  return (
    <Card className="border-0 shadow-lg">
      <CardHeader>
        <CardTitle className="flex items-center space-x-2 text-lg">
          <HelpCircle className="w-5 h-5 text-blue-600" />
          <span>Suggested Questions</span>
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-6">
        {suggestedQuestions.map((category) => (
          <div key={category.category}>
            <div className="flex items-center space-x-2 mb-3">
              <category.icon className="w-4 h-4 text-gray-600" />
              <h3 className="font-medium text-gray-900">{category.category}</h3>
            </div>
            <div className="space-y-2">
              {category.questions.map((question, index) => (
                <Button
                  key={index}
                  variant="ghost"
                  className="w-full justify-start text-left h-auto p-3 text-sm text-gray-700 hover:bg-blue-50 hover:text-blue-700"
                  onClick={() => onQuestionSelect(question)}
                >
                  <MessageSquare className="w-3 h-3 mr-2 flex-shrink-0" />
                  <span className="truncate">{question}</span>
                </Button>
              ))}
            </div>
          </div>
        ))}
      </CardContent>
    </Card>
  )
}
