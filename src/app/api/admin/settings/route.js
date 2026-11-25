import { NextResponse } from "next/server";
import { isAdmin } from "@/lib/auth";
import { getSetting, setSetting, DEFAULT_ANNOUNCEMENT } from "@/lib/media";

export const dynamic = "force-dynamic";
const denied = () => NextResponse.json({ error: "Access denied. Admin privileges required." }, { status: 403 });
const TONES = ["gold", "maroon", "green"];

export async function GET() {
  if (!(await isAdmin())) return denied();
  try {
    const announcement = { ...DEFAULT_ANNOUNCEMENT, ...(await getSetting("announcement", {})) };
    return NextResponse.json({ ok: true, announcement });
  } catch (e) {
    console.error("[admin/settings] GET", e);
    return NextResponse.json({ error: "Failed to load settings" }, { status: 500 });
  }
}

/** PUT { announcement: { enabled, text, linkText, linkUrl, tone } } */
export async function PUT(req) {
  if (!(await isAdmin())) return denied();
  try {
    const { announcement: a = {} } = await req.json().catch(() => ({}));
    const linkUrl = String(a.linkUrl || "").trim();
    // only site-relative links or https URLs (no javascript: etc.)
    if (linkUrl && !/^\/(?!\/)/.test(linkUrl) && !/^https:\/\//i.test(linkUrl)) {
      return NextResponse.json({ error: "Link must start with / or https://" }, { status: 400 });
    }
    const value = {
      enabled: Boolean(a.enabled),
      text: String(a.text || "").trim().slice(0, 180),
      linkText: String(a.linkText || "").trim().slice(0, 40),
      linkUrl,
      tone: TONES.includes(a.tone) ? a.tone : "gold",
    };
    if (value.enabled && !value.text) return NextResponse.json({ error: "Please enter the announcement text." }, { status: 400 });
    await setSetting("announcement", value);
    return NextResponse.json({ ok: true, announcement: value });
  } catch (e) {
    console.error("[admin/settings] PUT", e);
    return NextResponse.json({ error: "Failed to save" }, { status: 500 });
  }
}
