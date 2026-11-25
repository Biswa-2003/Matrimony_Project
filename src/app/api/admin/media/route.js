import { NextResponse } from "next/server";
import { query } from "@/lib/db";
import { isAdmin } from "@/lib/auth";
import { MEDIA_SLOTS, storeImage, getSetting, setSetting } from "@/lib/media";
import { ensureSchema } from "@/lib/schema";

export const dynamic = "force-dynamic";
const denied = () => NextResponse.json({ error: "Access denied. Admin privileges required." }, { status: 403 });

/** GET → every slot with its current image (custom or default) */
export async function GET() {
  if (!(await isAdmin())) return denied();
  try {
    await ensureSchema();
    const { rows } = await query(`SELECT key, value, updated_at FROM site_settings WHERE key LIKE 'media:%'`);
    const custom = Object.fromEntries(rows.map((r) => [r.key.slice(6), { ...r.value, updatedAt: r.updated_at }]));
    const slots = Object.entries(MEDIA_SLOTS).map(([key, s]) => ({
      key,
      ...s,
      url: custom[key]?.url || s.fallback,
      alt: custom[key]?.alt || "",
      isCustom: Boolean(custom[key]?.url),
      updatedAt: custom[key]?.updatedAt || null,
    }));
    return NextResponse.json({ ok: true, slots });
  } catch (e) {
    console.error("[admin/media] GET", e);
    return NextResponse.json({ error: "Failed to load media" }, { status: 500 });
  }
}

/** POST multipart { slot, file, alt? } → upload and assign to a slot */
export async function POST(req) {
  if (!(await isAdmin())) return denied();
  try {
    const form = await req.formData();
    const slot = String(form.get("slot") || "");
    if (!MEDIA_SLOTS[slot]) return NextResponse.json({ error: "Unknown image slot." }, { status: 400 });
    const stored = await storeImage(form.get("file"));
    const alt = String(form.get("alt") || "").slice(0, 160);
    const prev = await getSetting(`media:${slot}`);
    await setSetting(`media:${slot}`, { url: stored.url, fileId: stored.id, alt });
    // the replaced image is no longer referenced anywhere
    if (prev?.fileId) await query(`DELETE FROM media_files WHERE id = $1`, [prev.fileId]).catch(() => {});
    return NextResponse.json({ ok: true, url: stored.url });
  } catch (e) {
    const userError = /image|choose|large|allowed/i.test(e.message);
    if (!userError) console.error("[admin/media] POST", e);
    return NextResponse.json({ error: userError ? e.message : "Upload failed" }, { status: userError ? 400 : 500 });
  }
}

/** DELETE ?slot= → restore the built-in artwork for that slot */
export async function DELETE(req) {
  if (!(await isAdmin())) return denied();
  try {
    const slot = new URL(req.url).searchParams.get("slot");
    if (!MEDIA_SLOTS[slot]) return NextResponse.json({ error: "Unknown image slot." }, { status: 400 });
    const prev = await getSetting(`media:${slot}`);
    await query(`DELETE FROM site_settings WHERE key = $1`, [`media:${slot}`]);
    if (prev?.fileId) await query(`DELETE FROM media_files WHERE id = $1`, [prev.fileId]).catch(() => {});
    return NextResponse.json({ ok: true, url: MEDIA_SLOTS[slot].fallback });
  } catch (e) {
    console.error("[admin/media] DELETE", e);
    return NextResponse.json({ error: "Failed to reset" }, { status: 500 });
  }
}

