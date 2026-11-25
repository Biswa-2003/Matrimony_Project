// src/app/api/upload-photo/route.js
// Upload a member photo. Files are type-checked from their bytes (JPG/PNG/WebP only — never
// HTML/SVG, which would be a stored-XSS risk on our own domain) and stored in the database
// so they survive serverless deploys.
import { NextResponse } from "next/server";
import { getUserIdFromCookie } from "@/lib/auth";
import { limitOr429 } from "@/lib/rate-limit";
import { addMemberPhoto } from "@/lib/photos";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function POST(req) {
  const userId = await getUserIdFromCookie();
  if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const limited = limitOr429(`upload-photo:${userId}`, 20, 10 * 60 * 1000, "Too many uploads. Please wait a few minutes.");
  if (limited) return limited;

  try {
    const form = await req.formData();
    const file = form.get("photo") || form.get("file");
    if (!file || typeof file === "string") return NextResponse.json({ error: "No file provided" }, { status: 400 });
    const photo = await addMemberPhoto(userId, file);
    return NextResponse.json({ ok: true, path: photo.url, id: photo.id, is_primary: photo.is_primary });
  } catch (err) {
    const userFacing = /photo|profile|JPG|MB|up to/i.test(err.message);
    if (!userFacing) console.error("upload-photo error:", err);
    return NextResponse.json({ error: userFacing ? err.message : "Upload failed" }, { status: userFacing ? 400 : 500 });
  }
}
