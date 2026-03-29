import { relations } from "drizzle-orm";
import { index, pgTable, text, timestamp, integer, real, varchar } from "drizzle-orm/pg-core";

// Facilities
export const facilities = pgTable("facility", (d) => ({
  id:          d.integer().primaryKey().generatedByDefaultAsIdentity(),
  name:        d.varchar({ length: 256 }).notNull(),
  location:    d.varchar({ length: 512 }),
  description: d.text(),
  createdAt:   d.timestamp().$defaultFn(() => new Date()).notNull(),
  updatedAt:   d.timestamp().$onUpdate(() => new Date()),
}), (t) => [
  index("facility_name_idx").on(t.name),
]);

// Assets
export const assets = pgTable("asset", (d) => ({
  id:          d.integer().primaryKey().generatedByDefaultAsIdentity(),
  facilityId:  d.integer().references(() => facilities.id, { onDelete: "cascade" }).notNull(), // cascade delete assets when facility is deleted
  name:        d.varchar({ length: 256 }).notNull(),
  type:        d.varchar({ length: 100 }).notNull(),    // pump, motor, conveyor, boiler, turbine, sensor
  status:      d.varchar({ length: 50 }).notNull().default("online"),  // online, offline, warning, error
  description: d.text(),
  createdAt:   d.timestamp().$defaultFn(() => new Date()).notNull(),
  updatedAt:   d.timestamp().$onUpdate(() => new Date()),
}), (t) => [
  index("asset_facility_idx").on(t.facilityId),
  index("asset_name_idx").on(t.name),
  index("asset_type_idx").on(t.type),
  index("asset_status_idx").on(t.status),
]);

// Sensor Readings
export const sensorReadings = pgTable("sensor_reading", (d) => ({
  id:         d.integer().primaryKey().generatedByDefaultAsIdentity(),
  assetId:    d.integer().references(() => assets.id, { onDelete: "cascade" }).notNull(),
  // metricName standardized such that it can be extended from UI without needing to update the schema
  metricName: d.varchar({ length: 100 }).notNull(),  // temperature, pressure, power, output, flow_rate, humidity
  value:      d.real().notNull(),
  unit:       d.varchar({ length: 50 }).notNull(),    // °C, PSI, kW, units/hr, L/min, %
  timestamp:  d.timestamp({ withTimezone: true }).notNull(),
}), (t) => [
  index("reading_asset_idx").on(t.assetId),
  index("reading_timestamp_idx").on(t.timestamp),
  index("reading_metric_idx").on(t.metricName),
  index("reading_asset_timestamp_idx").on(t.assetId, t.timestamp),
  index("reading_asset_metric_idx").on(t.assetId, t.metricName),
]);

// Relations
export const facilitiesRelations = relations(facilities, ({ many }) => ({
  assets: many(assets),
}));

export const assetsRelations = relations(assets, ({ one, many }) => ({
  facility: one(facilities, { fields: [assets.facilityId], references: [facilities.id] }),
  sensorReadings: many(sensorReadings),
}));

export const sensorReadingsRelations = relations(sensorReadings, ({ one }) => ({
  asset: one(assets, { fields: [sensorReadings.assetId], references: [assets.id] }),
}));