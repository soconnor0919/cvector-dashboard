import { NextResponse } from "next/server";
import { db } from "@/server/db";
import { facilities } from "@/server/db/schema";
import { asc } from "drizzle-orm";

export async function GET() {
  const rows = await db
    .select({ id: facilities.id, name: facilities.name })
    .from(facilities)
    .orderBy(asc(facilities.name));

  return NextResponse.json(rows);
}