
import { Card } from "@/components/ui/card"
import { Upload, FileText } from "lucide-react"
import Link from "next/link"

const quickActions = [
  {
    title: "Upload New Policy",
    description: "Add insurance documents for analysis",
    icon: Upload,
    href: "/upload",
    color: "bg-blue-600",
  },
  {
    title: "Analyze Policies",
    description: "Get AI-powered insights and recommendations",
    icon: FileText,
    href: "/analyze",
    color: "bg-green-600",
  },
]

export function QuickActions() {
  return (
    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
      {quickActions.map((action) => (
        <Link key={action.title} href={action.href}>
          <Card className="border-0 shadow-lg h-full hover:shadow-xl transition-shadow duration-200 cursor-pointer group">
            <div className="p-6 flex flex-col h-full">
              <div className="flex items-center justify-between mb-4">
                <span className={`w-12 h-12 rounded-lg flex items-center justify-center ${action.color}`}>
                  <action.icon className="w-6 h-6 text-white" />
                </span>
                <span className="w-8 h-8 rounded-full flex items-center justify-center bg-gray-100 group-hover:bg-gray-200 transition-colors">
                  <action.icon className="w-4 h-4 text-gray-600" />
                </span>
              </div>
              <div className="flex-1">
                <h3 className="text-lg font-semibold text-gray-900 mb-2">{action.title}</h3>
                <p className="text-sm text-gray-600">{action.description}</p>
              </div>
            </div>
          </Card>
        </Link>
      ))}
    </div>
  )
}
