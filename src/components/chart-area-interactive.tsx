"use client"

import * as React from "react"
import { Area, AreaChart, CartesianGrid, XAxis, YAxis } from "recharts"
import { useQuery } from "@tanstack/react-query"
import { useIsMobile } from "@/hooks/use-mobile"
import { useFacility } from "@/components/providers/facility-provider"
import {
  Card,
  CardAction,
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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import {
  ToggleGroup,
  ToggleGroupItem,
} from "@/components/ui/toggle-group"
import { METRICS } from "@/server/db/metrics"

function toLabel(name: string) {
  return name.charAt(0).toUpperCase() + name.slice(1).replace("_", " ")
}

export function ChartAreaInteractive() {
  const isMobile = useIsMobile()
  const { facilityId } = useFacility()
  const [metric, setMetric] = React.useState("power")
  const [hours, setHours] = React.useState("24")

  React.useEffect(() => {
    if (isMobile) setHours("6")
  }, [isMobile])

  const params = new URLSearchParams({ metric, hours })
  if (facilityId) params.set("facilityId", facilityId)

  const { data: raw = [] } = useQuery({
    queryKey: ["sensor-readings", metric, hours, facilityId],
    queryFn: () => fetch(`/api/sensor-readings?${params}`).then(r => r.json()),
  })

  const chartData = (raw as { timestamp: string; value: number }[]).map((row) => ({
    time: new Date(row.timestamp).toLocaleTimeString("en-US", {
      month: "short",
      day: "numeric",
      hour: "numeric",
      minute: "2-digit",
    }),
    value: parseFloat(String(row.value)),
  }))

  const activeMetric = METRICS.find(m => m.name === metric)!

  const chartConfig = {
    value: {
      label: "",
      color: "var(--primary)",
    },
  } satisfies ChartConfig

  return (
    <Card className="@container/card">
      <CardHeader>
        <CardTitle>Sensor Readings</CardTitle>
        <CardDescription>
          {toLabel(activeMetric.name)} over the last {hours === "1" ? "hour" : `${hours} hours`}
        </CardDescription>
        <CardAction className="flex gap-2">
          <Select value={metric} onValueChange={setMetric}>
            <SelectTrigger className="w-36" size="sm">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {METRICS.map(m => (
                <SelectItem key={m.name} value={m.name}>{toLabel(m.name)}</SelectItem>
              ))}
            </SelectContent>
          </Select>
          <ToggleGroup
            type="single"
            value={hours}
            onValueChange={(v) => v && setHours(v)}
            variant="outline"
            className="hidden *:data-[slot=toggle-group-item]:px-4! @[767px]/card:flex"
          >
            <ToggleGroupItem value="0.25">15m</ToggleGroupItem>
            <ToggleGroupItem value="1">1h</ToggleGroupItem>
            <ToggleGroupItem value="6">6h</ToggleGroupItem>
            <ToggleGroupItem value="24">24h</ToggleGroupItem>
          </ToggleGroup>
          <Select value={hours} onValueChange={setHours}>
            <SelectTrigger
              className="flex w-20 **:data-[slot=select-value]:block **:data-[slot=select-value]:truncate @[767px]/card:hidden"
              size="sm"
            >
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="0.25">15m</SelectItem>
              <SelectItem value="1">1h</SelectItem>
              <SelectItem value="6">6h</SelectItem>
              <SelectItem value="24">24h</SelectItem>
            </SelectContent>
          </Select>
        </CardAction>
      </CardHeader>
      <CardContent className="px-2 pt-4 sm:px-6 sm:pt-6">
        <ChartContainer config={chartConfig} className="aspect-auto h-[250px] w-full">
          <AreaChart data={chartData}>
            <defs>
              <linearGradient id="fillValue" x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%"  stopColor="var(--color-value)" stopOpacity={0.8} />
                <stop offset="95%" stopColor="var(--color-value)" stopOpacity={0.1} />
              </linearGradient>
            </defs>
            <CartesianGrid vertical={false} />
            <XAxis
              dataKey="time"
              tickLine={false}
              axisLine={false}
              tickMargin={8}
              minTickGap={32}
            />
            <YAxis tickLine={false} axisLine={false} tickMargin={8} width={50} />
            <ChartTooltip
              cursor={false}
              content={<ChartTooltipContent indicator="dot" formatter={(value) => `${value} ${activeMetric.unit}`} />}
            />
            <Area
              dataKey="value"
              type="monotone"
              fill="url(#fillValue)"
              stroke="var(--color-value)"
            />
          </AreaChart>
        </ChartContainer>
      </CardContent>
    </Card>
  )
}
