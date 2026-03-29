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

// /api/sensor-readings?metric=&hours=&facilityId=&assetId=
export async function GET(
    req: Request,
) {
    const { searchParams } = new URL(req.url);
    const metric = searchParams.get("metric");
    if (!metric) return NextResponse.json({ error: "metric is required" }, { status: 400 }); // metric is required
    const hours = parseFloat(searchParams.get("hours") ?? "1");
    const facilityId = searchParams.get("facilityId") ?? undefined;
    const assetId = searchParams.get("assetId") ?? undefined;
    const twoHoursAgo = new Date(Date.now() - 2 * 60 * 60 * 1000); // 2 hours ago
    const startTime = new Date(Date.now() - hours * 60 * 60 * 1000); // calculate start time based on hours parameter

    await maybeTickSimulation(); // ensure simulation is up to date before querying for metrics

    const bucket = bucketExpr(hours); // determine bucketing expression based on hours parameter

    // resolve facilityId to assetIds if provided, to allow filtering by facility or asset
    let assetIds: number[] = [];
    if (facilityId) {
        const rows = await db.select({ id: assets.id }).from(assets)
            .where(eq(assets.facilityId, parseInt(facilityId)));
        assetIds = rows.map(r => r.id);
    }

    const rows = await db
        .select({
            timestamp: bucket,
            value: sql<number>`ROUND(AVG(${sensorReadings.value})::numeric, 2)`,
        })
        .from(sensorReadings)
        .where(and(
            eq(sensorReadings.metricName, metric),
            // gte(sensorReadings.timestamp, twoHoursAgo),
            gte(sensorReadings.timestamp, startTime),
            facilityId ? inArray(sensorReadings.assetId, assetIds) : undefined, // optional
            assetId ? eq(sensorReadings.assetId, parseInt(assetId)) : undefined, // optional
        ))
        .groupBy(bucket)
        .orderBy(bucket);

    return NextResponse.json(rows);
}