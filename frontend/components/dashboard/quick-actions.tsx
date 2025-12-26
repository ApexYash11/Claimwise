import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Upload, FileText, MessageSquare, BarChart3, ArrowRight } from "lucide-react"
import Link from "next/link"

const quickActions = [
  {
    title: "Upload Policy",
    icon: Upload,
    href: "/upload",
    variant: "default" as const,
  },
  {
    title: "Analyze Policies",
    icon: FileText,
    href: "/analyze",
    variant: "outline" as const,
  },
  {
    title: "Chat Assistant",
    icon: MessageSquare,
    href: "/chat",
    variant: "outline" as const,
  },
  {
    title: "Compare Policies",
    icon: BarChart3,
    href: "/compare",
    variant: "outline" as const,
  },
]

export function QuickActions() {
  return (
    <Card className="h-full">
      <CardHeader>
        <CardTitle className="text-lg font-serif">Quick Actions</CardTitle>
      </CardHeader>
      <CardContent className="grid gap-3">
        {quickActions.map((action) => (
          <Link key={action.title} href={action.href} className="w-full">
            <Button 
              variant={action.variant} 
              className={`w-full justify-start h-10 ${action.variant === 'default' ? 'bg-slate-900 hover:bg-slate-800 text-white' : 'hover:bg-slate-50'}`}
            >
              <action.icon className="mr-2 h-4 w-4" />
              {action.title}
              {action.variant === 'default' && <ArrowRight className="ml-auto h-4 w-4 opacity-50" />}
            </Button>
          </Link>
        ))}
      </CardContent>
    </Card>
  )
}
