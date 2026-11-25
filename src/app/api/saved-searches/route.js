import { NextResponse } from "next/server";
import { query } from "@/lib/db";
import { getUserIdFromCookie } from "@/lib/auth";
import { ensureSchema } from "@/lib/schema";

import { clientIp, limitOr429 } from "@/lib/rate-limit";
export const dynamic = "force-dynamic";
const MAX_SAVED = 10;

const unauthorized = () => NextResponse.json({ error: "Please log in." }, { status: 401 });

export async function GET() {
  const me = await getUserIdFromCookie();
  if (!me) return unauthorized();
  try {
    await ensureSchema();
    const { rows } = await query(
      `SELECT id, name, params, created_at FROM saved_searches WHERE user_id = $1 ORDER BY created_at DESC LIMIT ${MAX_SAVED}`,
      [me]
    );
    return NextResponse.json({ ok: true, results: rows });
  } catch (e) {
    console.error("[saved-searches] GET", e);
    return NextResponse.json({ error: "Could not load saved searches." }, { status: 500 });
  }
}

/** POST { name, params } */
export async function POST(req) {
  { const limited = limitOr429(`saved-search:${clientIp(req)}`, 30, 10 * 60 * 1000); if (limited) return limited; }
  const me = await getUserIdFromCookie();
  if (!me) return unauthorized();
  try {
    await ensureSchema();
    const { name, params } = await req.json().catch(() => ({}));
    const label = String(name || "").trim().slice(0, 60);
    if (!label || !params || typeof params !== "object") {
      return NextResponse.json({ error: "Please give your search a name." }, { status: 400 });
    }
    const n = (await query(`SELECT COUNT(*)::int n FROM saved_searches WHERE user_id = $1`, [me])).rows[0].n;
    if (n >= MAX_SAVED) {
      return NextResponse.json({ error: `You can save up to ${MAX_SAVED} searches. Delete one first.` }, { status: 400 });
    }
    const { rows } = await query(
      `INSERT INTO saved_searches (user_id, name, params) VALUES ($1, $2, $3) RETURNING id, name, params, created_at`,
      [me, label, JSON.stringify(params).length > 4000 ? {} : params]
    );
    return NextResponse.json({ ok: true, saved: rows[0] });
  } catch (e) {
    console.error("[saved-searches] POST", e);
    return NextResponse.json({ error: "Could not save this search." }, { status: 500 });
  }
}

/** DELETE ?id= */
export async function DELETE(req) {
  { const limited = limitOr429(`saved-search:${clientIp(req)}`, 30, 10 * 60 * 1000); if (limited) return limited; }
  const me = await getUserIdFromCookie();
  if (!me) return unauthorized();
  try {
    await ensureSchema();
    const id = new URL(req.url).searchParams.get("id");
    if (id) await query(`DELETE FROM saved_searches WHERE id = $1 AND user_id = $2`, [id, me]);
    return NextResponse.json({ ok: true });
  } catch (e) {
    console.error("[saved-searches] DELETE", e);
    return NextResponse.json({ error: "Could not delete." }, { status: 500 });
  }
}
