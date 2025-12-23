import { NextResponse } from "next/server";
import OpenAI from "openai";
import { query } from "@/lib/db";
import jwt from "jsonwebtoken";

/* ---------- OpenRouter client ---------- */
const client = new OpenAI({
    apiKey: process.env.OPENROUTER_API_KEY,
    baseURL: "https://openrouter.ai/api/v1",
});

// ---------- Auth Helper ----------
function readTokenFromRequest(req) {
    const tokenFromCookie =
        req.cookies.get('token')?.value ||
        req.cookies.get('auth_token')?.value ||
        req.cookies.get('auth')?.value ||
        null;

    if (tokenFromCookie) return tokenFromCookie;

    const auth =
        req.headers.get('authorization') ||
        req.headers.get('Authorization');
    if (auth?.startsWith('Bearer ')) return auth.slice(7).trim();

    return null;
}

// ---------- Name to ID Mapping Helper ----------
async function findIdByName(table, name) {
    if (!name || typeof name !== 'string') return null;

    const searchTerm = String(name).trim();
    if (!searchTerm) return null;

    try {
        const sql = `SELECT id FROM ${table} WHERE LOWER(name) = LOWER($1) LIMIT 1`;
        const res = await query(sql, [searchTerm]);
        return res.rows?.[0]?.id || null;
    } catch (e) {
        console.error(`Error finding ID for ${table}:`, e);
        return null;
    }
}

/* ---------- helpers ---------- */
function extractJson(text) {
    const s = String(text || "").trim();
    try {
        return JSON.parse(s);
    } catch { }
    const m = s.match(/\{[\s\S]*\}/);
    if (m) {
        try {
            return JSON.parse(m[0]);
        } catch { }
    }
    return null;
}

function toInt(v) {
    const n = Number(v);
    return Number.isFinite(n) ? n : null;
}

function clamp(n, min, max) {
    if (n == null) return null;
    return Math.max(min, Math.min(max, n));
}

function normalizeMaritalStatus(v) {
    const s = String(v || "").trim().toLowerCase();
    if (!s) return null;
    return s;
}

// "5ft 6in" or "5ft6in" or 168 -> cm
function parseHeightToCm(v) {
    if (v == null) return null;
    if (typeof v === "number") return clamp(Math.round(v), 80, 260);

    const s = String(v).trim().toLowerCase();
    const asNum = Number(s);
    if (Number.isFinite(asNum)) return clamp(Math.round(asNum), 80, 260);

    const m =
        s.match(/^\s*(\d{1,2})\s*ft\.?\s*(\d{1,2})?\s*in?\.?\s*$/i) ||
        s.match(/^\s*(\d{1,2})\s*'\s*(\d{1,2})\s*"?\s*$/i);

    if (!m) return null;
    const ft = parseInt(m[1] || "0", 10);
    const inch = parseInt(m[2] || "0", 10);
    return clamp(Math.round((ft * 12 + inch) * 2.54), 80, 260);
}

async function aiToFilters(userText) {
    const model = process.env.OPENROUTER_MODEL || "openai/gpt-4o-mini";

    const prompt = `
Convert user matrimony search text to STRICT JSON only (no markdown, no explanation).

Return JSON with these keys only:
{
  "age_min": number | null,
  "age_max": number | null,
  "marital_status": string | null,
  "height_min": string|number|null,
  "height_max": string|number|null,
  "religion": string | null,
  "caste": string | null,
  "mother_tongue": string | null,
  "country": string | null,
  "state": string | null,
  "city": string | null
}

Rules:
- If "Never Married", "Unmarried", "Divorced", etc => marital_status
- Height can be like "5ft6in" or "168" (cm)
- For religion/caste/city/state/country/language: extract the NAME (e.g., "Hindu", "Brahmin", "Bhubaneswar", "Odisha", "India", "Hindi")
- If unknown use null.
- Output JSON ONLY.

User text: ${userText}
`;

    const completion = await client.chat.completions.create({
        model,
        temperature: 0,
        messages: [
            { role: "system", content: "Return ONLY valid JSON. No markdown." },
            { role: "user", content: prompt },
        ],
    });

    const raw = completion.choices?.[0]?.message?.content?.trim() || "";
    return { raw, parsed: extractJson(raw) };
}

export async function POST(req) {
    try {
        // ✅ Authenticate user and get their gender
        const token = readTokenFromRequest(req);
        if (!token) {
            return NextResponse.json({ error: 'Unauthorized - please log in' }, { status: 401 });
        }

        const secret = process.env.JWT_SECRET;
        if (!secret) {
            return NextResponse.json({ error: 'Server misconfiguration' }, { status: 500 });
        }

        let decoded;
        try {
            decoded = jwt.verify(token, secret);
        } catch {
            return NextResponse.json({ error: 'Invalid or expired token' }, { status: 401 });
        }

        const userId = decoded?.id ?? decoded?.userId;
        if (!userId) {
            return NextResponse.json({ error: 'Invalid token payload' }, { status: 401 });
        }

        // ✅ Get current user's gender to filter for OPPOSITE gender
        const userGenderQuery = `SELECT gender FROM matrimony_profiles WHERE user_id = $1 LIMIT 1`;
        const { rows: userRows } = await query(userGenderQuery, [userId]);
        const currentUserGender = userRows?.[0]?.gender;

        if (!currentUserGender) {
            return NextResponse.json({
                error: 'Profile not found. Please complete your profile first.'
            }, { status: 404 });
        }

        // Determine opposite gender
        const oppositeGender = currentUserGender.toLowerCase() === 'male' ? 'Female' : 'Male';

        const { text } = await req.json();
        const userText = String(text || "").trim();

        if (!userText) {
            return NextResponse.json({ error: "Text is required" }, { status: 400 });
        }

        if (!process.env.OPENROUTER_API_KEY) {
            return NextResponse.json({ error: "Missing OPENROUTER_API_KEY in .env.local" }, { status: 500 });
        }

        // 1) AI -> filters using OpenRouter
        const { raw, parsed } = await aiToFilters(userText);
        if (!parsed) {
            return NextResponse.json(
                { error: "AI returned invalid JSON", raw },
                { status: 500 }
            );
        }

        // 2) Map names to IDs
        const [religionId, casteId, motherTongueId, countryId, stateId, cityId] = await Promise.all([
            parsed.religion ? findIdByName('religions', parsed.religion) : null,
            parsed.caste ? findIdByName('castes', parsed.caste) : null,
            parsed.mother_tongue ? findIdByName('languages', parsed.mother_tongue) : null,
            parsed.country ? findIdByName('countries', parsed.country) : null,
            parsed.state ? findIdByName('states', parsed.state) : null,
            parsed.city ? findIdByName('cities', parsed.city) : null,
        ]);

        // 3) Sanitize filters
        let ageMin = clamp(toInt(parsed.age_min), 18, 70);
        let ageMax = clamp(toInt(parsed.age_max), 18, 70);
        if (ageMin != null && ageMax != null && ageMin > ageMax) {
            [ageMin, ageMax] = [ageMax, ageMin];
        }

        let hMin = parseHeightToCm(parsed.height_min);
        let hMax = parseHeightToCm(parsed.height_max);
        if (hMin != null && hMax != null && hMin > hMax) {
            [hMin, hMax] = [hMax, hMin];
        }

        const filters = {
            age_min: ageMin,
            age_max: ageMax,
            marital_status: normalizeMaritalStatus(parsed.marital_status),
            height_min_cm: hMin,
            height_max_cm: hMax,
            religion_id: religionId,
            caste_id: casteId,
            mother_tongue_id: motherTongueId,
            country_id: countryId,
            state_id: stateId,
            city_id: cityId,
            // Keep original names for debugging
            religion_name: parsed.religion,
            caste_name: parsed.caste,
            mother_tongue_name: parsed.mother_tongue,
            country_name: parsed.country,
            state_name: parsed.state,
            city_name: parsed.city,
        };

        // 4) Build SQL query
        const where = ["mp.is_active = true"];
        const params = [];
        let i = 1;

        // ✅ CRITICAL: Filter for OPPOSITE gender only (boys see girls, girls see boys)
        where.push(`mp.gender = $${i++}`);
        params.push(oppositeGender);

        if (filters.age_min != null) {
            where.push(`COALESCE(mp.age_years, EXTRACT(YEAR FROM age(mp.dob))::int) >= $${i++}`);
            params.push(filters.age_min);
        }

        if (filters.age_max != null) {
            where.push(`COALESCE(mp.age_years, EXTRACT(YEAR FROM age(mp.dob))::int) <= $${i++}`);
            params.push(filters.age_max);
        }

        if (filters.marital_status) {
            where.push(`mp.marital_status ILIKE $${i++}`);
            params.push(`%${filters.marital_status}%`);
        }

        if (filters.height_min_cm != null) {
            where.push(`mp.height_cm >= $${i++}`);
            params.push(filters.height_min_cm);
        }

        if (filters.height_max_cm != null) {
            where.push(`mp.height_cm <= $${i++}`);
            params.push(filters.height_max_cm);
        }

        if (filters.religion_id != null) {
            where.push(`mp.religion_id = $${i++}`);
            params.push(filters.religion_id);
        }

        if (filters.caste_id != null) {
            where.push(`mp.caste_id = $${i++}`);
            params.push(filters.caste_id);
        }

        if (filters.mother_tongue_id != null) {
            where.push(`mp.mother_tongue_id = $${i++}`);
            params.push(filters.mother_tongue_id);
        }

        if (filters.country_id != null) {
            where.push(`mp.country_id = $${i++}`);
            params.push(filters.country_id);
        }

        if (filters.state_id != null) {
            where.push(`mp.state_id = $${i++}`);
            params.push(filters.state_id);
        }

        if (filters.city_id != null) {
            where.push(`mp.city_id = $${i++}`);
            params.push(filters.city_id);
        }

        const sql = `
      SELECT
        mp.id, mp.matri_id, mp.first_name, mp.last_name, mp.gender,
        COALESCE(mp.age_years, EXTRACT(YEAR FROM age(mp.dob))::int) AS age,
        mp.height_cm, mp.marital_status,
        mp.religion_id, mp.caste_id, mp.mother_tongue_id,
        mp.country_id, mp.state_id, mp.city_id,
        r.name AS religion_name,
        c.name AS caste_name,
        co.name AS country_name,
        st.name AS state_name,
        ci.name AS city_name,
        ph.path AS photo_url
      FROM matrimony_profiles mp
      LEFT JOIN religions r ON r.id = mp.religion_id
      LEFT JOIN castes c ON c.id = mp.caste_id
      LEFT JOIN countries co ON co.id = mp.country_id
      LEFT JOIN states st ON st.id = mp.state_id
      LEFT JOIN cities ci ON ci.id = mp.city_id
      LEFT JOIN LATERAL (
        SELECT path FROM photos WHERE profile_id = mp.id AND is_primary = true LIMIT 1
      ) ph ON true
      WHERE ${where.join(" AND ")}
      ORDER BY mp.created_at DESC
      LIMIT 30
    `;

        const res = await query(sql, params);

        return NextResponse.json({
            ok: true,
            filters,
            results: res.rows,
            oppositeGender // for debugging
        });
    } catch (e) {
        console.error("AI search error:", e);
        return NextResponse.json(
            { error: "AI search failed", detail: String(e?.message || e) },
            { status: 500 }
        );
    }
}
