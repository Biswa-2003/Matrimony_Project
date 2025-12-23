// // src/app/api/filter-result/route.js
// import { NextResponse } from "next/server";
// import { query } from "@/lib/db";

// export const dynamic = "force-dynamic"; // ensure not prerendered

// // "5ft 3in" -> centimeters
// function feetInToCm(label) {
//   if (!label) return null;
//   const s = String(label).trim();
//   const m = s.match(/^\s{0,20}(\d{1,2})\s{0,20}ft\.?\s{0,20}(?:(\d{1,2})\s{0,20}(?:in?\.?)?)?\s{0,20}$/i);
//   if (!m) return null;
//   const feet = Number(m[1] || 0);
//   const inch = Number(m[2] || 0);
//   return Math.round((feet * 12 + inch) * 2.54);
// }
// function cmToLabel(cm) {
//   const n = Number(cm);
//   if (!n || Number.isNaN(n)) return null;
//   const total = Math.round(n / 2.54);
//   const ft = Math.floor(total / 12);
//   const inch = total % 12;
//   return `${ft} ft ${inch} in`;
// }

// // simple ping so you can open /api/filter-result in the browser
// export async function GET() {
//   return NextResponse.json({ ok: true, route: "/api/filter-result" });
// }

// export async function POST(req) {
//   try {
//     const body = await req.json().catch(() => ({}));

//     const {
//       ageMin, ageMax,
//       heightMinLabel, heightMaxLabel,
//       maritalStatuses = [],
//       religionId,
//       motherTongueId,               // languages.id
//       casteId,
//       countryId, stateIds = [], cityId,
//       educationId,
//       limit = 50, page = 1,
//     } = body || {};

//     const where = [];
//     const params = [];
//     const add = (clause, v) => {
//       params.push(v);
//       where.push(clause.replace("$X", `$${params.length}`));
//     };

//     // your table uses age_years
//     if (ageMin != null) add("p.age_years >= $X", Number(ageMin));
//     if (ageMax != null) add("p.age_years <= $X", Number(ageMax));

//     const hMin = feetInToCm(heightMinLabel);
//     const hMax = feetInToCm(heightMaxLabel);
//     if (hMin != null) add("p.height_cm >= $X", hMin);
//     if (hMax != null) add("p.height_cm <= $X", hMax);

//     if (maritalStatuses?.length) add("p.marital_status = ANY($X)", maritalStatuses);
//     if (religionId)      add("p.religion_id = $X", Number(religionId));
//     if (motherTongueId)  add("p.mother_tongue_id = $X", Number(motherTongueId));
//     if (casteId)         add("p.caste_id = $X", Number(casteId));
//     if (countryId)       add("p.country_id = $X", Number(countryId));
//     if (stateIds?.length) add("p.state_id = ANY($X)", stateIds.map(Number));
//     if (cityId)          add("p.city_id = $X", Number(cityId));
//     if (educationId)     add("p.education_id = $X", Number(educationId));

//     const whereSql = where.length ? `WHERE ${where.join(" AND ")}` : "";
//     const pageNum = Math.max(1, Number(page) || 1);
//     const pageSize = Math.max(1, Number(limit) || 50);
//     const offset = (pageNum - 1) * pageSize;

//     // count
//     const countSql = `SELECT COUNT(*)::int AS n FROM matrimony_profiles p ${whereSql}`;
//     const { rows: cRows } = await query(countSql, params);
//     const total = cRows?.[0]?.n ?? 0;

//     // data with masters (includes languages)
//     const sql = `
//       SELECT
//         p.id, p.matri_id, p.first_name, p.last_name, p.gender, p.marital_status,
//         p.age_years, p.height_cm,
//         p.education_id, p.religion_id, p.caste_id,
//         p.country_id, p.state_id, p.city_id, p.mother_tongue_id,
//         r.name  AS religion_name,
//         c.name  AS caste_name,
//         cn.name AS country_name,
//         s.name  AS state_name,
//         ci.name AS city_name,
//         e.name  AS education_name,
//         l.name  AS mother_tongue_name
//       FROM matrimony_profiles p
//       LEFT JOIN religions  r  ON r.id  = p.religion_id
//       LEFT JOIN castes     c  ON c.id  = p.caste_id
//       LEFT JOIN countries  cn ON cn.id = p.country_id
//       LEFT JOIN states     s  ON s.id  = p.state_id
//       LEFT JOIN cities     ci ON ci.id = p.city_id
//       LEFT JOIN educations e  ON e.id  = p.education_id
//       LEFT JOIN languages  l  ON l.id  = p.mother_tongue_id
//       ${whereSql}
//       ORDER BY p.created_at DESC NULLS LAST, p.id DESC
//       LIMIT $${params.length + 1} OFFSET $${params.length + 2}
//     `;

//     const { rows } = await query(sql, [...params, pageSize, offset]);

//     const results = rows.map(r => ({
//       ...r,
//       full_name: (r.first_name || r.last_name)
//         ? [r.first_name, r.last_name].filter(Boolean).join(" ")
//         : null,
//       location_text: [r.city_name, r.state_name, r.country_name].filter(Boolean).join(", "),
//       height_label: r.height_cm ? cmToLabel(r.height_cm) : null,
//     }));

//     return NextResponse.json({ page: pageNum, limit: pageSize, count: total, results });
//   } catch (err) {
//     console.error("filter-result error:", err);
//     return NextResponse.json({ error: err.message || "Server error" }, { status: 500 });
//   }
// }
