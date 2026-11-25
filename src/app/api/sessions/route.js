// src/app/api/sessions/route.js
//   GET                → { sessions: [{ id, device, ip, created_at, last_seen_at, current }] }
//   DELETE ?id=UUID    → log out that device
//   DELETE ?others=1   → log out every device except this one
import { NextResponse } from "next/server";
import { query } from "@/lib/db";
import { getAuthPayload } from "@/lib/auth";
import { ensureSchema } from "@/lib/schema";
import { limitOr429 } from "@/lib/rate-limit";
import { revokeSession, revokeAllSessions, uaSummary, SESSION_HOURS } from "@/lib/sessions";

export const dynamic = "force-dynamic";

const maskIp = (ip) => {
  if (!ip) return null;
  const v4 = ip.match(/^(\d+)\.(\d+)\.\d+\.\d+$/);
  if (v4) return `${v4[1]}.${v4[2]}.x.x`;
  return ip.length > 12 ? `${ip.slice(0, 9)}…` : ip;
};

export async function GET() {
  const me = await getAuthPayload();
  if (!me?.id) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  await ensureSchema();
  const { rows } = await query(
    `SELECT id, ip, user_agent, created_at, last_seen_at
       FROM user_sessions
      WHERE user_id = $1 AND revoked_at IS NULL
        AND created_at > NOW() - ($2 || ' hours')::interval
      ORDER BY (id = $3::uuid) DESC, last_seen_at DESC
      LIMIT 20`,
    [me.id, String(SESSION_HOURS), me.jti || null]
  );
  return NextResponse.json({
    sessions: rows.map((r) => ({
      id: r.id,
      device: uaSummary(r.user_agent),
      ip: maskIp(r.ip),
      created_at: r.created_at,
      last_seen_at: r.last_seen_at,
      current: r.id === me.jti,
    })),
    tracked: Boolean(me.jti),
  });
}

export async function DELETE(req) {
  const me = await getAuthPayload();
  if (!me?.id) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const limited = limitOr429(`sessions:${me.id}`, 20, 10 * 60 * 1000);
  if (limited) return limited;
  await ensureSchema();
  const sp = new URL(req.url).searchParams;

  if (sp.get("others")) {
    if (!me.jti) return NextResponse.json({ error: "Please log in again, then try this." }, { status: 400 });
    await revokeAllSessions(me.id, me.jti);
    return NextResponse.json({ ok: true, message: "Logged out of all other devices." });
  }

  const id = sp.get("id");
  if (!id || !/^[0-9a-f-]{36}$/i.test(id)) return NextResponse.json({ error: "id is required" }, { status: 400 });
  if (id === me.jti) return NextResponse.json({ error: "Use Log out to end this session." }, { status: 400 });
  const ok = await revokeSession(me.id, id);
  return ok ? NextResponse.json({ ok: true }) : NextResponse.json({ error: "Session not found." }, { status: 404 });
}
