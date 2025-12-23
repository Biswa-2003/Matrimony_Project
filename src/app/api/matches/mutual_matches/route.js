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

  const whereParts = [...normalizeWhereParts(base)];

  // mutual match / connected (accepted)
  whereParts.push(`
    EXISTS (
      SELECT 1 FROM interests i
      WHERE i.status = 'accepted'
        AND (
          (i.from_profile = $1 AND i.to_profile = u.id)
          OR
          (i.from_profile = u.id AND i.to_profile = $1)
        )
    )
  `);

  return respondCountOrList({ sp, base, whereParts });
}
