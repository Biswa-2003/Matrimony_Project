import { NextResponse } from "next/server";
import { getSiteContent, MEDIA_SLOTS, DEFAULT_ANNOUNCEMENT } from "@/lib/media";

export const dynamic = "force-dynamic";

/** Public: current site images (admin-managed) and the announcement bar. */
export async function GET() {
  try {
    const content = await getSiteContent();
    return NextResponse.json(content, { headers: { "Cache-Control": "public, max-age=30, stale-while-revalidate=300" } });
  } catch (e) {
    console.error("[site-content]", e.message);
    const media = Object.fromEntries(Object.entries(MEDIA_SLOTS).map(([k, v]) => [k, v.fallback]));
    return NextResponse.json({ media, announcement: DEFAULT_ANNOUNCEMENT });
  }
}
