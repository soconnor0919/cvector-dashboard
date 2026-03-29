"use client"

import * as React from "react"
import {
  closestCenter,
  DndContext,
  KeyboardSensor,
  MouseSensor,
  TouchSensor,
  useSensor,
  useSensors,
  type DragEndEvent,
  type UniqueIdentifier,
} from "@dnd-kit/core"
import { restrictToVerticalAxis } from "@dnd-kit/modifiers"
import {
  arrayMove,
  SortableContext,
  useSortable,
  verticalListSortingStrategy,
} from "@dnd-kit/sortable"
import { CSS } from "@dnd-kit/utilities"
import {
  flexRender,
  getCoreRowModel,
  getFilteredRowModel,
  getPaginationRowModel,
  getSortedRowModel,
  useReactTable,
  type ColumnDef,
  type ColumnFiltersState,
  type Row,
  type SortingState,
  type VisibilityState,
} from "@tanstack/react-table"
import { useQuery } from "@tanstack/react-query"
import { useFacility } from "@/components/providers/facility-provider"
import { useIsMobile } from "@/hooks/use-mobile"
import { cn } from "@/lib/utils"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Checkbox } from "@/components/ui/checkbox"
import {
  Drawer,
  DrawerClose,
  DrawerContent,
  DrawerFooter,
  DrawerHeader,
  DrawerTitle,
  DrawerTrigger,
} from "@/components/ui/drawer"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
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
import {
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
} from "@/components/ui/tabs"
import {
  AlertTriangleIcon,
  CircleCheckIcon,
  CircleIcon,
  ChevronsLeftIcon,
  ChevronLeftIcon,
  ChevronRightIcon,
  ChevronsRightIcon,
  EllipsisVerticalIcon,
  GripVerticalIcon,
  XCircleIcon,
} from "lucide-react"

type Asset = {
  id: number
  name: string
  type: string
  status: string
  description: string | null
  facilityId: number
  facilityName: string
  facilityLocation: string | null
}

function StatusBadge({ status }: { status: string }) {
  const configs: Record<string, { icon: React.ElementType; className: string }> = {
    online: { icon: CircleCheckIcon, className: "text-green-600 dark:text-green-400" },
    warning: { icon: AlertTriangleIcon, className: "text-yellow-600 dark:text-yellow-400" },
    error: { icon: XCircleIcon, className: "text-red-600 dark:text-red-400" },
    offline: { icon: CircleIcon, className: "text-muted-foreground" },
  }
  const config = configs[status] ?? configs.offline
  const Icon = config.icon
  return (
    <Badge variant="outline" className="px-1.5 text-muted-foreground capitalize">
      <Icon className={cn("size-3", config.className)} />
      {status}
    </Badge>
  )
}

function DragHandle({ id }: { id: number }) {
  const { attributes, listeners } = useSortable({ id })
  return (
    <Button
      {...attributes}
      {...listeners}
      variant="ghost"
      size="icon"
      className="size-7 text-muted-foreground hover:bg-transparent"
    >
      <GripVerticalIcon className="size-3 text-muted-foreground" />
      <span className="sr-only">Drag to reorder</span>
    </Button>
  )
}

function DraggableRow({ row }: { row: Row<Asset> }) {
  const { transform, transition, setNodeRef, isDragging } = useSortable({
    id: row.original.id,
  })
  return (
    <TableRow
      data-state={row.getIsSelected() && "selected"}
      data-dragging={isDragging}
      ref={setNodeRef}
      className="relative z-0 data-[dragging=true]:z-10 data-[dragging=true]:opacity-80"
      style={{ transform: CSS.Transform.toString(transform), transition }}
    >
      {row.getVisibleCells().map((cell) => (
        <TableCell key={cell.id}>
          {flexRender(cell.column.columnDef.cell, cell.getContext())}
        </TableCell>
      ))}
    </TableRow>
  )
}

function AssetDrawer({ asset }: { asset: Asset }) {
  const isMobile = useIsMobile()
  return (
    <Drawer direction={isMobile ? "bottom" : "right"}>
      <DrawerTrigger asChild>
        <Button variant="link" className="w-fit px-0 text-left text-foreground">
          {asset.name}
        </Button>
      </DrawerTrigger>
      <DrawerContent>
        <DrawerHeader className="gap-1">
          <DrawerTitle>{asset.name}</DrawerTitle>
        </DrawerHeader>
        <div className="flex flex-col gap-4 px-4 text-sm">
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
        </div>
        <DrawerFooter>
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
    id: "drag",
    header: () => null,
    cell: ({ row }) => <DragHandle id={row.original.id} />,
  },
  {
    id: "select",
    header: ({ table }) => (
      <div className="flex items-center justify-center">
        <Checkbox
          checked={table.getIsAllPageRowsSelected() || (table.getIsSomePageRowsSelected() && "indeterminate")}
          onCheckedChange={(value) => table.toggleAllPageRowsSelected(!!value)}
          aria-label="Select all"
        />
      </div>
    ),
    cell: ({ row }) => (
      <div className="flex items-center justify-center">
        <Checkbox
          checked={row.getIsSelected()}
          onCheckedChange={(value) => row.toggleSelected(!!value)}
          aria-label="Select row"
        />
      </div>
    ),
    enableSorting: false,
    enableHiding: false,
  },
  {
    accessorKey: "name",
    header: "Name",
    cell: ({ row }) => <AssetDrawer asset={row.original} />,
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
  {
    id: "actions",
    cell: ({ row }) => (
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button
            variant="ghost"
            className="flex size-8 text-muted-foreground data-[state=open]:bg-muted"
            size="icon"
          >
            <EllipsisVerticalIcon />
            <span className="sr-only">Open menu</span>
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end" className="w-32">
          <DropdownMenuItem onSelect={() => { }}>View details</DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>
    ),
  },
]

function AssetTable({ data, draggable = false, onDragEnd }: {
  data: Asset[]
  draggable?: boolean
  onDragEnd?: (event: DragEndEvent) => void
}) {
  const [rowSelection, setRowSelection] = React.useState({})
  const [columnVisibility, setColumnVisibility] = React.useState<VisibilityState>({})
  const [columnFilters, setColumnFilters] = React.useState<ColumnFiltersState>([])
  const [sorting, setSorting] = React.useState<SortingState>([])
  const [pagination, setPagination] = React.useState({ pageIndex: 0, pageSize: 10 })
  const sortableId = React.useId()
  const sensors = useSensors(
    useSensor(MouseSensor, {}),
    useSensor(TouchSensor, {}),
    useSensor(KeyboardSensor, {})
  )

  const dataIds = React.useMemo<UniqueIdentifier[]>(
    () => data.map(({ id }) => id),
    [data]
  )

  const table = useReactTable({
    data,
    columns,
    state: { sorting, columnVisibility, rowSelection, columnFilters, pagination },
    getRowId: (row) => row.id.toString(),
    enableRowSelection: true,
    onRowSelectionChange: setRowSelection,
    onSortingChange: setSorting,
    onColumnFiltersChange: setColumnFilters,
    onColumnVisibilityChange: setColumnVisibility,
    onPaginationChange: setPagination,
    getCoreRowModel: getCoreRowModel(),
    getFilteredRowModel: getFilteredRowModel(),
    getPaginationRowModel: getPaginationRowModel(),
    getSortedRowModel: getSortedRowModel(),
  })

  const tableBody = draggable ? (
    <SortableContext items={dataIds} strategy={verticalListSortingStrategy}>
      {table.getRowModel().rows.map((row) => (
        <DraggableRow key={row.id} row={row} />
      ))}
    </SortableContext>
  ) : (
    table.getRowModel().rows.map((row) => (
      <TableRow key={row.id} data-state={row.getIsSelected() && "selected"}>
        {row.getVisibleCells().map((cell) => (
          <TableCell key={cell.id}>
            {flexRender(cell.column.columnDef.cell, cell.getContext())}
          </TableCell>
        ))}
      </TableRow>
    ))
  )

  return (
    <div className="flex flex-col gap-4">
      <div className="overflow-hidden rounded-lg border">
        <DndContext
          collisionDetection={closestCenter}
          modifiers={[restrictToVerticalAxis]}
          onDragEnd={onDragEnd ?? (() => { })}
          sensors={sensors}
          id={sortableId}
        >
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
            <TableBody className="**:data-[slot=table-cell]:first:w-8">
              {table.getRowModel().rows?.length ? tableBody : (
                <TableRow>
                  <TableCell colSpan={columns.length} className="h-24 text-center">
                    No results.
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </DndContext>
      </div>
      <div className="flex items-center justify-between px-4">
        <div className="hidden flex-1 text-sm text-muted-foreground lg:flex">
          {table.getFilteredSelectedRowModel().rows.length} of{" "}
          {table.getFilteredRowModel().rows.length} row(s) selected.
        </div>
        <div className="flex w-full items-center gap-8 lg:w-fit">
          <div className="hidden items-center gap-2 lg:flex">
            <Label htmlFor="rows-per-page" className="text-sm font-medium">Rows per page</Label>
            <Select
              value={`${table.getState().pagination.pageSize}`}
              onValueChange={(value) => table.setPageSize(Number(value))}
            >
              <SelectTrigger size="sm" className="w-20" id="rows-per-page">
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
          <div className="ml-auto flex items-center gap-2 lg:ml-0">
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
  )
}

export function DataTable() {
  const { facilityId } = useFacility()

  const { data: fetchedData } = useQuery<Asset[]>({
    queryKey: ["assets", facilityId],
    queryFn: () => fetch(`/api/assets${facilityId ? `?facilityId=${facilityId}` : ""}`).then(r => r.json()),
  })

  const [data, setData] = React.useState<Asset[]>([])

  React.useEffect(() => {
    if (fetchedData) setData(fetchedData)
  }, [fetchedData])
  
  const onlineData = data.filter(a => a.status === "online")
  const alertData = data.filter(a => ["warning", "error"].includes(a.status))

  const dataIds = React.useMemo<UniqueIdentifier[]>(() => data.map(({ id }) => id), [data])

  function handleDragEnd(event: DragEndEvent) {
    const { active, over } = event
    if (active && over && active.id !== over.id) {
      setData((data) => {
        const oldIndex = dataIds.indexOf(active.id)
        const newIndex = dataIds.indexOf(over.id)
        return arrayMove(data, oldIndex, newIndex)
      })
    }
  }

  return (
    <Tabs defaultValue="all" className="w-full flex-col justify-start gap-6">
      <div className="flex items-center px-4 lg:px-6">
        <TabsList>
          <TabsTrigger value="all">All Assets <Badge variant="secondary">{data.length}</Badge></TabsTrigger>
          <TabsTrigger value="online">Online <Badge variant="secondary">{onlineData.length}</Badge></TabsTrigger>
          <TabsTrigger value="alerts">Alerts <Badge variant="secondary">{alertData.length}</Badge></TabsTrigger>
        </TabsList>
      </div>
      <TabsContent value="all" className="relative flex flex-col gap-4 overflow-auto px-4 lg:px-6">
        <AssetTable data={data} draggable onDragEnd={handleDragEnd} />
      </TabsContent>
      <TabsContent value="online" className="relative flex flex-col gap-4 overflow-auto px-4 lg:px-6">
        <AssetTable data={onlineData} />
      </TabsContent>
      <TabsContent value="alerts" className="relative flex flex-col gap-4 overflow-auto px-4 lg:px-6">
        <AssetTable data={alertData} />
      </TabsContent>
    </Tabs>
  )
}
