// Admin coupon management
//   GET                     → { coupons[], plans[], referrals: { joined, upgraded, top[] } }
//   POST { code, kind, value, ... } → create
//   PATCH { id, active }    → enable / disable
import { NextResponse } from "next/server";
import { query } from "@/lib/db";
import { isAdmin } from "@/lib/auth";
import { ensureSchema } from "@/lib/schema";
import { logAdmin } from "@/lib/admin-audit";
import { normCode } from "@/lib/coupons";

export const dynamic = "force-dynamic";
const denied = () => NextResponse.json({ error: "Access denied. Admin privileges required." }, { status: 403 });

export async function GET() {
  if (!(await isAdmin())) return denied();
  await ensureSchema();
  const coupons = (await query(
    `SELECT c.*, COALESCE((SELECT SUM(discount_paise) FROM coupon_redemptions r WHERE r.coupon_id = c.id), 0)::bigint AS discount_given
       FROM coupons c ORDER BY c.created_at DESC`
  )).rows;
  const plans = (await query(`SELECT code, name FROM plans ORDER BY price_inr`)).rows;
  const ref = (await query(`SELECT COUNT(*)::int AS joined, COUNT(rewarded_at)::int AS upgraded FROM referrals`)).rows[0];
  const top = (await query(
    `SELECT COALESCE(NULLIF(TRIM(CONCAT_WS(' ', mp.first_name, mp.last_name)), ''), u.email) AS name, mp.matri_id,
            COUNT(*)::int AS joined, COUNT(r.rewarded_at)::int AS upgraded
       FROM referrals r JOIN users u ON u.id = r.referrer_id LEFT JOIN matrimony_profiles mp ON mp.user_id = r.referrer_id
      GROUP BY 1, 2 ORDER BY upgraded DESC, joined DESC LIMIT 10`
  )).rows;
  return NextResponse.json({ coupons, plans, referrals: { ...ref, top } });
}

export async function POST(req) {
  if (!(await isAdmin())) return denied();
  await ensureSchema();
  const b = await req.json().catch(() => ({}));
  const code = normCode(b.code);
  const kind = b.kind === "flat" ? "flat" : "percent";
  const value = Number(b.value);
  if (!/^[A-Z0-9_-]{3,30}$/.test(code)) return NextResponse.json({ error: "Code must be 3–30 letters/numbers." }, { status: 400 });
  if (!(value > 0) || (kind === "percent" && value > 100)) return NextResponse.json({ error: kind === "percent" ? "Percent must be 1–100." : "Amount must be more than 0." }, { status: 400 });
  const maxUses = b.max_uses ? Math.max(1, parseInt(b.max_uses, 10)) : null;
  const planCodes = Array.isArray(b.plan_codes) && b.plan_codes.length ? b.plan_codes.map((x) => String(x).toUpperCase()) : null;
  try {
    const { rows } = await query(
      `INSERT INTO coupons (code, description, kind, value, max_discount_inr, plan_codes, max_uses, valid_from, valid_until)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9) RETURNING *`,
      [code, String(b.description || "").slice(0, 120) || null, kind, value,
        b.max_discount_inr ? Number(b.max_discount_inr) : null, planCodes, maxUses,
        b.valid_from || null, b.valid_until ? new Date(`${b.valid_until}T23:59:59+05:30`) : null]
    );
    await logAdmin("coupon.create", null, { code, kind, value });
    return NextResponse.json({ ok: true, coupon: rows[0] });
  } catch (e) {
    if (/duplicate|unique/i.test(e.message)) return NextResponse.json({ error: "That code already exists." }, { status: 400 });
    throw e;
  }
}

export async function PATCH(req) {
  if (!(await isAdmin())) return denied();
  await ensureSchema();
  const { id, active } = await req.json().catch(() => ({}));
  if (!id || typeof active !== "boolean") return NextResponse.json({ error: "id and active are required" }, { status: 400 });
  const { rows } = await query(`UPDATE coupons SET active = $2 WHERE id = $1 RETURNING code`, [id, active]);
  if (!rows.length) return NextResponse.json({ error: "Coupon not found" }, { status: 404 });
  await logAdmin(active ? "coupon.enable" : "coupon.disable", null, { code: rows[0].code });
  return NextResponse.json({ ok: true });
}
