import { query } from "@/lib/db";

/** Resolve a member by public Matri ID → { userId, profileId, matriId } or null. */
export async function findMemberByMatriId(matriId) {
  const id = String(matriId || "").trim();
  if (!id) return null;
  const { rows } = await query(
    `SELECT user_id, id AS profile_id, matri_id FROM matrimony_profiles WHERE UPPER(matri_id) = UPPER($1) LIMIT 1`,
    [id]
  );
  return rows[0] ? { userId: rows[0].user_id, profileId: rows[0].profile_id, matriId: rows[0].matri_id } : null;
}

/** Normalise a stored photo path to a URL. */
export function photoUrl(p) {
  if (!p) return null;
  if (/^(https?:|data:)/.test(p)) return p;
  if (p.startsWith("/")) return p;
  return p.startsWith("uploads/") ? `/${p}` : `/uploads/${p}`;
}

/** Common SELECT list + joins for showing a member card. Expects alias `mp` for matrimony_profiles. */
export const MEMBER_CARD_SQL = `
  mp.matri_id,
  mp.user_id,
  TRIM(CONCAT_WS(' ', mp.first_name, mp.last_name)) AS full_name,
  mp.gender,
  CAST(date_part('year', age(mp.dob)) AS int) AS age,
  mp.height_cm,
  r.name AS religion_name,
  c.name AS caste_name,
  ci.name AS city_name,
  st.name AS state_name,
  (SELECT ph.path FROM photos ph WHERE ph.profile_id = mp.id ORDER BY ph.is_primary DESC, ph.created_at DESC LIMIT 1) AS photo
`;

export const MEMBER_CARD_JOINS = `
  LEFT JOIN religions r ON r.id = mp.religion_id
  LEFT JOIN castes c ON c.id = mp.caste_id
  LEFT JOIN cities ci ON ci.id = mp.city_id
  LEFT JOIN states st ON st.id = mp.state_id
`;

/** A new, unused public Matri ID like "DU482913" (checked against existing profiles). */
export async function newMatriId() {
  const crypto = await import("crypto");
  for (let i = 0; i < 20; i++) {
    const id = `DU${crypto.randomInt(100000, 1000000)}`;
    const { rows } = await query(`SELECT 1 FROM matrimony_profiles WHERE matri_id = $1`, [id]);
    if (!rows.length) return id;
  }
  throw new Error("Could not allocate a Matri ID");
}
