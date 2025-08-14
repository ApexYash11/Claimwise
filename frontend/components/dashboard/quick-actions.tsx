import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Upload, FileText, BarChart3, MessageSquare, ArrowRight } from "lucide-react"
import Link from "next/link"

const quickActions = [
  {
    title: "Upload New Policy",
    description: "Add insurance documents for analysis",
    icon: Upload,
    href: "/upload",
    color: "bg-blue-600 hover:bg-blue-700",
  },
  {
    title: "Analyze Policies",
    description: "Get AI-powered insights and recommendations",
    icon: FileText,
    href: "/analyze",
    color: "bg-green-600 hover:bg-green-700",
  },
  {
    title: "Compare Coverage",
    description: "Side-by-side policy comparison",
    icon: BarChart3,
    href: "/compare",
    color: "bg-purple-600 hover:bg-purple-700",
  },
  {
    title: "Ask AI Assistant",
    description: "Get instant answers about your policies",
    icon: MessageSquare,
    href: "/chat",
    color: "bg-orange-600 hover:bg-orange-700",
  },
]

export function QuickActions() {
  return (
    <Card className="border-0 shadow-lg">
      <CardHeader>
        <CardTitle className="text-lg">Quick Actions</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          {quickActions.map((action) => (
            <Button
              key={action.title}
              asChild
              variant="outline"
              className="h-auto p-4 flex flex-col items-start space-y-2 hover:shadow-md transition-shadow bg-transparent"
            >
              <Link href={action.href}>
                <div className="flex items-center justify-between w-full">
                  <div className={`w-8 h-8 rounded-lg flex items-center justify-center ${action.color}`}>
                    <action.icon className="w-4 h-4 text-white" />
                  </div>
                  <ArrowRight className="w-4 h-4 text-gray-400" />
                </div>
                <div className="text-left">
                  <p className="font-medium text-gray-900">{action.title}</p>
                  <p className="text-sm text-gray-600">{action.description}</p>
                </div>
              </Link>
            </Button>
          ))}
        </div>
      </CardContent>
    </Card>
  )
}
