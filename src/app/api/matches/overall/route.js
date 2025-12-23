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

  // If you have match_score, add it here:
  // base.where.push(`match_score($1, u.id) >= 1`);
  const whereParts = [...normalizeWhereParts(base)];

  return respondCountOrList({ sp, base, whereParts });
}
