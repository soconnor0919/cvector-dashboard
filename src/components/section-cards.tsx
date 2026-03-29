"use client"

import { useFacility } from "@/components/providers/facility-provider"
import { Badge } from "@/components/ui/badge"
import {
  Card,
  CardAction,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card"
import { Skeleton } from "@/components/ui/skeleton"
import { useQuery } from "@tanstack/react-query"
import { AlertTriangleIcon, BoxesIcon, CircleCheckIcon, ZapIcon } from "lucide-react"

export function SectionCards() {
  const { facilityId } = useFacility()
  const { data, isLoading } = useQuery({
    queryKey: ["summary", facilityId],
    queryFn: () => fetch(`/api/dashboard/summary${facilityId ? `?facilityId=${facilityId}` : ""}`).then(r => r.json()),
  })

  const totalAssets = Number(data?.totalResult?.count ?? 0)
  const online = Number(data?.assetStatuses?.find((s: { status: string }) => s.status === "online")?.count ?? 0)
  const avgPower = parseFloat(data?.metrics?.find((m: { metricName: string }) => m.metricName === "power")?.avgValue ?? "0").toFixed(1)
  const alerts = data?.assetStatuses
    ?.filter((s: { status: string }) => ["warning", "error"].includes(s.status))
    .reduce((sum: number, s: { count: number }) => sum + Number(s.count), 0) ?? 0

  return (
    <div className="grid grid-cols-1 gap-4 px-4 *:data-[slot=card]:bg-gradient-to-t *:data-[slot=card]:from-primary/5 *:data-[slot=card]:to-card *:data-[slot=card]:shadow-xs lg:px-6 @xl/main:grid-cols-2 @5xl/main:grid-cols-4 dark:*:data-[slot=card]:bg-card">
      <Card className="@container/card">
        <CardHeader>
          <CardDescription>Total Assets</CardDescription>
          <CardTitle className="text-2xl font-semibold tabular-nums @[250px]/card:text-3xl">
            {isLoading ? <Skeleton className="h-8 w-20" /> : totalAssets.toLocaleString()}
          </CardTitle>
          <CardAction>
            <Badge variant="outline">
              {isLoading ? <Skeleton className="h-3.5 w-16" /> : <><BoxesIcon aria-hidden="true" />{totalAssets > 0 ? `${((online / totalAssets) * 100).toFixed(1)}% Online` : "No data"}</>}
            </Badge>
          </CardAction>
        </CardHeader>
      </Card>

      <Card className="@container/card">
        <CardHeader>
          <CardDescription>Online</CardDescription>
          <CardTitle className="text-2xl font-semibold tabular-nums @[250px]/card:text-3xl">
            {isLoading ? <Skeleton className="h-8 w-20" /> : online.toLocaleString()}
          </CardTitle>
          <CardAction>
            <Badge variant="outline">
              {isLoading ? <Skeleton className="h-3.5 w-16" /> : <><CircleCheckIcon aria-hidden="true" />{totalAssets - online} offline</>}
            </Badge>
          </CardAction>
        </CardHeader>
      </Card>

      <Card className="@container/card">
        <CardHeader>
          <CardDescription>Avg Power Draw</CardDescription>
          <CardTitle className="text-2xl font-semibold tabular-nums @[250px]/card:text-3xl">
            {isLoading ? <Skeleton className="h-8 w-20" /> : `${avgPower} kW`}
          </CardTitle>
          <CardAction>
            <Badge variant="outline">
              {isLoading ? <Skeleton className="h-3.5 w-16" /> : <><ZapIcon aria-hidden="true" />Last 2 hours</>}
            </Badge>
          </CardAction>
        </CardHeader>
      </Card>

      <Card className="@container/card">
        <CardHeader>
          <CardDescription>Active Alerts</CardDescription>
          <CardTitle className="text-2xl font-semibold tabular-nums @[250px]/card:text-3xl">
            {isLoading ? <Skeleton className="h-8 w-20" /> : alerts.toLocaleString()}
          </CardTitle>
          <CardAction>
            <Badge variant={!isLoading && alerts > 0 ? "destructive" : "outline"}>
              {isLoading ? <Skeleton className="h-3.5 w-16" /> : <><AlertTriangleIcon aria-hidden="true" />{alerts > 0 ? "Needs attention" : "All clear"}</>}
            </Badge>
          </CardAction>
        </CardHeader>
      </Card>
    </div>
  )
}
