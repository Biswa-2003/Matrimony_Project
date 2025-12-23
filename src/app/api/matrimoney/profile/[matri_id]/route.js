export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

import { NextResponse } from 'next/server';
import { query } from '@/lib/db';

const BASE_TABLES = ['matrimony_profiles', 'matrimoney_profiles', 'profiles'];
const ENV_TABLE = process.env.PROFILE_TABLE?.trim();
const SAFE_TABLES =
  ENV_TABLE && !BASE_TABLES.includes(ENV_TABLE)
    ? [ENV_TABLE, ...BASE_TABLES]
    : BASE_TABLES;

function safePhotoUrl(path) {
  if (!path) return null;
  const trimmed = String(path).replace(/^\/+/, '');
  return trimmed.startsWith('http') ? String(path) : `/${trimmed}`;
}

export async function GET(_req, context) {
  // ✅ Next 15: params is async
  const params = await context.params;
  const matri = decodeURIComponent(params?.matri_id || '').trim();
  if (!matri) return NextResponse.json({ error: 'matri_id required' }, { status: 400 });

  // Build a rich profile (names + cover + partner prefs arrays)
  const buildSql = (tbl) => `
    WITH base AS (
      SELECT mp.*
      FROM ${tbl} mp
      WHERE LOWER(BTRIM(mp.matri_id)) = LOWER($1)
      LIMIT 1
    )
    SELECT
      mp.*,

      -- master names
      r.name     AS religion_name,
      c.name     AS caste_name,
      lang.name  AS mother_tongue_name,
      co.name    AS country_name,
      st.name    AS state_name,
      ci.name    AS city_name,
      edu.name   AS education_name,
      prof.name  AS profession_name,

      -- one cover photo (primary first, else newest)
      ph1.path       AS cover_path,
      ph1.is_primary AS cover_is_primary,

      -- partner preferences merged with readable arrays (all JSONB)
      (
        (SELECT to_jsonb(pp) FROM partner_preferences pp
          WHERE pp.profile_id = mp.id
          ORDER BY pp.updated_at DESC NULLS LAST
          LIMIT 1
        )
        ||
        jsonb_build_object(
          'religions',   COALESCE(pref_rl.religions,   '[]'::jsonb),
          'castes',      COALESCE(pref_ct.castes,      '[]'::jsonb),
          'countries',   COALESCE(pref_co.countries,   '[]'::jsonb),
          'states',      COALESCE(pref_st.states,      '[]'::jsonb),
          'cities',      COALESCE(pref_ci.cities,      '[]'::jsonb),
          'educations',  COALESCE(pref_ed.educations,  '[]'::jsonb),
          'professions', COALESCE(pref_pf.professions, '[]'::jsonb),
          'languages',   COALESCE(pref_lg.languages,   '[]'::jsonb)
        )
      ) AS partner_json

    FROM base mp
    LEFT JOIN religions   r    ON r.id    = mp.religion_id
    LEFT JOIN castes      c    ON c.id    = mp.caste_id
    LEFT JOIN languages   lang ON lang.id = mp.mother_tongue_id
    LEFT JOIN countries   co   ON co.id   = mp.country_id
    LEFT JOIN states      st   ON st.id   = mp.state_id
    LEFT JOIN cities      ci   ON ci.id   = mp.city_id
    LEFT JOIN educations  edu  ON edu.id  = mp.education_id
    LEFT JOIN professions prof ON prof.id = mp.profession_id

    LEFT JOIN LATERAL (
      SELECT path, is_primary
      FROM photos
      WHERE profile_id::text = mp.id::text
      ORDER BY (CASE WHEN is_primary THEN 0 ELSE 1 END), created_at DESC
      LIMIT 1
    ) ph1 ON TRUE

    -- partner pref arrays (names) → JSONB
    LEFT JOIN LATERAL (
      SELECT to_jsonb(COALESCE(array_agg(DISTINCT r2.name ORDER BY r2.name), '{}')) AS religions
      FROM pref_religions pr JOIN religions r2 ON r2.id = pr.religion_id
      WHERE pr.profile_id = mp.id
    ) pref_rl ON TRUE
    LEFT JOIN LATERAL (
      SELECT to_jsonb(COALESCE(array_agg(DISTINCT c2.name ORDER BY c2.name), '{}')) AS castes
      FROM pref_castes pc JOIN castes c2 ON c2.id = pc.caste_id
      WHERE pc.profile_id = mp.id
    ) pref_ct ON TRUE
    LEFT JOIN LATERAL (
      SELECT to_jsonb(COALESCE(array_agg(DISTINCT co2.name ORDER BY co2.name), '{}')) AS countries
      FROM pref_countries pco JOIN countries co2 ON co2.id = pco.country_id
      WHERE pco.profile_id = mp.id
    ) pref_co ON TRUE
    LEFT JOIN LATERAL (
      SELECT to_jsonb(COALESCE(array_agg(DISTINCT s2.name ORDER BY s2.name), '{}')) AS states
      FROM pref_states ps JOIN states s2 ON s2.id = ps.state_id
      WHERE ps.profile_id = mp.id
    ) pref_st ON TRUE
    LEFT JOIN LATERAL (
      SELECT to_jsonb(COALESCE(array_agg(DISTINCT ci2.name ORDER BY ci2.name), '{}')) AS cities
      FROM pref_cities pci JOIN cities ci2 ON ci2.id = pci.city_id
      WHERE pci.profile_id = mp.id
    ) pref_ci ON TRUE
    LEFT JOIN LATERAL (
      SELECT to_jsonb(COALESCE(array_agg(DISTINCT e2.name ORDER BY e2.name), '{}')) AS educations
      FROM pref_educations pe JOIN educations e2 ON e2.id = pe.education_id
      WHERE pe.profile_id = mp.id
    ) pref_ed ON TRUE
    LEFT JOIN LATERAL (
      SELECT to_jsonb(COALESCE(array_agg(DISTINCT p2.name ORDER BY p2.name), '{}')) AS professions
      FROM pref_professions pp2 JOIN professions p2 ON p2.id = pp2.profession_id
      WHERE pp2.profile_id = mp.id
    ) pref_pf ON TRUE
    LEFT JOIN LATERAL (
      SELECT to_jsonb(COALESCE(array_agg(DISTINCT lg.name ORDER BY lg.name), '{}')) AS languages
      FROM pref_languages plg JOIN languages lg ON lg.id = plg.language_id
      WHERE plg.profile_id = mp.id
    ) pref_lg ON TRUE
  `;

  let lastError = null;
  let row = null;
  let tableUsed = null;

  for (const table of SAFE_TABLES) {
    try {
      const { rows } = await query(buildSql(table), [matri]);
      if (rows?.length) { row = rows[0]; tableUsed = table; break; }
    } catch (e) {
      if (e?.code === '42P01') continue; // table not found in this env
      lastError = e; break;
    }
  }

  if (!row && !lastError) return NextResponse.json({ error: 'Profile not found' }, { status: 404 });
  if (!row) {
    return NextResponse.json(
      { error: 'DB_ERROR', code: lastError?.code || null, detail: lastError?.detail || lastError?.message || 'Unknown DB error' },
      { status: 500 }
    );
  }

  // computed age fallback
  let age = row.age ?? null;
  if (!age && row.dob) {
    try {
      const d = new Date(row.dob);
      if (!Number.isNaN(d)) {
        const now = new Date();
        age = now.getFullYear() - d.getFullYear()
          - (now < new Date(now.getFullYear(), d.getMonth(), d.getDate()) ? 1 : 0);
      }
    } catch {}
  }

  const photoUrl = safePhotoUrl(row.cover_path ?? null);
  const raasiVal = row.rash ?? row.raasi ?? row.rashi ?? null;

  return NextResponse.json({
    id: row.id ?? row.profile_id ?? null,
    _table: tableUsed,

    // identity
    matri_id: row.matri_id,
    first_name: row.first_name ?? null,
    last_name: row.last_name ?? null,
    name: `${(row.first_name ?? '').trim()} ${(row.last_name ?? '').trim()}`.trim() || row.name || 'User',

    // basics
    age,
    dob: row.dob ?? null,
    gender: row.gender ?? null,
    height_cm: row.height_cm ?? row.height ?? null,
    weight_kg: row.weight_kg ?? null,
    marital_status: row.marital_status ?? row.maritalstatus ?? null,

    // ids
    religion_id: row.religion_id ?? null,
    caste_id: row.caste_id ?? null,
    mother_tongue_id: row.mother_tongue_id ?? null,
    country_id: row.country_id ?? null,
    state_id: row.state_id ?? null,
    city_id: row.city_id ?? null,
    education_id: row.education_id ?? null,
    profession_id: row.profession_id ?? null,

    // names
    religion: row.religion_name ?? null,
    caste: row.caste_name ?? null,
    mother_tongue: row.mother_tongue_name ?? null,
    country: row.country_name ?? null,
    state: row.state_name ?? null,
    city: row.city_name ?? null,
    education: row.education_name ?? null,
    profession: row.job_role ?? row.profession_name ?? null,

    // astro
    star: row.star ?? null,
    raasi: raasiVal,
    rashi: raasiVal,

    // photo
    photo_url: photoUrl,
    photo_is_primary: !!row.cover_is_primary,

    // partner prefs (JSONB with arrays of names)
    partner_json: row.partner_json ?? null,
  });
}
