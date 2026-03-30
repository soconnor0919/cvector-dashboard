import { Badge } from "@/components/ui/badge"
import { cn } from "@/lib/utils"

export const statusClasses: Record<string, string> = {
  online:  "border-transparent bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400",
  warning: "border-transparent bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-400",
  error:   "border-transparent bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-400",
  offline: "border-transparent bg-gray-100 text-gray-600 dark:bg-gray-800 dark:text-gray-400",
}

export function StatusBadge({ status }: { status: string }) {
  return (
    <Badge className={cn("capitalize", statusClasses[status] ?? statusClasses.offline)}>
      {status}
    </Badge>
  )
}
