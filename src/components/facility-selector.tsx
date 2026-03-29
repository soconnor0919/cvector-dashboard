"use client"

import { useQuery } from "@tanstack/react-query"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { useFacility } from "@/components/providers/facility-provider"

type Facility = {
  id: number
  name: string
}

export function FacilitySelector() {
  const { facilityId, setFacilityId } = useFacility()

  const { data: facilities = [] } = useQuery<Facility[]>({
    queryKey: ["facilities"],
    queryFn: () => fetch("/api/facilities").then((r) => r.json()),
    staleTime: Infinity,
  })

  return (
    <Select
      value={facilityId ?? "all"}
      onValueChange={(val) => setFacilityId(val === "all" ? null : val)}
    >
      <SelectTrigger className="w-44">
        <SelectValue placeholder="All facilities" />
      </SelectTrigger>
      <SelectContent>
        <SelectItem value="all">All facilities</SelectItem>
        {facilities.map((f) => (
          <SelectItem key={f.id} value={String(f.id)}>
            {f.name}
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  )
}
