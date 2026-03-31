"use client"

import * as React from "react"
import {
  flexRender,
  getCoreRowModel,
  getFilteredRowModel,
  getPaginationRowModel,
  getSortedRowModel,
  useReactTable,
  type ColumnDef,
  type ColumnFiltersState,
  type SortingState,
  type VisibilityState,
} from "@tanstack/react-table"
import { useQuery } from "@tanstack/react-query"
import { useFacility } from "@/components/providers/facility-provider"
import { useIsMobile } from "@/hooks/use-mobile"
import { queryKeys } from "@/lib/query-keys"
import { StatusBadge } from "@/components/status-badge"
import { type Asset } from "@/types"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import {
  Drawer,
  DrawerClose,
  DrawerContent,
  DrawerDescription,
  DrawerFooter,
  DrawerHeader,
  DrawerTitle,
  DrawerTrigger,
} from "@/components/ui/drawer"
import { Label } from "@/components/ui/label"
import {
  Select,
  SelectContent,
  SelectGroup,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { Separator } from "@/components/ui/separator"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
import { Input } from "@/components/ui/input"
import {
  ChevronsLeftIcon,
  ChevronLeftIcon,
  ChevronRightIcon,
  ChevronsRightIcon,
  SearchIcon,
} from "lucide-react"
import { cn } from "@/lib/utils"
import {
  Area,
  AreaChart,
  CartesianGrid,
  ReferenceLine,
  XAxis,
  YAxis,
  Tooltip as RechartsTooltip,
  ResponsiveContainer,
} from "recharts"
import { ASSET_METRICS, METRICS } from "@/server/db/metrics"
import { toLabel } from "@/lib/utils"


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

/**
 * Renders individual sparkline-style charts for each metric reported by a single asset.
 * Includes "Safe Zone" reference areas for each metric type.
 */
function AssetCharts({ assetId, assetType }: { assetId: number; assetType: string }) {
  // Fetch asset-specific readings for the last 6 hours
  const { data: readings = [] } = useQuery<Reading[]>({
    queryKey: queryKeys.sensorReadings("6", null), 
    queryFn: () => fetch(`/api/sensor-readings?hours=6&assetId=${assetId}`).then(r => r.json()),
  })

  // Determine which metrics this asset type reports
  const metricNames = ASSET_METRICS[assetType] ?? ["temperature"]
  const assetMetrics = METRICS.filter(m => (metricNames as string[]).includes(m.name))

  if (readings.length === 0) return <div className="py-8 text-center text-muted-foreground">No recent data</div>

  return (
    <div className="flex flex-col gap-6 py-4">
      {assetMetrics.map((m) => {
        // Prepare chart-ready data for each metric
        const chartData = readings
          .filter(r => r.metricName === m.name && r.assetId === assetId)
          .sort((a, b) => new Date(a.bucket).getTime() - new Date(b.bucket).getTime())
          .map(r => ({
            time: new Date(r.bucket).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
            value: Number(r.avg),
          }))

        if (chartData.length === 0) return null

        return (
          <div key={m.name} className="flex flex-col gap-2">
            <span className="text-xs font-medium text-muted-foreground">{toLabel(m.name)} ({m.unit})</span>
            <div className="h-[120px] w-full">
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={chartData}>
                  <CartesianGrid vertical={false} strokeDasharray="3 3" opacity={0.3} />
                  <XAxis dataKey="time" hide />
                  <YAxis hide domain={['auto', 'auto']} />
                  <RechartsTooltip 
                    content={({ active, payload }) => {
                      if (active && payload && payload.length) {
                        return (
                          <div className="rounded-lg border bg-background p-2 shadow-sm text-[10px]">
                            <span className="font-bold">{payload[0].value} {m.unit}</span>
                          </div>
                        )
                      }
                      return null
                    }}
                  />
                  {m.max && <ReferenceLine y={m.max} stroke="red" strokeDasharray="3 3" strokeOpacity={0.5} />}
                  {m.min && <ReferenceLine y={m.min} stroke="red" strokeDasharray="3 3" strokeOpacity={0.5} />}
                  <Area
                    type="monotone"
                    dataKey="value"
                    stroke="var(--primary)"
                    fill="none"
                    strokeWidth={2}
                    dot={(props: Record<string, unknown>) => {
                      const cx = props.cx as number;
                      const cy = props.cy as number;
                      const value = props.value as number;
                      if (value > m.max || value < m.min) {
                        return <circle key={`${m.name}-${cx}`} cx={cx} cy={cy} r={3} fill="red" stroke="white" strokeWidth={1} />;
                      }
                      return null;
                    }}
                  />
                </AreaChart>
              </ResponsiveContainer>
            </div>
          </div>
        )
      })}
    </div>
  )
}

/**
 * Slide-out drawer showing full asset details and its sensor history.
 * Mobile: Bottom sheet
 * Desktop: Right-side panel
 */
function AssetDrawer({ asset, children }: { asset: Asset; children: React.ReactNode }) {
  const isMobile = useIsMobile()
  return (
    <Drawer direction={isMobile ? "bottom" : "right"}>
      <DrawerTrigger asChild>
        {children}
      </DrawerTrigger>
      <DrawerContent className={cn("flex flex-col h-full", !isMobile && "max-w-md ml-auto")}>
        <DrawerHeader className="gap-1">
          <DrawerTitle>{asset.name}</DrawerTitle>
          <DrawerDescription className="sr-only">Asset details and recent sensor readings</DrawerDescription>
        </DrawerHeader>
        <div className="flex-1 overflow-y-auto px-4 text-sm">
          <div className="flex flex-col gap-4">
            <Separator />
            <div className="grid grid-cols-2 gap-4">
              <div className="flex flex-col gap-1">
                <span className="text-muted-foreground">Type</span>
                <span className="capitalize font-medium">{asset.type}</span>
              </div>
              <div className="flex flex-col gap-1">
                <span className="text-muted-foreground">Status</span>
                <StatusBadge status={asset.status} />
              </div>
              <div className="flex flex-col gap-1">
                <span className="text-muted-foreground">Facility</span>
                <span className="font-medium">{asset.facilityName}</span>
              </div>
              <div className="flex flex-col gap-1">
                <span className="text-muted-foreground">Location</span>
                <span className="font-medium">{asset.facilityLocation ?? "—"}</span>
              </div>
            </div>
            {asset.description && (
              <>
                <Separator />
                <div className="flex flex-col gap-1">
                  <span className="text-muted-foreground">Description</span>
                  <span>{asset.description}</span>
                </div>
              </>
            )}
            <Separator />
            <div className="flex flex-col gap-1">
              <span className="text-muted-foreground font-medium mb-2 uppercase tracking-wider text-[10px]">Sensor History (6h)</span>
              <AssetCharts assetId={asset.id} assetType={asset.type} />
            </div>
          </div>
        </div>
        <DrawerFooter className="pt-4 border-t">
          <DrawerClose asChild>
            <Button variant="outline">Close</Button>
          </DrawerClose>
        </DrawerFooter>
      </DrawerContent>
    </Drawer>
  )
}

const columns: ColumnDef<Asset>[] = [
  {
    accessorKey: "name",
    header: "Name",
    cell: ({ row }) => <span className="font-medium">{row.original.name}</span>,
    enableHiding: false,
  },
  {
    accessorKey: "type",
    header: "Type",
    cell: ({ row }) => (
      <Badge variant="outline" className="px-1.5 text-muted-foreground capitalize">
        {row.original.type}
      </Badge>
    ),
  },
  {
    accessorKey: "status",
    header: "Status",
    cell: ({ row }) => <StatusBadge status={row.original.status} />,
  },
  {
    accessorKey: "facilityName",
    header: "Facility",
  },
  {
    accessorKey: "facilityLocation",
    header: "Location",
    cell: ({ row }) => row.original.facilityLocation ?? "—",
  },
]

/**
 * Assets Data Table.
 * Features:
 * - Full-text search on asset names
 * - Status and Type filtering
 * - Pagination (Client-side)
 * - Detail view via AssetDrawer
 */
export function DataTable() {
  const { facilityId, setSelectedAssetId } = useFacility()
  
  // Table state: filtering, sorting, and pagination
  const [search, setSearch] = React.useState("")
  const [filterStatus, setFilterStatus] = React.useState("all")
  const [filterType, setFilterType] = React.useState("all")
  const [columnVisibility, setColumnVisibility] = React.useState<VisibilityState>({})
  const [columnFilters, setColumnFilters] = React.useState<ColumnFiltersState>([])
  const [sorting, setSorting] = React.useState<SortingState>([])
  const [pagination, setPagination] = React.useState({ pageIndex: 0, pageSize: 10 })

  const { data: fetchedData = [] } = useQuery<Asset[]>({
    queryKey: queryKeys.assets(facilityId),
    queryFn: () => fetch(`/api/assets${facilityId ? `?facilityId=${facilityId}` : ""}`).then(r => r.json()),
  })

  const types = React.useMemo(() => [...new Set(fetchedData.map(a => a.type))].sort(), [fetchedData])

  const filtered = React.useMemo(() => fetchedData.filter(a => {
    if (search && !a.name.toLowerCase().includes(search.toLowerCase())) return false
    if (filterStatus !== "all" && a.status !== filterStatus) return false
    if (filterType !== "all" && a.type !== filterType) return false
    return true
  }), [fetchedData, search, filterStatus, filterType])

  const table = useReactTable({
    data: filtered,
    columns,
    state: { sorting, columnVisibility, columnFilters, pagination },
    getRowId: (row) => row.id.toString(),
    onSortingChange: setSorting,
    onColumnFiltersChange: setColumnFilters,
    onColumnVisibilityChange: setColumnVisibility,
    onPaginationChange: setPagination,
    getCoreRowModel: getCoreRowModel(),
    getFilteredRowModel: getFilteredRowModel(),
    getPaginationRowModel: getPaginationRowModel(),
    getSortedRowModel: getSortedRowModel(),
  })

  return (
    <div className="w-full flex flex-col gap-4">
      <div className="flex flex-wrap items-center gap-2 px-4 lg:px-6">
        <div className="relative flex-1 min-w-48">
          <SearchIcon aria-hidden="true" className="absolute left-2.5 inset-y-0 my-auto size-4 text-muted-foreground" />
          <Input
            aria-label="Search assets"
            placeholder="Search assets..."
            value={search}
            onChange={e => setSearch(e.target.value)}
            className="pl-8"
          />
        </div>
        <Select value={filterStatus} onValueChange={setFilterStatus}>
          <SelectTrigger className="w-32" aria-label="Filter by status">
            <SelectValue placeholder="Status" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All statuses</SelectItem>
            <SelectItem value="online">Online</SelectItem>
            <SelectItem value="warning">Warning</SelectItem>
            <SelectItem value="error">Error</SelectItem>
            <SelectItem value="offline">Offline</SelectItem>
          </SelectContent>
        </Select>
        <Select value={filterType} onValueChange={setFilterType}>
          <SelectTrigger className="w-32" aria-label="Filter by type">
            <SelectValue placeholder="Type" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All types</SelectItem>
            {types.map(t => (
              <SelectItem key={t} value={t} className="capitalize">{t}</SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>
      <div className="px-4 lg:px-6">
        <div className="flex flex-col gap-4">
          <div className="overflow-hidden rounded-lg border">
            <Table>
              <TableHeader className="sticky top-0 z-10 bg-muted">
                {table.getHeaderGroups().map((headerGroup) => (
                  <TableRow key={headerGroup.id}>
                    {headerGroup.headers.map((header) => (
                      <TableHead key={header.id} colSpan={header.colSpan}>
                        {header.isPlaceholder ? null : flexRender(header.column.columnDef.header, header.getContext())}
                      </TableHead>
                    ))}
                  </TableRow>
                ))}
              </TableHeader>
              <TableBody>
                {table.getRowModel().rows.length ? (
                  table.getRowModel().rows.map((row) => (
                    <AssetDrawer key={row.id} asset={row.original}>
                      <TableRow 
                        className="cursor-pointer hover:bg-muted/50"
                        onClick={() => setSelectedAssetId(String(row.original.id))}
                      >
                        {row.getVisibleCells().map((cell) => (
                          <TableCell key={cell.id}>
                            {flexRender(cell.column.columnDef.cell, cell.getContext())}
                          </TableCell>
                        ))}
                      </TableRow>
                    </AssetDrawer>
                  ))
                ) : (
                  <TableRow>
                    <TableCell colSpan={columns.length} className="h-24 text-center">
                      No results.
                    </TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>
          </div>
          <div className="flex items-center justify-end px-4 gap-8">
            <div className="hidden items-center gap-2 lg:flex">
              <Label htmlFor="rows-per-page" className="text-sm font-medium">Rows per page</Label>
              <Select
                value={`${table.getState().pagination.pageSize}`}
                onValueChange={(value) => table.setPageSize(Number(value))}
              >
                <SelectTrigger className="w-20" id="rows-per-page">
                  <SelectValue placeholder={table.getState().pagination.pageSize} />
                </SelectTrigger>
                <SelectContent side="top">
                  <SelectGroup>
                    {[10, 20, 30, 50].map((pageSize) => (
                      <SelectItem key={pageSize} value={`${pageSize}`}>{pageSize}</SelectItem>
                    ))}
                  </SelectGroup>
                </SelectContent>
              </Select>
            </div>
            <div className="flex w-fit items-center justify-center text-sm font-medium">
              Page {table.getState().pagination.pageIndex + 1} of {table.getPageCount()}
            </div>
            <div className="flex items-center gap-2">
              <Button variant="outline" className="hidden h-8 w-8 p-0 lg:flex" onClick={() => table.setPageIndex(0)} disabled={!table.getCanPreviousPage()}>
                <span className="sr-only">Go to first page</span>
                <ChevronsLeftIcon />
              </Button>
              <Button variant="outline" className="size-8" size="icon" onClick={() => table.previousPage()} disabled={!table.getCanPreviousPage()}>
                <span className="sr-only">Go to previous page</span>
                <ChevronLeftIcon />
              </Button>
              <Button variant="outline" className="size-8" size="icon" onClick={() => table.nextPage()} disabled={!table.getCanNextPage()}>
                <span className="sr-only">Go to next page</span>
                <ChevronRightIcon />
              </Button>
              <Button variant="outline" className="hidden size-8 lg:flex" size="icon" onClick={() => table.setPageIndex(table.getPageCount() - 1)} disabled={!table.getCanNextPage()}>
                <span className="sr-only">Go to last page</span>
                <ChevronsRightIcon />
              </Button>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
