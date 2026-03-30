"use client"

import * as React from "react"
import { Area, AreaChart, CartesianGrid, XAxis, YAxis, Tooltip } from "recharts"
import { keepPreviousData, useQuery } from "@tanstack/react-query"
import { useIsMobile } from "@/hooks/use-mobile"
import { useFacility } from "@/components/providers/facility-provider"
import { toLabel } from "@/lib/utils"
import { queryKeys } from "@/lib/query-keys"
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
  type ChartConfig,
} from "@/components/ui/chart"
import {
  Select,
  SelectContent,
  SelectGroup,
  SelectItem,
  SelectLabel,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import {
  ToggleGroup,
  ToggleGroupItem,
} from "@/components/ui/toggle-group"
import { METRICS } from "@/server/db/metrics"
import { type Asset } from "@/types"


type Reading = {
  bucket: string
  assetId: number
  assetName: string
  metricName: string
  unit: string
  avg: number
  min: number
  max: number
}

type AssetEntry = { id: number; name: string }

function SensorTooltip({
  active, payload, label, unit,
}: {
  active?: boolean
  payload?: { dataKey: string; value: number; payload: Record<string, number> }[]
  label?: string
  unit: string
}) {
  if (!active || !payload?.length) return null
  const assets = payload.filter(p => !String(p.dataKey).includes("_"))
  if (!assets.length) return null

  const mins = assets.map(p => Number(p.payload[`${p.dataKey}_min`])).filter(Number.isFinite)
  const maxs = assets.map(p => Number(p.payload[`${p.dataKey}_max`])).filter(Number.isFinite)
  const avgs = assets.map(p => Number(p.value)).filter(Number.isFinite)
  const avg  = Math.round((avgs.reduce((a, b) => a + b, 0) / avgs.length) * 100) / 100

  return (
    <div className="rounded-lg border bg-background p-3 shadow-md text-xs">
      <p className="mb-2 font-medium text-foreground">{label}</p>
      <div className="grid grid-cols-3 gap-x-4 text-muted-foreground">
        <span>Min<br /><span className="text-foreground font-medium">{Math.min(...mins)} {unit}</span></span>
        <span>Avg<br /><span className="text-foreground font-medium">{avg} {unit}</span></span>
        <span>Max<br /><span className="text-foreground font-medium">{Math.max(...maxs)} {unit}</span></span>
      </div>
    </div>
  )
}

export function ChartAreaInteractive() {
  const isMobile = useIsMobile()
  const { facilityId } = useFacility()
  const [metric, setMetric] = React.useState("power")
  const [hours, setHours] = React.useState("24")
  const [filterAssetId, setFilterAssetId] = React.useState("all")

  React.useEffect(() => {
    if (isMobile) setHours("6")
  }, [isMobile])

  const params = new URLSearchParams({ hours })
  if (facilityId) params.set("facilityId", facilityId)

  const { data: raw = [] } = useQuery<Reading[]>({
    queryKey: queryKeys.sensorReadings(hours, facilityId),
    queryFn: () => fetch(`/api/sensor-readings?${params}`).then(r => r.json()),
    placeholderData: keepPreviousData,
  })

  const { data: assetList = [] } = useQuery<Asset[]>({
    queryKey: queryKeys.assets(facilityId),
    queryFn: () => fetch(`/api/assets${facilityId ? `?facilityId=${facilityId}` : ""}`).then(r => r.json()),
  })

  const allAssets = React.useMemo(() => {
    const map = new Map<number, string>()
    for (const r of raw) map.set(r.assetId, r.assetName)
    return Array.from(map.entries())
      .map(([id, name]) => ({ id, name }))
      .sort((a, b) => a.name.localeCompare(b.name))
  }, [raw])

  const readings = React.useMemo(() =>
    raw.filter(r =>
      r.metricName === metric &&
      (filterAssetId === "all" || String(r.assetId) === filterAssetId)
    ),
    [raw, metric, filterAssetId]
  )

  const visibleAssets: AssetEntry[] = React.useMemo(() => {
    const withMetric = new Set(readings.map(r => r.assetId))
    return allAssets.filter(a =>
      withMetric.has(a.id) &&
      (filterAssetId === "all" || String(a.id) === filterAssetId)
    )
  }, [readings, allAssets, filterAssetId])

  const assetGroups = React.useMemo(() => {
    const statusMap = new Map(assetList.map(a => [a.id, a.status]))
    const withStatus = visibleAssets.map(a => ({ ...a, status: statusMap.get(a.id) ?? "offline" }))
    return [
      { label: "Online",  assets: withStatus.filter(a => a.status === "online") },
      { label: "Issues",  assets: withStatus.filter(a => a.status === "warning" || a.status === "error") },
      { label: "Offline", assets: withStatus.filter(a => a.status === "offline") },
    ].filter(g => g.assets.length > 0)
  }, [visibleAssets, assetList])

  const chartConfig = React.useMemo(() => {
    const config: ChartConfig = {}
    visibleAssets.forEach((asset, i) => {
      config[`a${asset.id}`] = {
        label: asset.name,
        color: `var(--chart-${(i % 5) + 1})`,
      }
    })
    return config
  }, [visibleAssets])

  const data = React.useMemo(() => {
    const byBucket = new Map<string, Record<string, unknown>>()
    for (const r of readings) {
      if (!byBucket.has(r.bucket)) {
        byBucket.set(r.bucket, {
          time: new Date(r.bucket).toLocaleTimeString("en-US", {
            month: "short", day: "numeric", hour: "numeric", minute: "2-digit",
          }),
        })
      }
      byBucket.get(r.bucket)![`a${r.assetId}`]        = r.avg
      byBucket.get(r.bucket)![`a${r.assetId}_min`]    = r.min
      byBucket.get(r.bucket)![`a${r.assetId}_max`]    = r.max
    }
    return Array.from(byBucket.entries())
      .sort(([a], [b]) => new Date(a).getTime() - new Date(b).getTime())
      .map(([, v]) => v)
  }, [readings])

  const activeMetric = METRICS.find(m => m.name === metric)!

  const noDataReason = React.useMemo(() => {
    if (data.length > 0) return null
    if (raw.length === 0) return "No readings in this time range — data may still be loading."
    const selectedAsset = allAssets.find(a => String(a.id) === filterAssetId)
    if (filterAssetId !== "all" && selectedAsset)
      return `${selectedAsset.name} does not report ${toLabel(metric)}.`
    return `No assets report ${toLabel(metric)} in this ${facilityId ? "facility" : "system"}.`
  }, [data, raw, allAssets, filterAssetId, metric, facilityId])

  return (
    <Card className="@container/card">
      <CardHeader>
        <CardTitle>Sensor Readings</CardTitle>
        <CardDescription>
          {toLabel(activeMetric.name)} — {hours === "0.25" ? "last 15 minutes" : `last ${hours === "1" ? "hour" : `${hours} hours`}`}
        </CardDescription>
        <CardAction className="flex flex-wrap gap-2">
          <Select value={metric} onValueChange={setMetric}>
            <SelectTrigger className="w-36" aria-label="Select metric">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {METRICS.map(m => (
                <SelectItem key={m.name} value={m.name}>{toLabel(m.name)}</SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Select value={filterAssetId} onValueChange={setFilterAssetId}>
            <SelectTrigger className="w-40" aria-label="Filter by asset">
              <SelectValue placeholder="All assets" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All assets</SelectItem>
              {assetGroups.map(group => (
                <SelectGroup key={group.label}>
                  <SelectLabel>{group.label}</SelectLabel>
                  {group.assets.map(a => (
                    <SelectItem key={a.id} value={String(a.id)}>{a.name}</SelectItem>
                  ))}
                </SelectGroup>
              ))}
            </SelectContent>
          </Select>
          <ToggleGroup
            type="single"
            value={hours}
            onValueChange={(v) => v && setHours(v)}
            variant="outline"
            aria-label="Select time range"
            className="hidden *:data-[slot=toggle-group-item]:px-4! @[767px]/card:flex"
          >
            <ToggleGroupItem value="0.25">15m</ToggleGroupItem>
            <ToggleGroupItem value="1">1h</ToggleGroupItem>
            <ToggleGroupItem value="6">6h</ToggleGroupItem>
            <ToggleGroupItem value="24">24h</ToggleGroupItem>
          </ToggleGroup>
          <Select value={hours} onValueChange={setHours}>
            <SelectTrigger className="w-20 @[767px]/card:hidden" aria-label="Select time range">
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
        {noDataReason ? (
          <div className="flex aspect-auto h-[250px] w-full items-center justify-center text-sm text-muted-foreground">
            {noDataReason}
          </div>
        ) : (
        <ChartContainer config={chartConfig} className="aspect-auto h-[250px] w-full">
          <AreaChart data={data}>
            <defs aria-hidden="true">
              {visibleAssets.map((asset, i) => (
                <linearGradient key={asset.id} id={`fill-a${asset.id}`} x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%"  style={{ stopColor: `var(--color-a${asset.id})`, stopOpacity: 0.3 }} />
                  <stop offset="95%" style={{ stopColor: `var(--color-a${asset.id})`, stopOpacity: 0 }} />
                </linearGradient>
              ))}
            </defs>
            <CartesianGrid vertical={false} />
            <XAxis dataKey="time" tickLine={false} axisLine={false} tickMargin={8} minTickGap={32} />
            <YAxis tickLine={false} axisLine={false} tickMargin={8} width={50} />
            <Tooltip
              cursor={false}
              content={<SensorTooltip unit={activeMetric.unit} />}
            />
            {visibleAssets.map((asset) => (
              <Area
                key={asset.id}
                dataKey={`a${asset.id}`}
                type="monotone"
                fill={`url(#fill-a${asset.id})`}
                stroke={`var(--color-a${asset.id})`}
                strokeWidth={1.5}
              />
            ))}
          </AreaChart>
        </ChartContainer>
        )}
      </CardContent>
    </Card>
  )
}
