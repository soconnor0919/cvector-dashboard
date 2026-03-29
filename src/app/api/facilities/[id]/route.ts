import { NextResponse } from "next/server";
import { db } from "@/server/db";
import { facilities } from "@/server/db/schema";
import { eq } from "drizzle-orm";

export async function GET(
    _req: Request,
    { params }: { params: Promise<{ id: string }> }, // next.js 15: params is now a promise. must be awaited
) {
    const { id } = await params;
    const row = await db.select().from(facilities)
        .where(eq(facilities.id, parseInt(id)))
        .limit(1);
    if (!row[0]) {
        return NextResponse.json({ error: "Not found" }, { status: 404 });
    }
    return NextResponse.json(row[0]);
}