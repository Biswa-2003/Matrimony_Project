import { NextResponse } from "next/server";
import { query } from "@/lib/db";
import { getUserIdFromCookie } from "@/lib/auth";
import { storeImage } from "@/lib/media";
import { rateLimit } from "@/lib/rate-limit";

export const dynamic = "force-dynamic";

/**
 * POST — members/visitors submit a success story.
 * Stories are saved as PENDING (is_approved = false) and only appear on the site after an admin approves them
 * in Admin → Success Stories. Photos are stored in the database (works on serverless hosting).
 */
export async function POST(req) {
  const ip = req.headers.get("x-forwarded-for") || "unknown";
  if (!rateLimit(`story:${ip}`, 3, 60 * 60 * 1000)) {
    return NextResponse.json({ error: "Too many submissions. Please try again later." }, { status: 429 });
  }
  try {
    const userId = await getUserIdFromCookie();
    const formData = await req.formData();
    const coupleName = String(formData.get("couple_name") || "").trim().slice(0, 120);
    const story = String(formData.get("story") || "").trim().slice(0, 2000);
    const marriageDate = String(formData.get("marriage_date") || "").trim() || null;
    const rating = Math.min(5, Math.max(1, Number(formData.get("rating")) || 5));
    const file = formData.get("image");

    if (!coupleName || !story) {
      return NextResponse.json({ error: "Name and story are required" }, { status: 400 });
    }

    let imageUrl = null;
    if (file && file.size > 0) {
      try {
        imageUrl = (await storeImage(file)).url;
      } catch (e) {
        return NextResponse.json({ error: e.message }, { status: 400 });
      }
    }

    await query(
      `INSERT INTO success_stories (user_id, couple_name, marriage_date, story, image_url, rating, is_approved)
       VALUES ($1, $2, $3, $4, $5, $6, false)`,
      [userId || null, coupleName, marriageDate, story, imageUrl, rating]
    );

    return NextResponse.json({ message: "Thank you! Your story will appear once our team reviews it." });
  } catch (err) {
    console.error("[success-stories] POST", err);
    return NextResponse.json({ error: "Server error submitting story" }, { status: 500 });
  }
}

/** GET — approved stories for the public carousel */
export async function GET() {
  try {
    const { rows } = await query(
      `SELECT id, couple_name, marriage_date, story, image_url, rating, created_at
         FROM success_stories WHERE is_approved = true ORDER BY created_at DESC LIMIT 10`
    );
    return NextResponse.json(rows, { headers: { "Cache-Control": "public, max-age=60, stale-while-revalidate=300" } });
  } catch (err) {
    console.error("[success-stories] GET", err);
    return NextResponse.json({ error: "Failed to fetch stories" }, { status: 500 });
  }
}
