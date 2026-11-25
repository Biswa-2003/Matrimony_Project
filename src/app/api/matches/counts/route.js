import { NextResponse } from "next/server";
import { getUserIdFromCookie } from "@/lib/auth";
import { GET as overall } from "../overall/route";
import { GET as newmatches } from "../newmatches/route";
import { GET as premium } from "../premium_matches/route";
import { GET as mutual } from "../mutual_matches/route";
import { GET as viewed } from "../already-viewed/route";
import { GET as viewedMe } from "../who-viewed-myprofile/route";
import { GET as yetToView } from "../yet-to-viewed-myprofile/route";

export const dynamic = "force-dynamic";

const HANDLERS = { overall, newmatches, premium, mutual, viewed, viewedMe, yetToView };

/**
 * All navbar match counts in ONE request (previously 7–14 separate requests per page).
 * Each category handler runs its own COUNT query in parallel; a failing category returns 0
 * instead of failing the whole response.
 */
export async function GET(req) {
  const meId = await getUserIdFromCookie();
  if (!meId) return NextResponse.json({ ok: false, error: "Unauthorized" }, { status: 401 });

  const base = new URL(req.url);
  const entries = await Promise.all(
    Object.entries(HANDLERS).map(async ([key, handler]) => {
      try {
        const res = await handler(new Request(`${base.origin}/api/matches/${key}?count=1`, { headers: req.headers }));
        const json = await res.json();
        return [key, Number(json?.count) || 0];
      } catch (e) {
        console.error(`[matches/counts] ${key} failed:`, e.message);
        return [key, 0];
      }
    })
  );

  return NextResponse.json(
    { ok: true, counts: Object.fromEntries(entries) },
    { headers: { "Cache-Control": "private, max-age=15" } }
  );
}
