
import { NextResponse } from "next/server";
import { query } from "@/lib/db";
import { getUserIdFromCookie } from "@/lib/auth";
import { writeFile } from "fs/promises";
import path from "path";
import { v4 as uuidv4 } from "uuid";

export const dynamic = "force-dynamic";

export async function POST(req) {
    try {
        const userId = await getUserIdFromCookie();
        // Only logged in users can submit? Or allow public?
        // Let's require auth to associate user_id, but if guest, we can skip user_id.
        // The user "people provide their feedback" usually implies public/users. 
        // I'll allow anonymous if userId is null, but better if we encourage login. 
        // I will assume simple: if logged in, save ID.

        const formData = await req.formData();
        const coupleName = formData.get("couple_name");
        const marriageDate = formData.get("marriage_date");
        const story = formData.get("story");
        const rating = formData.get("rating");
        const file = formData.get("image");

        if (!coupleName || !story) {
            return NextResponse.json(
                { error: "Name and Story are required" },
                { status: 400 }
            );
        }

        let imageUrl = null;
        if (file && file.size > 0) {
            const bytes = await file.arrayBuffer();
            const buffer = Buffer.from(bytes);

            const ext = file.name.split(".").pop();
            const filename = `story_${uuidv4()}.${ext}`;
            const uploadDir = path.join(process.cwd(), "public", "uploads", "stories");

            // Ensure dir exists (simple check/create if possible, but Node fs/promises mkdir recursive is good)
            const fs = require('fs');
            if (!fs.existsSync(uploadDir)) {
                fs.mkdirSync(uploadDir, { recursive: true });
            }

            const filePath = path.join(uploadDir, filename);
            await writeFile(filePath, buffer);
            imageUrl = `/uploads/stories/${filename}`;
        }

        await query(
            `INSERT INTO success_stories (user_id, couple_name, marriage_date, story, image_url, rating, is_approved)
       VALUES ($1, $2, $3, $4, $5, $6, true)`,
            [userId || null, coupleName, marriageDate || null, story, imageUrl, rating || 5]
        );

        return NextResponse.json({ message: "Success story submitted!" });
    } catch (err) {
        console.error(err);
        return NextResponse.json(
            { error: "Server error submitting story" },
            { status: 500 }
        );
    }
}

export async function GET() {
    try {
        console.log('📥 GET /api/success-stories called');
        const { rows } = await query(
            "SELECT * FROM success_stories WHERE is_approved = true ORDER BY created_at DESC LIMIT 10"
        );
        console.log('✅ Query successful, found', rows.length, 'stories');
        console.log('📦 Stories data:', rows);
        return NextResponse.json(rows);
    } catch (err) {
        console.error('❌ Error fetching stories:', err);
        return NextResponse.json({ error: "Failed to fetch stories" }, { status: 500 });
    }
}
