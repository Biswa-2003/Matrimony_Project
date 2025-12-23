import { NextResponse } from "next/server";
import { getAuthUser } from "@/lib/auth";
import { buildCommonParts, SCORE_MIN, normalizeWhereParts, respondCountOrList } from "../_common";

export async function GET(req) {
  const me = await getAuthUser();
  const sp = new URL(req.url).searchParams;
  const meId = me?.id || sp.get("me");

  if (!meId) {
    return NextResponse.json({ ok: false, error: "Unauthorized" }, { status: 401 });
  }

  const base = await buildCommonParts(meId, sp);

  const whereParts = [
    `NOT EXISTS (
       SELECT 1 FROM profile_views vv
       WHERE vv.viewer_id = $1 AND vv.viewed_id = u.id
     )`,
    `match_score($1, u.id) >= ${SCORE_MIN}`,
    ...normalizeWhereParts(base),
  ];

  return respondCountOrList({ sp, base, whereParts });
}
