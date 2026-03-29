import { db } from "@/server/db";
import { assets, sensorReadings } from "@/server/db/schema";
import { maybeTickSimulation } from "@/server/simulation";
import { and, eq, gte, inArray, sql } from "drizzle-orm";
import { NextResponse } from "next/server";

function bucketExpr(hours: number) { // helper to determine appropriate bucketing interval based on time range.
    if (hours <= 0.25) return sql`date_bin('1 minute', ${sensorReadings.timestamp}, TIMESTAMPTZ '2000-01-01')`; // 15 points
    if (hours <= 1) return sql`date_bin('5 minutes', ${sensorReadings.timestamp}, TIMESTAMPTZ '2000-01-01')`; // 12 points
    if (hours <= 6) return sql`date_bin('15 minutes', ${sensorReadings.timestamp}, TIMESTAMPTZ '2000-01-01')`; // 24 points
    return sql`date_trunc('hour', ${sensorReadings.timestamp})`; // 24 points
}

// /api/sensor-readings?hours=&facilityId=&assetId=
export async function GET(req: Request) {
  const { searchParams } = new URL(req.url);
  const hours      = parseFloat(searchParams.get("hours") ?? "1");
  const facilityId = searchParams.get("facilityId") ?? undefined;
  const assetId    = searchParams.get("assetId")    ?? undefined;
  const startTime  = new Date(Date.now() - hours * 60 * 60 * 1000);

  await maybeTickSimulation();

  const bucket = bucketExpr(hours);

  let assetIds: number[] = [];
  if (facilityId) {
    const rows = await db.select({ id: assets.id }).from(assets)
      .where(eq(assets.facilityId, parseInt(facilityId)));
    assetIds = rows.map(r => r.id);
  }

  const rows = await db
    .select({
      bucket:     bucket,
      assetId:    assets.id,
      assetName:  assets.name,
      metricName: sensorReadings.metricName,
      unit:       sensorReadings.unit,
      avg:        sql<number>`ROUND(AVG(${sensorReadings.value})::numeric, 2)`,
      min:        sql<number>`ROUND(MIN(${sensorReadings.value})::numeric, 2)`,
      max:        sql<number>`ROUND(MAX(${sensorReadings.value})::numeric, 2)`,
    })
    .from(sensorReadings)
    .innerJoin(assets, eq(sensorReadings.assetId, assets.id))
    .where(and(
      gte(sensorReadings.timestamp, startTime),
      facilityId ? inArray(sensorReadings.assetId, assetIds) : undefined,
      assetId    ? eq(sensorReadings.assetId, parseInt(assetId)) : undefined,
    ))
    .groupBy(bucket, assets.id, assets.name, sensorReadings.metricName, sensorReadings.unit)
    .orderBy(bucket);

  return NextResponse.json(rows);
}
