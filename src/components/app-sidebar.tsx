"use client"

import * as React from "react"
import { useQuery } from "@tanstack/react-query"
import { ActivityIcon } from "lucide-react"
import { useFacility } from "@/components/providers/facility-provider"
import { queryKeys } from "@/lib/query-keys"
import { StatusBadge, statusClasses } from "@/components/status-badge"
import { cn, toLabel } from "@/lib/utils"
import { type Asset } from "@/types"
import { NavUser } from "@/components/nav-user"
import { Separator } from "@/components/ui/separator"
import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarHeader,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarSeparator,
} from "@/components/ui/sidebar"

const user = {
  name: "Operator",
  email: "operator@example.com",
  avatar: "",
}

function useDashboardData() {
  const { facilityId } = useFacility()
  const qs = facilityId ? `?facilityId=${facilityId}` : ""

  const { data: summary } = useQuery({
    queryKey: queryKeys.summary(facilityId),
    queryFn: () => fetch(`/api/dashboard/summary${qs}`).then(r => r.json()),
  })

  const { data: assets = [] } = useQuery<Asset[]>({
    queryKey: queryKeys.assets(facilityId),
    queryFn: () => fetch(`/api/assets${qs}`).then(r => r.json()).then(d => Array.isArray(d) ? d : []),
  })

  const total  = Number(summary?.totalResult?.count ?? 0)
  const online = Number(summary?.assetStatuses?.find((s: { status: string }) => s.status === "online")?.count ?? 0)
  const alerts = summary?.assetStatuses
    ?.filter((s: { status: string }) => ["warning", "error"].includes(s.status))
    .reduce((sum: number, s: { count: number }) => sum + Number(s.count), 0) ?? 0

  const issues: Asset[] = assets
    .filter(a => a.status === "error" || a.status === "warning")
    .sort((a, b) => {
      if (a.status === b.status) return a.name.localeCompare(b.name)
      return a.status === "error" ? -1 : 1
    })

  return { total, online, alerts, issues }
}

function LiveStatus() {
  const { total, online, alerts } = useDashboardData()

  return (
    <div className="px-3 py-2">
      <p className="mb-2 px-2 text-xs font-medium uppercase tracking-wide text-muted-foreground">Live Status</p>
      <div className="flex flex-col gap-1">
        {[
          { label: "Total assets", value: total, cls: "" },
          { label: "Online",       value: online, cls: cn(statusClasses.online,  "rounded px-1.5 py-0.5 text-xs border") },
          { label: "Alerts",       value: alerts, cls: alerts > 0 ? cn(statusClasses.error, "rounded px-1.5 py-0.5 text-xs border") : "" },
        ].map(({ label, value, cls }) => (
          <div key={label} className="flex items-center justify-between rounded-md px-2 py-1.5 text-sm">
            <span className="text-muted-foreground">{label}</span>
            <span className={cn("font-medium tabular-nums", cls)}>{value}</span>
          </div>
        ))}
      </div>
    </div>
  )
}

function ActiveIssues() {
  const { issues } = useDashboardData()

  return (
    <div className="px-3 py-2">
      <p className="mb-2 px-2 text-xs font-medium uppercase tracking-wide text-muted-foreground">Active Issues</p>
      {issues.length === 0 ? (
        <p className="px-2 text-sm text-muted-foreground">All clear</p>
      ) : (
        <div className="flex flex-col gap-3">
          {issues.map((asset, i) => (
            <div key={asset.id} className="flex flex-col gap-2">
              {i > 0 && <Separator />}
              <div className="flex flex-col gap-1 px-2">
                <div className="flex items-center justify-between gap-2">
                  <span className="truncate text-sm font-medium">{asset.name}</span>
                  <StatusBadge status={asset.status} />
                </div>
                <span className="text-xs text-muted-foreground">
                  {asset.facilityName} · {toLabel(asset.type)}
                </span>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}

export function AppSidebar({ ...props }: React.ComponentProps<typeof Sidebar>) {
  return (
    <Sidebar collapsible="offcanvas" {...props}>
      <SidebarHeader>
        <SidebarMenu>
          <SidebarMenuItem>
            <SidebarMenuButton asChild className="data-[slot=sidebar-menu-button]:p-1.5!">
              <a href="#">
                <ActivityIcon className="size-5!" />
                <span className="text-base font-semibold">Monitor</span>
              </a>
            </SidebarMenuButton>
          </SidebarMenuItem>
        </SidebarMenu>
        <LiveStatus />
      </SidebarHeader>
      <SidebarSeparator />
      <SidebarContent>
        <ActiveIssues />
      </SidebarContent>
      <SidebarFooter>
        <NavUser user={user} />
      </SidebarFooter>
    </Sidebar>
  )
}
