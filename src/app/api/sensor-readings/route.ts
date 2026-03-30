import { db } from "@/server/db";
import { assets, sensorReadings } from "@/server/db/schema";
import { kickSimulation } from "@/server/simulation";
import { and, eq, gte, sql } from "drizzle-orm";
import { NextResponse } from "next/server";

/**
 * Helper to determine appropriate time-bucketing interval based on the requested range.
 * This prevents over-plotting (thousands of points) and improves DB performance.
 */
function bucketExpr(hours: number) {
    if (hours <= 0.25) return sql`date_bin('1 minute', ${sensorReadings.timestamp}, TIMESTAMPTZ '2000-01-01')`; // High resolution for 15m
    if (hours <= 1) return sql`date_bin('5 minutes', ${sensorReadings.timestamp}, TIMESTAMPTZ '2000-01-01')`; 
    if (hours <= 6) return sql`date_bin('15 minutes', ${sensorReadings.timestamp}, TIMESTAMPTZ '2000-01-01')`; 
    return sql`date_trunc('hour', ${sensorReadings.timestamp})`; // Low resolution for 24h+
}

/**
 * GET /api/sensor-readings
 * Returns time-bucketed sensor data for charts.
 * Query params: ?hours=24&facilityId=1&assetId=2
 */
export async function GET(req: Request) {
  const { searchParams } = new URL(req.url);
  const hours      = parseFloat(searchParams.get("hours") ?? "1");
  const facilityId = searchParams.get("facilityId") ?? undefined;
  const assetId    = searchParams.get("assetId")    ?? undefined;
  const startTime  = new Date(Date.now() - hours * 60 * 60 * 1000);

  // Lazy simulation check
  kickSimulation();

  const bucket = bucketExpr(hours);

  const rows = await db
    .select({
      bucket:     bucket,
      assetId:    assets.id,
      assetName:  assets.name,
      metricName: sensorReadings.metricName,
      unit:       sensorReadings.unit,
      // We aggregate by bucket so the chart stays smooth even with many assets
      avg:        sql<number>`ROUND(AVG(${sensorReadings.value})::numeric, 2)`,
      min:        sql<number>`ROUND(MIN(${sensorReadings.value})::numeric, 2)`,
      max:        sql<number>`ROUND(MAX(${sensorReadings.value})::numeric, 2)`,
    })
    .from(sensorReadings)
    .innerJoin(assets, eq(sensorReadings.assetId, assets.id))
    .where(and(
      gte(sensorReadings.timestamp, startTime),
      facilityId ? eq(assets.facilityId, parseInt(facilityId)) : undefined,
      assetId    ? eq(sensorReadings.assetId, parseInt(assetId)) : undefined,
    ))
    .groupBy(bucket, assets.id, assets.name, sensorReadings.metricName, sensorReadings.unit)
    .orderBy(bucket);

  return NextResponse.json(rows);
}
