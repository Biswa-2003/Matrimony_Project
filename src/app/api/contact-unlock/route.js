// src/app/api/contact-unlock/route.js
// Contact details are revealed only through here, so plan limits are enforced and every view is logged.
//   GET  ?matri_id=  → { unlocked, contact?, plan: { active, remaining } }
//   POST { matri_id } → uses 1 contact credit (free if already unlocked) → { contact, remaining }
import { NextResponse } from "next/server";
import { query } from "@/lib/db";
import { getUserIdFromCookie } from "@/lib/auth";
import { ensureSchema, isBlockedBetween } from "@/lib/schema";
import { findMemberByMatriId } from "@/lib/members";
import { limitOr429 } from "@/lib/rate-limit";
import { getActiveSubscriptionForUser } from "@/lib/subscriptions";

export const dynamic = "force-dynamic";

async function contactOf(userId) {
  const { rows } = await query(
    `SELECT COALESCE(NULLIF(mp.mobile, ''), u.phone) AS mobile, u.email,
            COALESCE(mp.phone_visible, true) AS phone_visible, COALESCE(mp.email_visible, true) AS email_visible,
            COALESCE(mp.is_active, true) AS active
       FROM users u LEFT JOIN matrimony_profiles mp ON mp.user_id = u.id WHERE u.id = $1`,
    [userId]
  );
  const r = rows[0];
  if (!r) return null;
  return {
    active: r.active,
    mobile: r.phone_visible ? r.mobile || null : null,
    email: r.email_visible ? r.email || null : null,
    hidden: { phone: !r.phone_visible, email: !r.email_visible },
  };
}

async function precheck(me, matriId) {
  const t = await findMemberByMatriId(matriId);
  if (!t) return { error: "Profile not found.", status: 404 };
  if (String(t.userId) === String(me)) return { self: true, target: t };
  if (await isBlockedBetween(me, t.userId)) return { error: "You can't view this member's contact details.", status: 403 };
  return { target: t };
}

export async function GET(req) {
  const me = await getUserIdFromCookie();
  if (!me) return NextResponse.json({ error: "Please log in." }, { status: 401 });
  await ensureSchema();
  const pc = await precheck(me, new URL(req.url).searchParams.get("matri_id"));
  if (pc.error) return NextResponse.json({ error: pc.error }, { status: pc.status });

  const sub = await getActiveSubscriptionForUser(me);
  const plan = { active: Boolean(sub), remaining: sub ? Number(sub.remaining_contacts ?? 0) : 0 };
  if (pc.self) return NextResponse.json({ unlocked: true, self: true, contact: await contactOf(me), plan });

  const done = await query(`SELECT 1 FROM contact_unlocks WHERE viewer_id = $1 AND target_id = $2`, [me, pc.target.userId]);
  if (done.rows.length) return NextResponse.json({ unlocked: true, contact: await contactOf(pc.target.userId), plan });
  return NextResponse.json({ unlocked: false, plan });
}

export async function POST(req) {
  const me = await getUserIdFromCookie();
  if (!me) return NextResponse.json({ error: "Please log in." }, { status: 401 });
  // even paid members can't mass-harvest numbers
  const limited =
    limitOr429(`contact-unlock:${me}`, 20, 60 * 60 * 1000, "You've viewed many contacts in a short time. Please try again later.") ||
    limitOr429(`contact-unlock-day:${me}`, 60, 24 * 60 * 60 * 1000, "Daily limit for viewing contacts reached. Please try again tomorrow.");
  if (limited) return limited;
  await ensureSchema();

  const { matri_id } = await req.json().catch(() => ({}));
  const pc = await precheck(me, matri_id);
  if (pc.error) return NextResponse.json({ error: pc.error }, { status: pc.status });
  if (pc.self) return NextResponse.json({ contact: await contactOf(me), remaining: null });

  const target = pc.target.userId;
  const contact = await contactOf(target);
  if (!contact?.active) return NextResponse.json({ error: "This member has paused their profile." }, { status: 403 });

  // already unlocked → free
  const done = await query(`SELECT 1 FROM contact_unlocks WHERE viewer_id = $1 AND target_id = $2`, [me, target]);
  const sub = await getActiveSubscriptionForUser(me);
  if (done.rows.length) return NextResponse.json({ contact, remaining: sub ? Number(sub.remaining_contacts ?? 0) : 0, alreadyUnlocked: true });

  if (!sub) return NextResponse.json({ error: "Upgrade to a premium plan to view contact details.", upgrade: true }, { status: 402 });
  if (!contact.mobile && !contact.email) {
    return NextResponse.json({ error: "This member has chosen to keep their contact details private. You can still message them once connected." }, { status: 403 });
  }

  // spend one credit atomically (never goes below zero, even with parallel clicks)
  const spent = await query(
    `UPDATE subscriptions SET remaining_contacts = remaining_contacts - 1
      WHERE id = $1 AND COALESCE(remaining_contacts, 0) > 0 RETURNING remaining_contacts`,
    [sub.id]
  );
  if (!spent.rows.length) {
    // a parallel click may have just unlocked this same member with the last credit
    const again = await query(`SELECT 1 FROM contact_unlocks WHERE viewer_id = $1 AND target_id = $2`, [me, target]);
    if (again.rows.length) return NextResponse.json({ contact, remaining: 0, alreadyUnlocked: true });
    return NextResponse.json({ error: "You've used all the contacts in your plan. Upgrade or renew to view more.", upgrade: true }, { status: 402 });
  }
  const ins = await query(
    `INSERT INTO contact_unlocks (viewer_id, target_id, subscription_id) VALUES ($1, $2, $3) ON CONFLICT DO NOTHING RETURNING 1`,
    [me, target, sub.id]
  );
  if (!ins.rows.length) {
    // a parallel request unlocked it first — give the credit back
    await query(`UPDATE subscriptions SET remaining_contacts = remaining_contacts + 1 WHERE id = $1`, [sub.id]);
  }
  return NextResponse.json({ contact, remaining: ins.rows.length ? spent.rows[0].remaining_contacts : spent.rows[0].remaining_contacts + 1 });
}
