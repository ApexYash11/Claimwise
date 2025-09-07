"use client"

import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip"
import { MessageSquare, HelpCircle, BarChart3, Shield, DollarSign, Calendar, TrendingUp, FileText } from "lucide-react"
import type { PolicySummary } from "@/lib/api"

interface SuggestedQuestionsProps {
  onQuestionSelect: (question: string) => void
  policies?: PolicySummary[]
  selectedPolicyId?: string
}

export function SuggestedQuestions({ onQuestionSelect, policies = [], selectedPolicyId = "all" }: SuggestedQuestionsProps) {
  // Generate dynamic questions based on loaded policies
  const generateDynamicQuestions = () => {
    const questions = []
    const policyTypes = policies.map(p => p.policyType.toLowerCase())
    
    // Health insurance questions
    if (policyTypes.some(type => type.includes('health'))) {
      questions.push({
        category: "Health Coverage",
        icon: Shield,
        questions: [
          "What does my health insurance cover for emergency room visits?",
          "Am I covered for maternity and childbirth expenses?",
          "What's my deductible and out-of-pocket maximum?",
          "Does my policy cover preventive care and annual checkups?"
        ]
      })
    }
    
    // Auto insurance questions
    if (policyTypes.some(type => type.includes('auto'))) {
      questions.push({
        category: "Auto Insurance",
        icon: BarChart3,
        questions: [
          "Am I covered for rental cars with my auto insurance?",
          "What happens if I get into an accident?",
          "Does my policy cover rideshare driving?",
          "How much would comprehensive coverage cost me?"
        ]
      })
    }
    
    // Home insurance questions
    if (policyTypes.some(type => type.includes('home'))) {
      questions.push({
        category: "Home Protection",
        icon: Shield,
        questions: [
          "Does my home insurance cover water damage?",
          "Am I covered for theft and burglary?",
          "What natural disasters are included in my policy?",
          "How much would it cost to rebuild my home?"
        ]
      })
    }
    
    // Life insurance questions
    if (policyTypes.some(type => type.includes('life'))) {
      questions.push({
        category: "Life Insurance",
        icon: FileText,
        questions: [
          "How much life insurance coverage do I have?",
          "Who are my beneficiaries and how do I update them?",
          "When do my life insurance premiums increase?",
          "Can I borrow against my life insurance policy?"
        ]
      })
    }
    
    // General questions that apply to all policies
    questions.push({
      category: "Policy Management",
      icon: Calendar,
      questions: [
        "When do my policies expire and need renewal?",
        "How much am I paying in total premiums across all policies?",
        "What discounts am I missing out on?",
        "How do I file a claim and what documents do I need?"
      ]
    })
    
    // Comparison questions if multiple policies
    if (policies.length > 1) {
      questions.push({
        category: "Policy Comparison",
        icon: TrendingUp,
        questions: [
          "Which of my policies offers the best value?",
          "How do my premiums compare to industry averages?",
          "What coverage gaps exist across my policies?",
          "Should I bundle my policies with one provider?"
        ]
      })
    }
    
    return questions
  }

  const suggestedQuestions = policies.length > 0 ? generateDynamicQuestions() : [
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
  ]
  return (
    <Card className="border-0 shadow-xl rounded-2xl bg-white/80 dark:bg-gray-900/80 backdrop-blur-sm">
      <CardHeader className="pb-4">
        <CardTitle className="flex items-center space-x-2 text-lg">
          <HelpCircle className="w-5 h-5 text-blue-600 dark:text-blue-400" />
          <span>Suggested Questions</span>
        </CardTitle>
        {policies.length > 0 && (
          <div className="flex flex-wrap gap-1">
            {policies.slice(0, 2).map((policy) => (
              <Badge key={policy.id} variant="secondary" className="text-xs font-medium px-2 py-1 rounded-full bg-blue-50 dark:bg-blue-950/50 text-blue-700 dark:text-blue-300 border-blue-200 dark:border-blue-800">
                {policy.policyType}
              </Badge>
            ))}
            {policies.length > 2 && (
              <Badge variant="secondary" className="text-xs font-medium px-2 py-1 rounded-full bg-blue-50 dark:bg-blue-950/50 text-blue-700 dark:text-blue-300 border-blue-200 dark:border-blue-800">
                +{policies.length - 2}
              </Badge>
            )}
          </div>
        )}
      </CardHeader>
      <CardContent className="space-y-6">
        {suggestedQuestions.map((category) => (
          <div key={category.category}>
            <div className="flex items-center space-x-2 mb-3">
              <category.icon className="w-4 h-4 text-gray-600 dark:text-gray-400" />
              <h3 className="font-semibold text-gray-900 dark:text-white text-sm">{category.category}</h3>
            </div>
            <div className="space-y-2">
              {category.questions.map((question, index) => (
                <Tooltip key={index}>
                  <TooltipTrigger asChild>
                    <Button
                      variant="ghost"
                      className="w-full justify-start text-left h-auto p-3 text-sm text-gray-700 dark:text-gray-300 hover:bg-blue-50 dark:hover:bg-blue-950/50 hover:text-blue-700 dark:hover:text-blue-400 rounded-xl transition-colors duration-200 font-medium leading-relaxed"
                      onClick={() => onQuestionSelect(question)}
                    >
                      <MessageSquare className="w-3 h-3 mr-2 flex-shrink-0" />
                      <span className="truncate">{question}</span>
                    </Button>
                  </TooltipTrigger>
                  <TooltipContent 
                    side="top" 
                    className="max-w-sm p-3 text-sm bg-gray-900 dark:bg-gray-800 text-white dark:text-gray-100 rounded-lg shadow-lg border-0"
                    sideOffset={5}
                  >
                    <p className="leading-relaxed">{question}</p>
                  </TooltipContent>
                </Tooltip>
              ))}
            </div>
          </div>
        ))}
      </CardContent>
    </Card>
  )
}
