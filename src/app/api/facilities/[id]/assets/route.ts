import { NextResponse } from "next/server";
import { db } from "@/server/db";
import { assets } from "@/server/db/schema";
import { eq } from "drizzle-orm";

export async function GET(
    _req: Request,
    { params }: { params: Promise<{ id: string }> }, // next.js 15: params is now a promise. must be awaited
) {
    const { id } = await params;
    const rows = await db.select().from(assets)
        .where(eq(assets.facilityId, parseInt(id)));
    
    return NextResponse.json(rows);
}