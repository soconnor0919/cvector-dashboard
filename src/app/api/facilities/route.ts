import { NextResponse } from "next/server";
import { db } from "@/server/db";
import { facilities } from "@/server/db/schema";

export async function GET() {
    const rows = await db.select().from(facilities);
    return NextResponse.json(rows);
}