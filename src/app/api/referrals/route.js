// GET → my referral code/link and stats
import { NextResponse } from "next/server";
import { query } from "@/lib/db";
import { getUserIdFromCookie } from "@/lib/auth";
import { ensureReferralCode, REWARD_DAYS } from "@/lib/referrals";

export const dynamic = "force-dynamic";

export async function GET(req) {
  const me = await getUserIdFromCookie();
  if (!me) return NextResponse.json({ error: "Please log in." }, { status: 401 });
  const code = await ensureReferralCode(me);
  const base = (process.env.NEXT_PUBLIC_BASE_URL || new URL(req.url).origin).replace(/\/$/, "");
  const stats = (await query(
    `SELECT COUNT(*)::int AS joined, COUNT(rewarded_at)::int AS upgraded, COALESCE(SUM(reward_days), 0)::int AS days
       FROM referrals WHERE referrer_id = $1`,
    [me]
  )).rows[0];
  const banked = (await query(`SELECT bonus_days FROM users WHERE id = $1`, [me])).rows[0]?.bonus_days || 0;
  return NextResponse.json({ code, link: `${base}/?ref=${code}`, rewardDays: REWARD_DAYS, ...stats, banked });
}
