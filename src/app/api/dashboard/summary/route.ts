import { db } from "@/server/db";
import { assets, sensorReadings } from "@/server/db/schema";
import { maybeTickSimulation } from "@/server/simulation";
import { and, avg, count, eq, gte, max } from "drizzle-orm";
import { NextResponse } from "next/server";

// /api/dashboard/summary?facilityId=???
export async function GET(
    req: Request,
) {
    const { searchParams } = new URL(req.url);
    const facilityId = searchParams.get("facilityId") ?? undefined;
    const twoHoursAgo = new Date(Date.now() - 2 * 60 * 60 * 1000); // 2 hours ago

    await maybeTickSimulation(); // ensure simulation is up to date before querying for metrics

    const [metrics, assetStatuses, assetTypes, totalResult] = await Promise.all([
        // metric averages from the last 2 hours
        db.select({
            metricName: sensorReadings.metricName,
            avgValue: avg(sensorReadings.value),
            latestValue: max(sensorReadings.value),
            unit: sensorReadings.unit,
        }).from(sensorReadings)
            .innerJoin(assets, eq(sensorReadings.assetId, assets.id))
            .where(and(
                gte(sensorReadings.timestamp, twoHoursAgo),
                (facilityId ? eq(assets.facilityId, parseInt(facilityId)) : undefined)
            ))
            .groupBy(sensorReadings.metricName, sensorReadings.unit),
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