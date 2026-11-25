// POST → { url, expiresInDays } : a 7-day family share link for MY profile
import { NextResponse } from "next/server";
import { query } from "@/lib/db";
import { getUserIdFromCookie } from "@/lib/auth";
import { limitOr429 } from "@/lib/rate-limit";
import { signShareToken, SHARE_DAYS } from "@/lib/share";

export const dynamic = "force-dynamic";

export async function POST(req) {
  const me = await getUserIdFromCookie();
  if (!me) return NextResponse.json({ error: "Please log in." }, { status: 401 });
  const limited = limitOr429(`share-link:${me}`, 20, 60 * 60 * 1000);
  if (limited) return limited;
  const { rows } = await query(`SELECT matri_id FROM matrimony_profiles WHERE user_id = $1 LIMIT 1`, [me]);
  if (!rows[0]?.matri_id) return NextResponse.json({ error: "Please complete your profile first." }, { status: 400 });
  const base = (process.env.NEXT_PUBLIC_BASE_URL || new URL(req.url).origin).replace(/\/$/, "");
  return NextResponse.json({ url: `${base}/p/${signShareToken(rows[0].matri_id)}`, expiresInDays: SHARE_DAYS });
}
