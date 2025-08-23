
import { Card } from "@/components/ui/card"
import { Upload, FileText, MessageSquare, BarChart3 } from "lucide-react"
import Link from "next/link"

const quickActions = [
  {
    title: "Upload Documents",
    description: "Add new insurance policies for analysis",
    icon: Upload,
    href: "/upload",
    gradient: "from-blue-500 to-blue-600",
    bgGradient: "from-blue-50 to-indigo-50",
    borderGradient: "from-blue-200/50 to-indigo-200/50"
  },
  {
    title: "Analyze Policies",
    description: "Get AI-powered insights and recommendations",
    icon: FileText,
    href: "/analyze",
    gradient: "from-green-500 to-green-600",
    bgGradient: "from-green-50 to-emerald-50",
    borderGradient: "from-green-200/50 to-emerald-200/50"
  },
  {
    title: "Chat Assistant",
    description: "Ask questions about your coverage",
    icon: MessageSquare,
    href: "/chat",
    gradient: "from-purple-500 to-purple-600",
    bgGradient: "from-purple-50 to-violet-50",
    borderGradient: "from-purple-200/50 to-violet-200/50"
  },
  {
    title: "Compare Policies",
    description: "Side-by-side policy comparison",
    icon: BarChart3,
    href: "/compare",
    gradient: "from-orange-500 to-orange-600",
    bgGradient: "from-orange-50 to-amber-50",
    borderGradient: "from-orange-200/50 to-amber-200/50"
  },
]

export function QuickActions() {
  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-8">
      {quickActions.map((action) => (
        <Link key={action.title} href={action.href}>
          <Card className={`border-0 shadow-lg hover:shadow-xl transition-all duration-300 cursor-pointer group bg-gradient-to-br ${action.bgGradient} dark:from-gray-800/80 dark:to-gray-900/80 backdrop-blur-sm hover:scale-105`}>
            <div className="p-6 h-full">
              <div className="flex items-start space-x-4 h-full">
                <div className={`w-12 h-12 rounded-xl flex items-center justify-center bg-gradient-to-br ${action.gradient} group-hover:scale-110 transition-transform duration-300 shadow-md flex-shrink-0`}>
                  <action.icon className="w-6 h-6 text-white" />
                </div>
                <div className="flex-1 min-w-0">
                  <h3 className="text-lg font-bold text-gray-900 dark:text-white mb-2 group-hover:text-transparent group-hover:bg-gradient-to-r group-hover:bg-clip-text group-hover:from-gray-900 group-hover:to-gray-700 dark:group-hover:from-white dark:group-hover:to-gray-200 transition-all duration-300 leading-tight">
                    {action.title}
                  </h3>
                  <p className="text-sm text-gray-600 dark:text-gray-400 leading-relaxed">
                    {action.description}
                  </p>
                </div>
              </div>
            </div>
          </Card>
        </Link>
      ))}
    </div>
  )
}
