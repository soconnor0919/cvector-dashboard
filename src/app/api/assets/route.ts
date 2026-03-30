import { NextResponse } from "next/server";
import { db } from "@/server/db";
import { assets, facilities } from "@/server/db/schema";
import { eq } from "drizzle-orm";

// /api/assets?facilityId=???
export async function GET(
    req: Request,
) {
    const { searchParams } = new URL(req.url);
    const facilityId = searchParams.get("facilityId") ?? undefined;
    const rows = await db
        .select({
            id: assets.id,
            name: assets.name,
            type: assets.type,
            status: assets.status,
            description: assets.description,
            facilityId: assets.facilityId,
            facilityName: facilities.name,       // from the join
            facilityLocation: facilities.location, // from the join
        })
        .from(assets)
        .innerJoin(facilities, eq(assets.facilityId, facilities.id))
        .where(facilityId ? eq(assets.facilityId, parseInt(facilityId)) : undefined); // if facilityId is provided, filter by it. if not, return all assets with their facility info
    return NextResponse.json(rows);
}