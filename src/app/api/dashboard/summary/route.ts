import { db } from "@/server/db";
import { assets, sensorReadings } from "@/server/db/schema";
import { kickSimulation } from "@/server/simulation";
import { and, avg, count, desc, eq, gte, sql, sum } from "drizzle-orm";
import { NextResponse } from "next/server";

// /api/dashboard/summary?facilityId=???
export async function GET(
    req: Request,
) {
    const { searchParams } = new URL(req.url);
    const facilityId = searchParams.get("facilityId") ?? undefined;

    kickSimulation();

    // 1. Get the latest reading for each asset using a window function
    const readingsWithRn = db.select({
        metricName: sensorReadings.metricName,
        value: sensorReadings.value,
        unit: sensorReadings.unit,
        rn: sql<number>`row_number() over (partition by ${sensorReadings.assetId} order by ${sensorReadings.timestamp} desc)`.as("rn")
    }).from(sensorReadings)
        .innerJoin(assets, eq(sensorReadings.assetId, assets.id))
        .where(facilityId ? eq(assets.facilityId, parseInt(facilityId)) : undefined)
        .as("readings_with_rn");

    const latestReadings = db.select({
        metricName: readingsWithRn.metricName,
        value: readingsWithRn.value,
        unit: readingsWithRn.unit,
    }).from(readingsWithRn)
        .where(eq(readingsWithRn.rn, 1))
        .as("latest_readings");

    const [metrics, assetStatuses, assetTypes, totalResult] = await Promise.all([
        // current plant status: latest values for each metric, aggregated
        db.select({
            metricName: latestReadings.metricName,
            totalValue: sum(latestReadings.value),
            avgValue: avg(latestReadings.value),
            unit: latestReadings.unit,
        }).from(latestReadings)
            .groupBy(latestReadings.metricName, latestReadings.unit),
        // 2. Asset counts by status
        db.select({
            status: assets.status,
            count: count()
        })
            .from(assets)
            .groupBy(assets.status)
            .where(facilityId ? eq(assets.facilityId, parseInt(facilityId)) : undefined),
        // 3. Asset counts by type
        db.select({ type: assets.type, count: count() })
            .from(assets)
            .groupBy(assets.type)
            .where(facilityId ? eq(assets.facilityId, parseInt(facilityId)) : undefined),
        // 4. Total asset count
        db.select({ count: count() })
            .from(assets)
            .where(facilityId ? eq(assets.facilityId, parseInt(facilityId)) : undefined),
    ]);
    // replace with empty response- will fire on fresh/empty db, and when no recent readings.
    return NextResponse.json({
        metrics:      metrics      ?? [],
        assetStatuses: assetStatuses ?? [],
        assetTypes:   assetTypes   ?? [],
        totalResult:  totalResult[0] ?? { count: 0 },
    });
}