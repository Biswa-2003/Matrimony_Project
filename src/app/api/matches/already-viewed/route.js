import { NextResponse } from "next/server";
import { getAuthUser } from "@/lib/auth";
import { buildCommonParts, runListQuery, runCountQuery } from "../_common";

export const revalidate = 0;
export const dynamic = "force-dynamic";

export async function GET(req) {
  try {
    const sp = new URL(req.url).searchParams;

    const me = await getAuthUser();
    const meId = me?.id || sp.get("me");
    if (!meId) {
      return NextResponse.json({ ok: false, error: "Unauthorized" }, { status: 401, headers: { "Cache-Control": "no-store" } });
    }

    // custom FROM for profile views YOU made
    const from = `
      profile_views v
      JOIN users u ON u.id = v.viewed_id
      JOIN matrimony_profiles mp ON mp.user_id = u.id
      LEFT JOIN LATERAL (
        SELECT path FROM photos ph 
        WHERE ph.profile_id = mp.id 
        ORDER BY ph.is_primary DESC, ph.created_at DESC 
        LIMIT 1
      ) ph ON TRUE
    `;

    // 🔑 Only this filter; DO NOT include base.where (no gender/age filtering)
    const whereParts = [`v.viewer_id = $1`];
    const params = [meId];

    const orderBy = `v.viewed_at DESC, u.created_at DESC`;

    if (sp.get("count") === "1") {
      const count = await runCountQuery({ from, whereParts, params });
      return NextResponse.json({ ok: true, count }, { headers: { "Cache-Control": "no-store" } });
    }

    const base = await buildCommonParts(meId, sp); // only for paging values
    const results = await runListQuery({
      from, whereParts, params,
      limit: base.limit, offset: base.offset, orderBy
    });

    return NextResponse.json({ ok: true, page: base.page, limit: base.limit, results }, { headers: { "Cache-Control": "no-store" } });
  } catch (err) {
    console.error("GET /api/matches/already-viewed error:", err);
    return NextResponse.json({ ok: false, error: "Server error" }, { status: 500, headers: { "Cache-Control": "no-store" } });
  }
}
