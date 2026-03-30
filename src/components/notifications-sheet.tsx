"use client"

import { useQuery } from "@tanstack/react-query"
import { BellIcon } from "lucide-react"
import { useFacility } from "@/components/providers/facility-provider"
import { useIsMobile } from "@/hooks/use-mobile"
import { queryKeys } from "@/lib/query-keys"
import { toLabel } from "@/lib/utils"
import { type Asset } from "@/types"
import { StatusBadge, statusClasses } from "@/components/status-badge"
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
import { Separator } from "@/components/ui/separator"
import { cn } from "@/lib/utils"

export function NotificationsSheet() {
  const { facilityId } = useFacility()
  const isMobile = useIsMobile()

  const { data: assets = [] } = useQuery<Asset[]>({
    queryKey: queryKeys.assets(facilityId),
    queryFn: () =>
      fetch(`/api/assets${facilityId ? `?facilityId=${facilityId}` : ""}`)
        .then(r => r.json())
        .then(d => Array.isArray(d) ? d : []),
  })

  const issues = assets
    .filter(a => a.status === "error" || a.status === "warning")
    .sort((a, b) => {
      if (a.status === b.status) return a.name.localeCompare(b.name)
      return a.status === "error" ? -1 : 1
    })

  const count = issues.length

  return (
    <Drawer direction={isMobile ? "bottom" : "right"}>
      <DrawerTrigger asChild>
        <Button variant="ghost" size="icon" className="relative" aria-label="Open issues panel">
          <BellIcon className="size-4" aria-hidden="true" />
          {count > 0 && (
            <span className="absolute -top-0.5 -right-0.5 flex size-4 items-center justify-center rounded-full bg-red-500 text-[10px] font-medium text-white" aria-hidden="true">
              {count > 9 ? "9+" : count}
            </span>
          )}
        </Button>
      </DrawerTrigger>
      <DrawerContent>
        <DrawerHeader className="gap-1">
          <DrawerTitle className="flex items-center justify-between">
            <span>Issues</span>
            {count > 0 && (
              <Badge className={statusClasses.error}>
                {count} active
              </Badge>
            )}
          </DrawerTitle>
          <DrawerDescription className="sr-only">Assets currently in error or warning state</DrawerDescription>
        </DrawerHeader>

        {count === 0 ? (
          <div className="flex flex-1 items-center justify-center px-4 py-12 text-sm text-muted-foreground">
            No active issues
          </div>
        ) : (
          <div className="flex flex-col gap-4 overflow-y-auto px-4 text-sm">
            {issues.map((asset, i) => (
              <div key={asset.id} className="flex flex-col gap-4">
                {i > 0 && <Separator />}
                <div className="grid grid-cols-2 gap-4">
                  <div className="flex flex-col gap-1">
                    <span className="text-muted-foreground">Asset</span>
                    <span className="font-medium">{asset.name}</span>
                  </div>
                  <div className="flex flex-col gap-1">
                    <span className="text-muted-foreground">Status</span>
                    <StatusBadge status={asset.status} />
                  </div>
                  <div className="flex flex-col gap-1">
                    <span className="text-muted-foreground">Type</span>
                    <span className="capitalize font-medium">{toLabel(asset.type)}</span>
                  </div>
                  <div className="flex flex-col gap-1">
                    <span className="text-muted-foreground">Facility</span>
                    <span className="font-medium">{asset.facilityName}</span>
                  </div>
                </div>
                {asset.description && (
                  <div className="flex flex-col gap-1">
                    <span className="text-muted-foreground">Description</span>
                    <span>{asset.description}</span>
                  </div>
                )}
              </div>
            ))}
          </div>
        )}

        <DrawerFooter>
          <DrawerClose asChild>
            <Button variant="outline">Close</Button>
          </DrawerClose>
        </DrawerFooter>
      </DrawerContent>
    </Drawer>
  )
}
