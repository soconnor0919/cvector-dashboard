import { db } from "./db";
import { assets, sensorReadings } from "./db/schema";
import { desc } from "drizzle-orm";
import { METRICS } from "./db/metrics";

const TICK_MS = 30_000;
const MAX_BACKFILL_MS = 24 * 60 * 60 * 1000;
const BATCH_SIZE = 1000;

export async function maybeTickSimulation() {
  const allAssets = await db.select().from(assets);
  if (allAssets.length === 0) return;

  const [last] = await db
    .select({ timestamp: sensorReadings.timestamp })
    .from(sensorReadings)
    .orderBy(desc(sensorReadings.timestamp))
    .limit(1);

  const now = Date.now();
  const lastMs = last ? last.timestamp.getTime() : now - MAX_BACKFILL_MS;

  if (now - lastMs <= TICK_MS) return; // fresh, skip

  // backfill from last reading up to now, capped at 24h
  const startMs = Math.max(lastMs + TICK_MS, now - MAX_BACKFILL_MS);
  const ticks: Date[] = [];
  for (let t = startMs; t <= now; t += TICK_MS) {
    ticks.push(new Date(t));
  }

  const readings = ticks.flatMap((timestamp) =>
    allAssets.map((asset) => {
      const metric = METRICS[asset.id % METRICS.length]!;
      const variation = (Math.random() - 0.5) * 2 * metric.variance;
      return {
        assetId: asset.id,
        metricName: metric.name,
        value: Math.round(Math.max(0, metric.base + variation) * 100) / 100,
        unit: metric.unit,
        timestamp,
      };
    })
  );

  for (let i = 0; i < readings.length; i += BATCH_SIZE) {
    await db.insert(sensorReadings).values(readings.slice(i, i + BATCH_SIZE));
  }
}
