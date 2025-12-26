import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import type { LucideIcon } from "lucide-react"
import { cn } from "@/lib/utils"

interface StatsCardProps {
  title: string
  value: string | number
  description?: string
  icon: LucideIcon
  trend?: string
  alert?: boolean
}

export function StatsCard({ title, value, description, icon: Icon, trend, alert }: StatsCardProps) {
  return (
    <Card className={cn("transition-all", alert ? "border-amber-200 bg-amber-50/50" : "")}>
      <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
        <CardTitle className="text-sm font-medium text-muted-foreground">{title}</CardTitle>
        <Icon className={cn("h-4 w-4", alert ? "text-amber-600" : "text-muted-foreground")} />
      </CardHeader>
      <CardContent>
        <div className="text-2xl font-bold font-mono tracking-tight">{value}</div>
        <p className="text-xs text-muted-foreground mt-1">
          {description}
        </p>
        {trend && (
          <p className={cn("text-xs mt-1 font-medium", alert ? "text-amber-700" : "text-emerald-600")}>
            {trend}
          </p>
        )}
      </CardContent>
    </Card>
  )
}
