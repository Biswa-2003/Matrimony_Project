import { NextResponse } from "next/server";
import { getAuthUser } from "@/lib/auth";
import { query } from "@/lib/db";

export async function POST() {
  const me = await getAuthUser();
  if (!me) return NextResponse.json({ ok: false }, { status: 401 });
  await query(`UPDATE users SET last_seen = now() WHERE id = $1`, [me.id]);
  return NextResponse.json({ ok: true });
}
