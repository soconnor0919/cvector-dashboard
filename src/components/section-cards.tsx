"use client"

import { useFacility } from "@/components/providers/facility-provider"
import { queryKeys } from "@/lib/query-keys"
import { statusClasses } from "@/components/status-badge"
import { Badge } from "@/components/ui/badge"
import {
  Card,
  CardAction,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card"
import { cn } from "@/lib/utils"
import { keepPreviousData, useQuery } from "@tanstack/react-query"

function Shimmer({ className }: { className?: string }) {
  return (
    <span className={cn("inline-block animate-pulse rounded bg-muted select-none", className)}>
      &nbsp;
    </span>
  )
}

function onlineBadgeClass(pct: number) {
  if (pct >= 100) return "border-transparent bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400"
  if (pct > 80)   return "border-transparent bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-400"
  return statusClasses.error
}

/**
 * Renders the top-level KPI cards for the dashboard.
 * Shows:
 * - Total Assets and their online percentage
 * - Total Power Consumption (sum of latest readings)
 * - Total Output Rate (sum of latest readings)
 * - Active Alert Count (warning/error statuses)
 * - Summary of online vs offline assets
 */
export function SectionCards() {
  const { facilityId } = useFacility()
  
  // Fetch summary data: auto-refetches every 30s as configured in query-provider
  const { data, isLoading } = useQuery({
    queryKey: queryKeys.summary(facilityId),
    queryFn: () => fetch(`/api/dashboard/summary${facilityId ? `?facilityId=${facilityId}` : ""}`).then(r => r.json()),
    placeholderData: keepPreviousData,
  })

  // Data processing: Extract and format KPI values from the aggregated response
  const totalAssets  = Number(data?.totalResult?.count ?? 0)
  const online       = Number(data?.assetStatuses?.find((s: { status: string }) => s.status === "online")?.count ?? 0)
  const totalPower   = parseFloat(data?.metrics?.find((m: { metricName: string }) => m.metricName === "power")?.totalValue ?? "0").toFixed(1)
  const totalOutput  = parseFloat(data?.metrics?.find((m: { metricName: string }) => m.metricName === "output")?.totalValue ?? "0").toLocaleString(undefined, { maximumFractionDigits: 1 })
  const alerts       = data?.assetStatuses
    ?.filter((s: { status: string }) => ["warning", "error"].includes(s.status))
    .reduce((sum: number, s: { count: number }) => sum + Number(s.count), 0) ?? 0
  const onlinePct    = totalAssets > 0 ? (online / totalAssets) * 100 : 100

  return (
    <div className="grid grid-cols-1 gap-4 px-4 *:data-[slot=card]:bg-gradient-to-t *:data-[slot=card]:from-primary/5 *:data-[slot=card]:to-card *:data-[slot=card]:shadow-xs lg:px-6 @xl/main:grid-cols-2 @5xl/main:grid-cols-4 dark:*:data-[slot=card]:bg-card">
      <Card className="@container/card">
        <CardHeader>
          <CardDescription>Total Assets</CardDescription>
          <CardTitle className="text-2xl font-semibold tabular-nums @[250px]/card:text-3xl">
            {isLoading ? <Shimmer className="w-16" /> : totalAssets.toLocaleString()}
          </CardTitle>
          <CardAction>
            <Badge variant="outline" className={cn(!isLoading && onlineBadgeClass(onlinePct))}>
              {isLoading ? <Shimmer className="w-20" /> : totalAssets > 0 ? `${onlinePct.toFixed(1)}% online` : "No data"}
            </Badge>
          </CardAction>
        </CardHeader>
      </Card>

      <Card className="@container/card">
        <CardHeader>
          <CardDescription>Total Power Consumption</CardDescription>
          <CardTitle className="text-2xl font-semibold tabular-nums @[250px]/card:text-3xl">
            {isLoading ? <Shimmer className="w-16" /> : `${totalPower} kW`}
          </CardTitle>
          <CardAction>
            <Badge variant="outline">
              {isLoading ? <Shimmer className="w-20" /> : "Current status"}
            </Badge>
          </CardAction>
        </CardHeader>
      </Card>

      <Card className="@container/card">
        <CardHeader>
          <CardDescription>Total Output Rate</CardDescription>
          <CardTitle className="text-2xl font-semibold tabular-nums @[250px]/card:text-3xl">
            {isLoading ? <Shimmer className="w-16" /> : `${totalOutput} units/hr`}
          </CardTitle>
          <CardAction>
            <Badge variant="outline">
              {isLoading ? <Shimmer className="w-20" /> : "Current status"}
            </Badge>
          </CardAction>
        </CardHeader>
      </Card>

      <Card className="@container/card">
        <CardHeader>
          <CardDescription>Active Alerts</CardDescription>
          <CardTitle className="text-2xl font-semibold tabular-nums @[250px]/card:text-3xl">
            {isLoading ? <Shimmer className="w-16" /> : alerts.toLocaleString()}
          </CardTitle>
          <CardAction>
            <Badge variant="outline" className={cn(!isLoading && alerts > 0 && statusClasses.error)}>
              {isLoading ? <Shimmer className="w-20" /> : alerts > 0 ? "Needs attention" : "All clear"}
            </Badge>
          </CardAction>
        </CardHeader>
      </Card>
    </div>
  )
}
