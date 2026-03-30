export const queryKeys = {
  summary:        (facilityId: string | null) => ["summary", facilityId],
  assets:         (facilityId: string | null) => ["assets", facilityId],
  facilities:     ()                          => ["facilities"],
  sensorReadings: (hours: string, facilityId: string | null) => ["sensor-readings", hours, facilityId],
}
