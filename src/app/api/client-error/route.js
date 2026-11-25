// POST { message, path, digest } — the browser reports a page crash (from app/error.jsx)
import { NextResponse } from "next/server";
import { clientIp, limitOr429 } from "@/lib/rate-limit";
import { logError } from "@/lib/error-log";

export const dynamic = "force-dynamic";

export async function POST(req) {
  const limited = limitOr429(`client-error:${clientIp(req)}`, 10, 10 * 60 * 1000);
  if (limited) return NextResponse.json({ ok: false }, { status: 202 }); // silently drop floods
  const { message, path, digest } = await req.json().catch(() => ({}));
  if (!message) return NextResponse.json({ ok: false }, { status: 400 });
  await logError("browser", message, { path, digest });
  return NextResponse.json({ ok: true });
}
