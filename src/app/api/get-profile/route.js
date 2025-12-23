export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

import { NextResponse } from 'next/server';
import jwt from 'jsonwebtoken';
import { query } from '@/lib/db';

/* ---------------- helpers ---------------- */
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

const pick = (o, keys, fb = undefined) => {
  for (const k of keys) {
    const v = o?.[k];
    if (v !== undefined && v !== null && String(v) !== '') return v;
  }
  return fb;
};

function deriveAgeFromDob(dobStr) {
  if (!dobStr) return '';
  const d = new Date(dobStr);
  if (Number.isNaN(d.getTime())) return '';
  const today = new Date();
  let age = today.getFullYear() - d.getFullYear();
  const m = today.getMonth() - d.getMonth();
  if (m < 0 || (m === 0 && today.getDate() < d.getDate())) age--;
  return age >= 0 && age <= 120 ? age : '';
}

/* -------------- normalizer → UI -------------- */
function normalize(row) {
  const mp = row.mp_json || {};
  const from = (keys, fb = '') => pick(row, keys, pick(mp, keys, fb));
  const joinList = (x) => (Array.isArray(x) && x.length ? x.join(', ') : '');

  const basic = {
    profileFor: from(['profile_for']),
    bodyType:   from(['body_type']),
    complexion: from(['complexion']),
    status:     from(['relationship_status', 'status']),
    weight:     from(['weight_kg', 'weight']),
    marital:    from(['marital_status', 'marital']),
    drinking:   from(['drinking']),
    smoking:    from(['smoking']),
    dob:        from(['dob']),
    time:       from(['birth_time', 'time']),
    age:        (() => {
                  const explicit = from(['age', 'age_years'], null);
                  if (explicit !== null && String(explicit).trim() !== '') {
                    const n = Number(explicit);
                    return Number.isFinite(n) ? n : '';
                  }
                  return deriveAgeFromDob(from(['dob'], null));
                })(),
    height:     from(['height_text', 'height_cm', 'height']),
    tongue:     row.mt_name || row.mt_from_pl || from(['tongue']),
    eating:     from(['diet', 'eating']),
  };

  const religionInfo = {
    religion: row.religion_name || '',
    caste:    row.caste_name || '',
    gothram:  from(['gothram']),
    rashi:    from(['rashi']),
    star:     from(['star']),
    manglik:  from(['manglik']),
  };

  const location = {
    country:     row.country_name || '',
    state:       row.state_name || '',
    city:        row.city_name || '',
    citizenship: row.citizenship_country_name || from(['citizenship']) || '',
  };

  const professional = {
    educationId:  row.education_id ?? mp.education_id ?? null,
    education:    row.education_name || from(['highest_education', 'education']) || '',
    college:      from(['college', 'institute']),
    detail:       from(['education_detail']),
    professionId: row.profession_id ?? mp.profession_id ?? null,
    job:          row.profession_name || from(['job', 'profession', 'job_title']) || '',
    role:         from(['job_role', 'role']),
    income:       from(['annual_income_inr', 'income']),
  };

  const lifestyle = {
    hobbies:   (row.hobbies || []).join(', ') || '',
    sports:    from(['sports']),
    languages: (row.languages || []).join(', ') || '',
  };

  // Partner preferences
  const pp = row.partner_json || {};
  const ppManglik =
    row.partner_is_manglik !== undefined
      ? row.partner_is_manglik
      : (typeof pp.is_manglik === 'boolean' ? pp.is_manglik : null);

  const partnerPref = {
    ageFrom:    pp.min_age ?? '',
    ageTo:      pp.max_age ?? '',
    heightFrom: pp.min_height_cm ?? '',
    heightTo:   pp.max_height_cm ?? '',
    religion:   joinList(row.pref_religions)   || joinList(pp.religions),
    caste:      joinList(row.pref_castes)      || joinList(pp.castes),
    country:    joinList(row.pref_countries)   || joinList(pp.countries),
    degree:     joinList(row.pref_educations)  || joinList(pp.educations),
    job:        joinList(row.pref_professions) || joinList(pp.professions),
    tongue:     joinList(row.pref_languages)   || pp.tongue || pp.mother_tongue || '',
    status:     pp.status ?? '',
    income:     pp.min_income_inr ?? '',
    physical:   pp.physical ?? '',
    manglikBool: ppManglik,
    manglik:     ppManglik === true ? 'yes' : ppManglik === false ? 'no' : '',
    eating:     joinList(pp.diet_in),
    drinking:   joinList(pp.drinking_in),
    smoking:    joinList(pp.smoking_in),
    extras:     pp.extras || {},
  };

  const family = {
    values:   from(['family_values']),
    type:     from(['family_type']),
    status:   from(['family_status']),
    origin:   from(['family_origin']),
    location: from(['family_location']),
    father:   from(['father_occupation']),
    mother:   from(['mother_occupation']),
    brothers: from(['no_of_brothers', 'brothers'], null),
    sisters:  from(['no_of_sisters', 'sisters'], null),
  };

  return {
    name: row.display_name || '',
    matri_id: from(['matri_id']) || '',
    mobile: row.phone || from(['mobile']) || '',
    photo: row.photo_path ? [row.photo_path] : ['default.jpg'],

    aboutMyself: row.about_myself || row.about_me || from(['about_myself', 'about_me']) || '',
    aboutFamily: row.about_family || from(['about_family']) || '',

    basic,
    religionInfo,
    location,
    professional,
    family,
    lifestyle,
    partnerPref,

    height: basic.height || '',
    religion: religionInfo.religion || '',
    caste: religionInfo.caste || '',
  };
}

/* ---------------- handler ---------------- */
export async function GET(request) {
  try {
    const token = readTokenFromRequest(request);
    if (!token) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const secret = process.env.JWT_SECRET;
    if (!secret) return NextResponse.json({ error: 'Server misconfig' }, { status: 500 });

    let decoded;
    try { decoded = jwt.verify(token, secret); }
    catch { return NextResponse.json({ error: 'Invalid token' }, { status: 401 }); }

    const userId = decoded?.id ?? decoded?.userId;
    if (!userId) return NextResponse.json({ error: 'Invalid token payload' }, { status: 401 });

    const sql = `
      SELECT
        COALESCE(NULLIF(BTRIM(CONCAT_WS(' ', u.first_name, u.last_name)), ''), u.email, 'User') AS display_name,
        mp.matri_id,
        u.phone,

        to_jsonb(mp) AS mp_json,

        pth.path AS photo_path,

        mp.about_me,
        mp.about_family,

        r.name  AS religion_name,
        c.name  AS caste_name,

        co.name      AS country_name,
        s.name       AS state_name,
        ci.name      AS city_name,
        co_cit.name  AS citizenship_country_name,

        mt.name    AS mt_name,
        pl_mt.name AS mt_from_pl,

        mp.education_id,
        e.name AS education_name,
        mp.college,
        mp.education_detail,
        mp.profession_id,
        p.name AS profession_name,
        mp.job_role,
        mp.annual_income_inr,

        pp.partner_json,
        pp.is_manglik AS partner_is_manglik,

        langs.languages,
        hobs.hobbies,

        pref_rl.religions   AS pref_religions,
        pref_ct.castes      AS pref_castes,
        pref_co.countries   AS pref_countries,
        pref_ed.educations  AS pref_educations,
        pref_pf.professions AS pref_professions,
        pref_lg.languages   AS pref_languages,

        mp.dob

      FROM matrimony_profiles mp
      JOIN users u ON u.id = mp.user_id

      LEFT JOIN religions r   ON r.id = mp.religion_id
      LEFT JOIN castes    c   ON c.id = mp.caste_id
      LEFT JOIN countries co  ON co.id = mp.country_id
      LEFT JOIN states    s   ON s.id = mp.state_id
      LEFT JOIN cities    ci  ON ci.id = mp.city_id
      LEFT JOIN countries co_cit ON co_cit.id = mp.citizenship_country_id

      LEFT JOIN educations  e ON e.id = mp.education_id
      LEFT JOIN professions p ON p.id = mp.profession_id

      LEFT JOIN LATERAL (
        SELECT ph.path
        FROM photos ph
        WHERE ph.profile_id = mp.id
        ORDER BY (CASE WHEN ph.is_primary THEN 1 ELSE 0 END) DESC,
                 ph.created_at DESC, ph.id DESC
        LIMIT 1
      ) pth ON TRUE

      LEFT JOIN LATERAL (
        SELECT pp.*, to_jsonb(pp) AS partner_json
        FROM partner_preferences pp
        WHERE pp.profile_id = mp.id
        ORDER BY pp.updated_at DESC NULLS LAST
        LIMIT 1
      ) pp ON TRUE

      LEFT JOIN LATERAL (
        SELECT COALESCE(array_agg(l.name ORDER BY l.name), '{}') AS languages
        FROM profile_languages pl
        JOIN languages l ON l.id = pl.language_id
        WHERE pl.profile_id = mp.id
      ) langs ON TRUE

      LEFT JOIN LATERAL (
        SELECT l2.name
        FROM profile_languages pl2
        JOIN languages l2 ON l2.id = pl2.language_id
        WHERE pl2.profile_id = mp.id
        ORDER BY
          (CASE LOWER(COALESCE(pl2.proficiency,'')) WHEN 'native' THEN 1 WHEN 'fluent' THEN 2 ELSE 3 END),
          l2.name
        LIMIT 1
      ) pl_mt ON TRUE

      LEFT JOIN LATERAL (
        SELECT COALESCE(array_agg(h.name ORDER BY h.name), '{}') AS hobbies
        FROM profile_hobbies phh
        JOIN hobbies h ON h.id = phh.hobby_id
        WHERE phh.profile_id = mp.id
      ) hobs ON TRUE

      LEFT JOIN LATERAL (
        SELECT COALESCE(array_agg(DISTINCT r.name ORDER BY r.name), '{}') AS religions
        FROM pref_religions pr
        JOIN religions r ON r.id = pr.religion_id
        WHERE pr.profile_id = mp.id
      ) pref_rl ON TRUE

      LEFT JOIN LATERAL (
        SELECT COALESCE(array_agg(DISTINCT c.name ORDER BY c.name), '{}') AS castes
        FROM pref_castes pc
        JOIN castes c ON c.id = pc.caste_id
        WHERE pc.profile_id = mp.id
      ) pref_ct ON TRUE

      LEFT JOIN LATERAL (
        SELECT COALESCE(array_agg(DISTINCT co.name ORDER BY co.name), '{}') AS countries
        FROM pref_countries pco
        JOIN countries co ON co.id = pco.country_id
        WHERE pco.profile_id = mp.id
      ) pref_co ON TRUE

      LEFT JOIN LATERAL (
        SELECT COALESCE(array_agg(DISTINCT e.name ORDER BY e.name), '{}') AS educations
        FROM pref_educations pe
        JOIN educations e ON e.id = pe.education_id
        WHERE pe.profile_id = mp.id
      ) pref_ed ON TRUE

      LEFT JOIN LATERAL (
        SELECT COALESCE(array_agg(DISTINCT pf.name ORDER BY pf.name), '{}') AS professions
        FROM pref_professions pp2
        JOIN professions pf ON pf.id = pp2.profession_id
        WHERE pp2.profile_id = mp.id
      ) pref_pf ON TRUE

      -- NEW: partner preferred languages
      LEFT JOIN LATERAL (
        SELECT COALESCE(array_agg(DISTINCT lg.name ORDER BY lg.name), '{}') AS languages
        FROM pref_languages plg
        JOIN languages lg ON lg.id = plg.language_id
        WHERE plg.profile_id = mp.id
      ) pref_lg ON TRUE

      LEFT JOIN languages mt ON mt.id = mp.mother_tongue_id
      WHERE mp.user_id = $1
      LIMIT 1
    `;

    let row;
    try {
      const r = await query(sql, [userId]);
      row = r.rows?.[0] || null;
    } catch (e) {
      console.error('get-profile query failed:', e);
      return NextResponse.json({ error: 'DB error' }, { status: 500 });
    }

    if (!row) {
      return NextResponse.json({
        profile: {
          aboutMyself: '', aboutFamily: '',
          basic: {}, religionInfo: {}, location: {},
          professional: {}, family: {}, lifestyle: {}, partnerPref: {},
          height: '', religion: '', caste: '',
          name: '', matri_id: '', mobile: '', photo: ['default.jpg'],
        }
      }, { status: 200 });
    }

    const profile = normalize(row);
    return NextResponse.json({ profile }, { status: 200 });

  } catch (err) {
    console.error('get-profile unexpected failure:', err);
    return NextResponse.json({ error: 'Server Error' }, { status: 500 });
  }
}
   