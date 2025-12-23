// src/app/api/lookups/languages/route.js
import { NextResponse } from "next/server";
import { query } from "@/lib/db";

export const dynamic = "force-dynamic";

export async function GET() {
  const { rows } = await query("SELECT id, name FROM languages ORDER BY name");
  return NextResponse.json(rows);
}
