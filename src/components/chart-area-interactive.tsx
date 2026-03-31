"use client"

import * as React from "react"
import { Area, AreaChart, CartesianGrid, ReferenceLine, XAxis, YAxis, Tooltip } from "recharts"
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
  avg: string | number
  min: string | number
  max: string | number
}

type AssetEntry = { id: number; name: string }

/**
 * Custom tooltip for the multi-asset sensor chart.
 * Aggregates and displays min, max, and avg values for all visible assets at a time point.
 */
function SensorTooltip({
  active, payload, label, unit, metricMin, metricMax, chartConfig,
}: {
  active?: boolean
  payload?: { dataKey: string; value: number; payload: Record<string, number> }[]
  label?: string
  unit: string
  metricMin?: number
  metricMax?: number
  chartConfig: ChartConfig
}) {
  if (!active || !payload?.length) return null
  const assets = payload.filter(p => !String(p.dataKey).includes("_"))
  if (!assets.length) return null

  const mins = assets.map(p => Number(p.payload[`${p.dataKey}_min`])).filter(Number.isFinite)
  const maxs = assets.map(p => Number(p.payload[`${p.dataKey}_max`])).filter(Number.isFinite)
  const avgs = assets.map(p => Number(p.value)).filter(Number.isFinite)
  const avg  = Math.round((avgs.reduce((a, b) => a + b, 0) / avgs.length) * 100) / 100

  const outliers = assets.filter(p => {
    const v = Number(p.value)
    return (metricMax && v > metricMax) || (metricMin && v < metricMin)
  })

  return (
    <div className="rounded-lg border bg-background p-3 shadow-md text-xs">
      <p className="mb-2 font-medium text-foreground">{label}</p>
      <div className="grid grid-cols-3 gap-x-4 text-muted-foreground">
        <span>Min<br /><span className="text-foreground font-medium">{Math.min(...mins)} {unit}</span></span>
        <span>Avg<br /><span className="text-foreground font-medium">{avg} {unit}</span></span>
        <span>Max<br /><span className="text-foreground font-medium">{Math.max(...maxs)} {unit}</span></span>
      </div>
      {outliers.length > 0 && (
        <div className="mt-2 pt-2 border-t border-border">
          <p className="text-red-500 font-medium mb-1">Out of range</p>
          {outliers.map(p => (
            <div key={p.dataKey} className="flex items-center justify-between gap-3">
              <span className="text-muted-foreground truncate">{String(chartConfig[p.dataKey]?.label ?? p.dataKey)}</span>
              <span className="text-red-500 font-medium tabular-nums">{Number(p.value).toFixed(2)} {unit}</span>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}

/**
 * Main Interactive Chart Component.
 * Features:
 * - Dynamic time-bucketing (managed by API)
 * - Multi-asset visualization with distinct colors
 * - Metric and Asset-type filtering
 * - Safety boundaries (Reference Areas)
 */
export function ChartAreaInteractive() {
  const isMobile = useIsMobile()
  const { facilityId, selectedAssetId, setSelectedAssetId } = useFacility()
  
  // Dashboard state: metric type and time window
  const [metric, setMetric] = React.useState("power")
  const [hours, setHours] = React.useState("24")

  // Asset filter is driven directly from context — no local copy needed
  const filterAssetId = selectedAssetId ?? "all"

  // Scroll chart into view when an asset is selected from the sidebar
  const cardRef = React.useRef<HTMLDivElement>(null)

  // Keep a ref to raw so the auto-focus effect can read it without depending on it
  // (avoids re-firing every 30s on polling)
  const rawRef = React.useRef<Reading[]>([])

  React.useEffect(() => {
    if (!selectedAssetId) return
    cardRef.current?.scrollIntoView({ behavior: "smooth", block: "start" })
    // Switch to the metric that's out of range for this asset
    const assetReadings = rawRef.current.filter(r => String(r.assetId) === selectedAssetId)
    for (const r of assetReadings) {
      const mDef = METRICS.find(m => m.name === r.metricName)
      if (!mDef) continue
      if ((mDef.max && Number(r.avg) > mDef.max) || (mDef.min && Number(r.avg) < mDef.min)) {
        setMetric(r.metricName)
        break
      }
    }
  }, [selectedAssetId])

  // UX: Default to a smaller window on mobile to reduce data density
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
  rawRef.current = raw

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

  // Dropdown lists all assets that have data for the current metric — not filtered by selection
  const assetsWithMetric = React.useMemo(() => {
    const withMetric = new Set(raw.filter(r => r.metricName === metric).map(r => r.assetId))
    return allAssets.filter(a => withMetric.has(a.id))
  }, [raw, metric, allAssets])

  const assetGroups = React.useMemo(() => {
    const typeMap = new Map(assetList.map(a => [a.id, a.type]))
    const withType = assetsWithMetric.map(a => ({ ...a, type: typeMap.get(a.id) ?? "sensor" }))
    const types = Array.from(new Set(withType.map(a => a.type))).sort()
    return types.map(type => ({
      label: toLabel(type),
      assets: withType.filter(a => a.type === type).sort((a, b) => a.name.localeCompare(b.name))
    }))
  }, [assetsWithMetric, assetList])

  const activeMetric = METRICS.find(m => m.name === metric) ?? METRICS[0]!

  const outlierAssets = React.useMemo(() => {
    const outliers = new Set<number>()
    for (const r of readings) {
      if (activeMetric.max && Number(r.avg) > activeMetric.max) outliers.add(r.assetId)
      if (activeMetric.min && Number(r.avg) < activeMetric.min) outliers.add(r.assetId)
    }
    return outliers
  }, [readings, activeMetric])

  const chartConfig = React.useMemo(() => {
    const config: ChartConfig = {}
    visibleAssets.forEach((asset, i) => {
      const isOutlier = outlierAssets.has(asset.id)
      config[`a${asset.id}`] = {
        label: asset.name,
        color: isOutlier ? "#ef4444" : `var(--chart-${(i % 5) + 1})`,
      }
    })
    return config
  }, [visibleAssets, outlierAssets])

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
      byBucket.get(r.bucket)![`a${r.assetId}`]        = Number(r.avg)
      byBucket.get(r.bucket)![`a${r.assetId}_min`]    = Number(r.min)
      byBucket.get(r.bucket)![`a${r.assetId}_max`]    = Number(r.max)
    }
    return Array.from(byBucket.entries())
      .sort(([a], [b]) => new Date(a).getTime() - new Date(b).getTime())
      .map(([, v]) => v)
  }, [readings])

  const noDataReason = React.useMemo(() => {
    if (data.length > 0) return null
    if (raw.length === 0) return "No readings in this time range — data may still be loading."
    const selectedAsset = allAssets.find(a => String(a.id) === filterAssetId)
    if (filterAssetId !== "all" && selectedAsset)
      return `${selectedAsset.name} does not report ${toLabel(metric)}.`
    return `No assets report ${toLabel(metric)} in this ${facilityId ? "facility" : "system"}.`
  }, [data, raw, allAssets, filterAssetId, metric, facilityId])

  return (
    <Card ref={cardRef} className="@container/card">
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
          <Select 
            value={filterAssetId} 
            onValueChange={(v) => setSelectedAssetId(v === "all" ? null : v)}
          >
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
            <CartesianGrid vertical={false} />
            <XAxis dataKey="time" tickLine={false} axisLine={false} tickMargin={8} minTickGap={32} />
            <YAxis tickLine={false} axisLine={false} tickMargin={8} width={50} />
            <Tooltip
              cursor={false}
              content={<SensorTooltip unit={activeMetric.unit} metricMin={activeMetric.min} metricMax={activeMetric.max} chartConfig={chartConfig} />}
            />
            {activeMetric.max && (
              <ReferenceLine y={activeMetric.max} stroke="red" strokeDasharray="3 3" strokeOpacity={0.5} label={{ position: 'insideTopLeft', value: 'High', fill: 'red', fontSize: 10, opacity: 0.5 }} />
            )}
            {activeMetric.min && (
              <ReferenceLine y={activeMetric.min} stroke="red" strokeDasharray="3 3" strokeOpacity={0.5} label={{ position: 'insideBottomLeft', value: 'Low', fill: 'red', fontSize: 10, opacity: 0.5 }} />
            )}
            {visibleAssets.map((asset) => (
              <Area
                key={asset.id}
                dataKey={`a${asset.id}`}
                type="monotone"
                fill="none"
                stroke={chartConfig[`a${asset.id}`]?.color}
                strokeWidth={filterAssetId === "all" ? 1.5 : 2.5}
                style={{ cursor: "pointer" }}
                onClick={() => setSelectedAssetId(selectedAssetId === String(asset.id) ? null : String(asset.id))}
                dot={(props: Record<string, unknown>) => {
                  const cx = props.cx as number;
                  const cy = props.cy as number;
                  const value = props.value as number;
                  if (value > activeMetric.max || value < activeMetric.min) {
                    return <circle key={`${asset.id}-${cx}`} cx={cx} cy={cy} r={3} fill="red" stroke="white" strokeWidth={1} />;
                  }
                  return null;
                }}
              />
            ))}
          </AreaChart>
        </ChartContainer>
        )}
      </CardContent>
    </Card>
  )
}
