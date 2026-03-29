"use client"

import { useQuery } from "@tanstack/react-query"
import { BellIcon } from "lucide-react"
import { useFacility } from "@/components/providers/facility-provider"
import { useIsMobile } from "@/hooks/use-mobile"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import {
  Drawer,
  DrawerClose,
  DrawerContent,
  DrawerFooter,
  DrawerHeader,
  DrawerTitle,
  DrawerTrigger,
} from "@/components/ui/drawer"
import { Separator } from "@/components/ui/separator"
import { cn } from "@/lib/utils"

type Asset = {
  id: number
  name: string
  type: string
  status: string
  facilityName: string
  facilityLocation: string | null
  description: string | null
}

function StatusBadge({ status }: { status: string }) {
  const styles: Record<string, string> = {
    online:  "border-transparent bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400",
    warning: "border-transparent bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-400",
    error:   "border-transparent bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-400",
    offline: "border-transparent bg-gray-100 text-gray-600 dark:bg-gray-800 dark:text-gray-400",
  }
  return (
    <Badge className={cn("capitalize", styles[status] ?? styles.offline)}>
      {status}
    </Badge>
  )
}

function toLabel(name: string) {
  return name.charAt(0).toUpperCase() + name.slice(1).replace("_", " ")
}

export function NotificationsSheet() {
  const { facilityId } = useFacility()
  const isMobile = useIsMobile()

  const { data: assets = [] } = useQuery<Asset[]>({
    queryKey: ["assets", facilityId],
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
              <Badge className="border-transparent bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-400">
                {count} active
              </Badge>
            )}
          </DrawerTitle>
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
