import { db } from "./db";
import { assets, sensorReadings } from "./db/schema";
import { gte } from "drizzle-orm";
import { ASSET_METRICS, METRICS, type MetricName } from "./db/metrics";

let running = false;
const SENSOR_METRICS: MetricName[] = ["temperature", "humidity", "pressure", "flow_rate"];

async function runSimulation() {
  const thirtySecondsAgo = new Date(Date.now() - 30_000);
  const recent = await db
    .select({ id: sensorReadings.id })
    .from(sensorReadings)
    .where(gte(sensorReadings.timestamp, thirtySecondsAgo))
    .limit(1);
  if (recent.length > 0) return;

  const allAssets = await db.select().from(assets);
  if (allAssets.length === 0) return;

  const now = new Date();
  const readings = allAssets.flatMap((asset) => {
    const metricNames: MetricName[] = ASSET_METRICS[asset.type] ?? [SENSOR_METRICS[asset.id % SENSOR_METRICS.length]!];
    const relevantMetrics = METRICS.filter(m => metricNames.includes(m.name));

    return relevantMetrics.map(metric => {
      const variation = (Math.random() - 0.5) * 2 * metric.variance;
      let value = Math.max(0, metric.base + variation);
      if (metric.name === "humidity") value = Math.min(100, value);

      return {
        assetId: asset.id,
        metricName: metric.name,
        value: Math.round(value * 100) / 100,
        unit: metric.unit,
        timestamp: now,
      };
    });
  });

  await db.insert(sensorReadings).values(readings);
}

export function kickSimulation() {
  if (running) return;
  running = true;
  runSimulation().catch(console.error).finally(() => { running = false; });
}
