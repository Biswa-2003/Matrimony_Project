// app/api/upload-photo/route.js
export const runtime = "nodejs";
export const dynamic = "force-dynamic";

import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import jwt from "jsonwebtoken";
import path from "path";
import fs from "fs/promises";
import { v4 as uuidv4 } from "uuid";
import crypto from "crypto";
import { query } from "@/lib/db";

function ensureLeadingSlash(p) {
  return p.startsWith("/") ? p : `/${p}`;
}

async function ensureFallbackDefault() {
  // One-time tiny default image (prevents 404 spam if user has no photo)
  const uploadDir = path.join(process.cwd(), "public", "uploads");
  await fs.mkdir(uploadDir, { recursive: true });
  const def = path.join(uploadDir, "default.jpg");
  try { await fs.access(def); } catch {
    const base64 =
      "/9j/4AAQSkZJRgABAQAAAQABAAD/2wCEAAkGBxISEhISEhIWFhUVFRUVFRUVFRUVFRUVFRUVFRUYHSggGBolGxUVITEhJSkrLi4uFx8zODMtNygtLisBCgoKDg0OGxAQGy0lICUtLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLf/AABEIAAEAAQMBIgACEQEDEQH/xAAXAAADAQAAAAAAAAAAAAAAAAAEBQYH/8QAHxAAAgICAgMBAAAAAAAAAAAAAQIDEQQSIRMxQWGB/8QAFQEBAQAAAAAAAAAAAAAAAAAAAwT/xAAZEQEAAwEBAAAAAAAAAAAAAAABAAIDMUH/2gAMAwEAAhEDEQA/AKyAAAAAAABQABQAAAAAAABQAAAAAABQAAABK6nV8vZ8f8b0Jf9dQn7kz3aX1bTQm5V4oJ6bWb5u0RkAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAH//2Q==";
    await fs.writeFile(def, Buffer.from(base64, "base64"));
  }
}

export async function POST(req) {
  try {
    // 1) Auth
    const cookieStore = await cookies();
    const token = cookieStore.get("auth")?.value || cookieStore.get("token")?.value;
    if (!token) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    let payload;
    try { payload = jwt.verify(token, process.env.JWT_SECRET); }
    catch { return NextResponse.json({ error: "Unauthorized" }, { status: 401 }); }

    const userId = payload.uid || payload.id;
    if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    // 2) File
    const form = await req.formData();
    const file = form.get("photo") || form.get("file");
    if (!file || typeof file === "string") {
      return NextResponse.json({ error: "No file provided" }, { status: 400 });
    }
    const bytes = Buffer.from(await file.arrayBuffer());
    if (bytes.length > 5 * 1024 * 1024) {
      return NextResponse.json({ error: "File too large (max 5MB)" }, { status: 413 });
    }

    // 3) Ensure static dir + default
    const uploadDir = path.join(process.cwd(), "public", "uploads");
    await fs.mkdir(uploadDir, { recursive: true });
    await ensureFallbackDefault();

    // 4) Save file
    const safeName = String(file.name || "upload.jpg").replace(/[^\w.\-]+/g, "_");
    const fileName = `${userId}-${Date.now()}-${safeName}`;
    await fs.writeFile(path.join(uploadDir, fileName), bytes);
    const publicPath = ensureLeadingSlash(path.join("uploads", fileName).replace(/\\/g, "/")); // ALWAYS "/uploads/.."

    // 5) Find/Create profile id for this user (gender 'U' if needed)
    let prof = await query(`SELECT id
FROM matrimony_profiles
WHERE user_id = $1
ORDER BY created_at DESC
LIMIT 1;
`, [userId]);
    if (prof.rows.length === 0) {
      // Avoid NOT NULL errors (we know gender is NOT NULL on your schema)
      const gen = await query(
        `SELECT COALESCE(gender,'U') AS gender FROM users WHERE id = $1 LIMIT 1`,
        [userId]
      ).catch(() => ({ rows: [{ gender: "U" }] }));
      const gender = gen.rows?.[0]?.gender || "U";
      const profId = uuidv4();
      await query(
        `INSERT INTO matrimony_profiles (id, user_id, first_name, matri_id, gender)
         VALUES ($1,$2,$3,$4,$5)`,
        [profId, userId, "", `DU${crypto.randomInt(100000, 1000000)}`, gender]
      );
      prof = { rows: [{ id: profId }] };
    }
    const profileId = prof.rows[0].id;


    // 6) Insert photo and mark primary if first
    const { rows: cnt } = await query(
      `SELECT COUNT(*)::int AS c FROM photos WHERE profile_id = $1`,
      [profileId]
    );
    const isPrimary = (cnt[0]?.c ?? 0) === 0;
    //  const isPrimary = true;
    await query(
      `UPDATE photos SET is_primary = $1 Where profile_id = $2 `, [isPrimary, profileId]

    );
    await query(
      `INSERT INTO photos (id, profile_id, path, is_primary, created_at)
       VALUES ($1,$2,$3,$4,NOW())`,
      [uuidv4(), profileId, publicPath, true]
    );

    return NextResponse.json({ ok: true, path: publicPath, is_primary: isPrimary }, { status: 200 });
  } catch (err) {
    console.error("upload-photo error:", err);
    return NextResponse.json({ error: "Upload failed" }, { status: 500 });
  }
}
