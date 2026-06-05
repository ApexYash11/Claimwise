import { cn } from "@/lib/utils"

function Skeleton({ className, ...props }: React.ComponentProps<"div">) {
  return (
    <div
      data-slot="skeleton"
      className={cn("bg-accent animate-pulse rounded-md", className)}
      {...props}
    />
  )
}

function CardSkeleton() {
  return (
    <div className="rounded-xl bg-card p-6 shadow-sm">
      <div className="flex items-start justify-between">
        <div className="space-y-3">
          <Skeleton className="h-4 w-24" />
          <Skeleton className="h-8 w-16" />
          <Skeleton className="h-3 w-32" />
        </div>
        <Skeleton className="h-12 w-12 rounded-full" />
      </div>
    </div>
  )
}

function MetricGridSkeleton() {
  return (
    <div className="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-4">
      <CardSkeleton />
      <CardSkeleton />
      <CardSkeleton />
      <CardSkeleton />
    </div>
  )
}

function DashboardSkeleton() {
  return (
    <div className="space-y-8 px-4 py-8">
      <div className="flex items-start justify-between">
        <div className="space-y-2">
          <Skeleton className="h-8 w-72" />
          <Skeleton className="h-5 w-96" />
        </div>
        <Skeleton className="h-10 w-36" />
      </div>
      <MetricGridSkeleton />
      <div className="grid grid-cols-1 gap-8 lg:grid-cols-3">
        <div className="space-y-4 lg:col-span-2">
          <Skeleton className="h-6 w-40" />
          <Skeleton className="h-64 rounded-xl" />
        </div>
        <div className="space-y-4">
          <Skeleton className="h-6 w-40" />
          <Skeleton className="h-48 rounded-xl" />
        </div>
      </div>
    </div>
  )
}

function AnalyzeSkeleton() {
  return (
    <div className="flex h-full">
      <div className="w-1/4 border-r border-slate-200 p-4 dark:border-slate-800">
        <Skeleton className="mb-4 h-10 w-full" />
        <div className="space-y-3">
          <Skeleton className="h-16 w-full" />
          <Skeleton className="h-16 w-full" />
          <Skeleton className="h-16 w-full" />
        </div>
      </div>
      <div className="flex-1 p-6">
        <div className="space-y-6">
          <Skeleton className="h-8 w-64" />
          <div className="grid grid-cols-3 gap-4">
            <Skeleton className="h-24" />
            <Skeleton className="h-24" />
            <Skeleton className="h-24" />
          </div>
          <Skeleton className="h-48" />
        </div>
      </div>
    </div>
  )
}

export { Skeleton, CardSkeleton, MetricGridSkeleton, DashboardSkeleton, AnalyzeSkeleton }
