"use client"

import { LabelList, Pie, PieChart } from "recharts"
import { useQuery } from "@tanstack/react-query"
import { useFacility } from "@/components/providers/facility-provider"
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

export function ChartStatusPie() {
  const { facilityId } = useFacility()

  const params = new URLSearchParams()
  if (facilityId) params.set("facilityId", facilityId)

  const { data } = useQuery({
    queryKey: ["summary", facilityId],
    queryFn: () => fetch(`/api/dashboard/summary?${params}`).then(r => r.json()),
  })

  const chartData: { status: string; count: number; fill: string }[] =
    (data?.assetStatuses ?? []).map((s: { status: string; count: number }) => ({
      status: s.status,
      count:  s.count,
      fill:   STATUS_COLORS[s.status] ?? "#6b7280",
    }))

  return (
    <Card className="flex flex-col">
      <CardHeader className="items-center pb-0">
        <CardTitle className="text-sm font-medium">Asset Status</CardTitle>
        <CardDescription>Current operational status across all assets</CardDescription>
      </CardHeader>
      <CardContent className="flex-1 pb-0">
        <ChartContainer
          config={statusConfig}
          className="mx-auto aspect-square max-h-[280px] [&_.recharts-text]:fill-background"
        >
          <PieChart>
            <ChartTooltip content={<ChartTooltipContent nameKey="count" hideLabel />} />
            <Pie data={chartData} dataKey="count" nameKey="status">
              <LabelList
                dataKey="status"
                stroke="none"
                fontSize={12}
                formatter={(value) =>
                  `${statusConfig[value as string]?.label ?? value} (${chartData.find(d => d.status === value)?.count ?? 0})`
                }
              />
            </Pie>
          </PieChart>
        </ChartContainer>
      </CardContent>
    </Card>
  )
}
