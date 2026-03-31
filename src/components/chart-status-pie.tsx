"use client"

import * as React from "react"
import { Label, Pie, PieChart } from "recharts"
import { keepPreviousData, useQuery } from "@tanstack/react-query"
import { useFacility } from "@/components/providers/facility-provider"
import { queryKeys } from "@/lib/query-keys"
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card"
import {
  ChartContainer,
  ChartTooltip,
  ChartTooltipContent,
  type ChartConfig,
} from "@/components/ui/chart"

const STATUS_COLORS: Record<string, string> = {
  online:  "#22c55e",
  warning: "#f59e0b",
  error:   "#ef4444",
  offline: "#6b7280",
}

const statusConfig: ChartConfig = {
  count:   { label: "Assets" },
  online:  { label: "Online",  color: STATUS_COLORS.online  },
  warning: { label: "Warning", color: STATUS_COLORS.warning },
  error:   { label: "Error",   color: STATUS_COLORS.error   },
  offline: { label: "Offline", color: STATUS_COLORS.offline },
}

/**
 * Donut chart component showing asset status distribution.
 * Uses a centered Label to display total assets, preventing text overlap.
 */
export function ChartStatusPie() {
  const { facilityId } = useFacility()

  const params = new URLSearchParams()
  if (facilityId) params.set("facilityId", facilityId)

  const { data } = useQuery({
    queryKey: queryKeys.summary(facilityId),
    queryFn: () => fetch(`/api/dashboard/summary?${params}`).then(r => r.json()),
    placeholderData: keepPreviousData,
  })

  const chartData = React.useMemo(() => 
    (data?.assetStatuses ?? []).map((s: { status: string; count: number }) => ({
      status: s.status,
      count:  Number(s.count),
      fill:   STATUS_COLORS[s.status] ?? "#6b7280",
    })), [data])

  const totalAssets = React.useMemo(() => 
    chartData.reduce((acc: number, curr: { count: number }) => acc + curr.count, 0), [chartData])

  return (
    <Card className="flex flex-col">
      <CardHeader className="items-center pb-0">
        <CardTitle className="text-sm font-medium">Asset Status</CardTitle>
        <CardDescription>Current operational status across all assets</CardDescription>
      </CardHeader>
      <CardContent className="flex-1 pb-0">
        <ChartContainer
          config={statusConfig}
          className="mx-auto aspect-square max-h-[250px]"
        >
          <PieChart>
            <ChartTooltip cursor={false} content={<ChartTooltipContent hideLabel />} />
            <Pie
              data={chartData}
              dataKey="count"
              nameKey="status"
              innerRadius={60}
              strokeWidth={5}
            >
              <Label
                content={({ viewBox }) => {
                  if (viewBox && "cx" in viewBox && "cy" in viewBox) {
                    return (
                      <text
                        x={viewBox.cx}
                        y={viewBox.cy}
                        textAnchor="middle"
                        dominantBaseline="middle"
                      >
                        <tspan
                          x={viewBox.cx}
                          y={viewBox.cy}
                          className="fill-foreground text-3xl font-bold"
                        >
                          {totalAssets.toLocaleString()}
                        </tspan>
                        <tspan
                          x={viewBox.cx}
                          y={(viewBox.cy || 0) + 24}
                          className="fill-muted-foreground text-xs uppercase"
                        >
                          Assets
                        </tspan>
                      </text>
                    )
                  }
                }}
              />
            </Pie>
          </PieChart>
        </ChartContainer>
      </CardContent>
    </Card>
  )
}
