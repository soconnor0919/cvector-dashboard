import { db } from "@/server/db";
import { assets, sensorReadings } from "@/server/db/schema";
import { kickSimulation } from "@/server/simulation";
import { avg, count, eq, sql, sum } from "drizzle-orm";
import { NextResponse } from "next/server";

// /api/dashboard/summary?facilityId=???
/**
 * GET /api/dashboard/summary
 * Returns a high-level summary of the current plant status.
 * Optional query param: ?facilityId=123
 * 
 * Logic:
 * 1. Kicks the lazy simulation to ensure fresh data.
 * 2. Uses a SQL window function (row_number) to identify the single latest reading for EVERY asset.
 * 3. Aggregates these latest readings by metric name to get "Total Power", "Total Output", etc.
 * 4. Counts assets by status and type for the dashboard charts and badges.
 */
export async function GET(
    req: Request,
) {
    const { searchParams } = new URL(req.url);
    const facilityId = searchParams.get("facilityId") ?? undefined;

    // Trigger simulation if data is stale (>30s)
    kickSimulation();

    // Subquery: Get the most recent reading for each asset.
    // We use row_number() partitioned by assetId to pick the top 1 reading per asset.
    const readingsWithRn = db.select({
        metricName: sensorReadings.metricName,
        value: sensorReadings.value,
        unit: sensorReadings.unit,
        rn: sql<number>`row_number() over (partition by ${sensorReadings.assetId} order by ${sensorReadings.timestamp} desc)`.as("rn")
    }).from(sensorReadings)
        .innerJoin(assets, eq(sensorReadings.assetId, assets.id))
        .where(facilityId ? eq(assets.facilityId, parseInt(facilityId)) : undefined)
        .as("readings_with_rn");

    // Filter to only the latest readings (rn = 1)
    const latestReadings = db.select({
        metricName: readingsWithRn.metricName,
        value: readingsWithRn.value,
        unit: readingsWithRn.unit,
    }).from(readingsWithRn)
        .where(eq(readingsWithRn.rn, 1))
        .as("latest_readings");

    // Execute multiple aggregation queries in parallel
    const [metrics, assetStatuses, assetTypes, totalResult] = await Promise.all([
        // Aggregated plant status: Sum of latest values (Total Power) and average (Mean Temp)
        db.select({
            metricName: latestReadings.metricName,
            totalValue: sum(latestReadings.value),
            avgValue: avg(latestReadings.value),
            unit: latestReadings.unit,
        }).from(latestReadings)
            .groupBy(latestReadings.metricName, latestReadings.unit),
        
        // Distribution of asset operational statuses (online, error, etc.)
        db.select({
            status: assets.status,
            count: count()
        })
            .from(assets)
            .groupBy(assets.status)
            .where(facilityId ? eq(assets.facilityId, parseInt(facilityId)) : undefined),
        
        // Count of assets by their functional type (pump, turbine, etc.)
        db.select({ type: assets.type, count: count() })
            .from(assets)
            .groupBy(assets.type)
            .where(facilityId ? eq(assets.facilityId, parseInt(facilityId)) : undefined),
        
        // Total count of assets in the current scope
        db.select({ count: count() })
            .from(assets)
            .where(facilityId ? eq(assets.facilityId, parseInt(facilityId)) : undefined),
    ]);

    return NextResponse.json({
        metrics:      metrics      ?? [],
        assetStatuses: assetStatuses ?? [],
        assetTypes:   assetTypes   ?? [],
        totalResult:  totalResult[0] ?? { count: 0 },
    });
}