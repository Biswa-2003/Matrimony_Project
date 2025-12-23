import { NextResponse } from "next/server";
import { getAuthUser } from "@/lib/auth";
import { buildCommonParts, normalizeWhereParts, respondCountOrList } from "../_common";

export async function GET(req) {
  const me = await getAuthUser();
  const sp = new URL(req.url).searchParams;
  const meId = me?.id || sp.get("me");

  if (!meId) {
    return NextResponse.json({ ok: false, error: "Unauthorized" }, { status: 401 });
  }

  const base = await buildCommonParts(meId, sp);

  /**
   * Complex logic for premium matches:
   * 1. Target user must be premium
   * 2. Viewer (me) must be premium OR have a role like 'premium' or 'admin'
   */

  const otherIsPremium = `
    (
      u.role IN ('premium','admin')
      OR EXISTS (
        SELECT 1 FROM subscriptions s
        WHERE s.user_id = u.id
          AND s.ends_at > NOW()
      )
    )
  `;

  const viewerIsPremium = `
    (
      EXISTS (
        SELECT 1 FROM users v
        WHERE v.id = $1
          AND v.role IN ('premium','admin')
      )
      OR EXISTS (
        SELECT 1 FROM subscriptions vs
        WHERE vs.user_id = $1
          AND vs.ends_at > NOW()
      )
    )
  `;

  const whereParts = [
    otherIsPremium,
    viewerIsPremium,
    ...normalizeWhereParts(base),
  ];

  return respondCountOrList({ sp, base, whereParts });
}
