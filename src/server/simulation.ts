import { db } from "./db";
import { assets, facilities, sensorReadings } from "./db/schema";
import { gte } from "drizzle-orm";
import { METRICS } from "./db/metrics";

export async function maybeTickSimulation() {
  // 1. Check: any reading in the last 30 seconds?
  const thirtySecondsAgo = new Date(Date.now() - 30_000);
  const recent = await db
    .select({ id: sensorReadings.id })
    .from(sensorReadings)
    .where(gte(sensorReadings.timestamp, thirtySecondsAgo))
    .limit(1);
  if (recent.length > 0) return; // fresh data exists, skip

  // 2. If not, insert one new reading per asset
  const allAssets = await db.select().from(assets);
  const now = new Date();
  const readings = allAssets.map((asset) => {
    const metric = METRICS[asset.id % METRICS.length]!;
    const variation = (Math.random() - 0.5) * 2 * metric.variance;
    const value = Math.max(0, metric.base + variation);
    return {
      assetId: asset.id,
      metricName: metric.name,
      value: Math.round(value * 100) / 100,
      unit: metric.unit,
      timestamp: now,
    };
  });
  
  await db.insert(sensorReadings).values(readings);
}