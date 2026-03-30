export type Asset = {
  id: number
  name: string
  type: string
  status: string
  description: string | null
  facilityId: number
  facilityName: string
  facilityLocation: string | null
}

export type Facility = {
  id: number
  name: string
}
