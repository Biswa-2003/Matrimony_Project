export const runtime = "nodejs";
export const dynamic = "force-dynamic";

import { NextResponse } from "next/server";
import { query } from "@/lib/db";
import { getUserIdFromCookie } from "@/lib/auth";
import { v4 as uuidv4 } from "uuid";

const PROFILES = "matrimony_profiles";

/* ----------------------------- tiny utilities ----------------------------- */
const num = (v) => {
  if (v === "" || v === undefined || v === null) return null;
  const s = String(v).trim().toLowerCase();
  if (s === "nan" || s === "null" || s === "undefined") return null;
  const cleaned = s.replace(/[^\d.-]/g, "");
  if (cleaned === "" || cleaned === "-" || cleaned === "." || cleaned === "-.") return null;
  const n = Number(cleaned);
  return Number.isFinite(n) ? n : null;
};
const safeBigInt = (v) => {
  const n = num(v);
  if (n === null) return null;
  const i = Math.trunc(n);
  return Number.isFinite(i) ? i : null;
};
function toCm(v) {
  if (v == null || v === "") return null;
  const s = String(v).trim();
  if (/^\d+(\.\d+)?$/.test(s)) return Number(s);

  // Pattern 1: 5 ft 10 in
  let m = s.match(/^\s{0,20}(\d{1,2})\s{0,20}ft\.?\s{0,20}(?:(\d{1,2})\s{0,20}(?:in?\.?)?)?\s{0,20}$/i);
  if (!m) {
    // Pattern 2: 5'10"
    m = s.match(/^\s{0,20}(\d{1,2})\s{0,20}'\s{0,20}(?:(\d{1,2})\s{0,20}"?\s{0,20})?$/);
  }

  if (!m) return null;
  const ft = Number(m[1] || 0);
  const inch = Number(m[2] || 0);
  return Math.round((ft * 12 + inch) * 2.54);
}
const clean = (s) => (s !== undefined ? String(s).trim() : undefined);
const asArray = (v) =>
  Array.isArray(v) ? v : v == null || v === "" ? [] : String(v).split(",").map((x) => x.trim()).filter(Boolean);

/* ---------------------- height code helpers ------------------------------- */
const HEIGHT_CODES = [
  "4ft0in", "4ft1in", "4ft2in", "4ft3in", "4ft4in", "4ft5in", "4ft6in", "4ft7in", "4ft8in", "4ft9in", "4ft10in", "4ft11in",
  "5ft0in", "5ft1in", "5ft2in", "5ft3in", "5ft4in", "5ft5in", "5ft6in", "5ft7in", "5ft8in", "5ft9in", "5ft10in", "5ft11in",
  "6ft0in", "6ft1in", "6ft2in", "6ft3in", "6ft4in", "6ft5in", "6ft6in", "6ft7in", "6ft8in", "6ft9in", "6ft10in", "6ft11in",
  "7ft0in"
];
function toHeightCode(v) {
  if (v == null || v === "") return null;
  let s = String(v).toLowerCase().trim();
  const cmMatch = s.match(/^(\d+(?:\.\d+)?)\s*cm$/i) || (/^\d+(\.\d+)?$/.test(s) ? [null, s] : null);
  if (cmMatch) return cmToCode(Number(cmMatch[1]));
  s = s.replace(/feet|foot/g, "ft").replace(/inches|inch/g, "in");
  s = s.replace(/['"]/g, "").replace(/\s+/g, "");
  if (/^\d+ft\d+$/.test(s)) s += "in";
  return HEIGHT_CODES.includes(s) ? s : null;
}
function codeToCm(code) {
  if (!code) return null;
  const m = String(code).match(/^(\d+)ft(\d+)in$/i);
  if (!m) return null;
  const ft = Number(m[1]), inch = Number(m[2]);
  return Math.round((ft * 12 + inch) * 2.54);
}
function cmToCode(cm) {
  if (cm == null) return null;
  const totalIn = Math.round(Number(cm) / 2.54);
  const ft = Math.floor(totalIn / 12);
  const inch = Math.max(0, totalIn - ft * 12);
  const code = `${ft}ft${inch}in`;
  if (HEIGHT_CODES.includes(code)) return code;
  const idx = HEIGHT_CODES.findIndex((c) => c === code);
  return idx >= 0 ? HEIGHT_CODES[idx] : HEIGHT_CODES[Math.min(HEIGHT_CODES.length - 1, Math.max(0, ft * 12 + inch - 48))];
}

/* --------------------- DDL helpers (safe & idempotent) -------------------- */
async function ensureColumn(column, sqlType, defaultExpr) {
  const def = defaultExpr ? ` DEFAULT ${defaultExpr}` : "";
  await query(`ALTER TABLE ${PROFILES} ADD COLUMN IF NOT EXISTS ${column} ${sqlType}${def}`);
}
async function tableExists(table) {
  const { rows } = await query(
    `SELECT 1 FROM information_schema.tables
     WHERE table_schema='public' AND table_name=$1 LIMIT 1`,
    [table]
  );
  return !!rows.length;
}

/* ----------------------- case-insensitive unique indexes ------------------ */
async function ensureMasterIndexes() {
  await query(`
    DO $$
    BEGIN
      IF NOT EXISTS (SELECT 1 FROM pg_indexes WHERE indexname='religions_name_ci_ux')
      THEN CREATE UNIQUE INDEX religions_name_ci_ux ON religions (LOWER(name)); END IF;

      IF NOT EXISTS (SELECT 1 FROM pg_indexes WHERE indexname='castes_rel_name_ci_ux')
      THEN CREATE UNIQUE INDEX castes_rel_name_ci_ux ON castes (religion_id, LOWER(name)); END IF;

      IF NOT EXISTS (SELECT 1 FROM pg_indexes WHERE indexname='countries_name_ci_ux')
      THEN CREATE UNIQUE INDEX countries_name_ci_ux ON countries (LOWER(name)); END IF;

      IF NOT EXISTS (SELECT 1 FROM pg_indexes WHERE indexname='states_country_name_ci_ux')
      THEN CREATE UNIQUE INDEX states_country_name_ci_ux ON states (country_id, LOWER(name)); END IF;

      IF NOT EXISTS (SELECT 1 FROM pg_indexes WHERE indexname='cities_state_name_ci_ux')
      THEN CREATE UNIQUE INDEX cities_state_name_ci_ux ON cities (state_id, LOWER(name)); END IF;

      IF NOT EXISTS (SELECT 1 FROM pg_indexes WHERE indexname='educations_name_ci_ux')
      THEN CREATE UNIQUE INDEX educations_name_ci_ux ON educations (LOWER(name)); END IF;

      IF NOT EXISTS (SELECT 1 FROM pg_indexes WHERE indexname='professions_name_ci_ux')
      THEN CREATE UNIQUE INDEX professions_name_ci_ux ON professions (LOWER(name)); END IF;
    END $$;
  `);
}

/* ------------------ extra geo indexes (faster flexible lookups) ----------- */
async function ensureGeoLookupIndexes() {
  await query(`
    DO $$
    BEGIN
      IF NOT EXISTS (SELECT 1 FROM pg_indexes WHERE indexname='states_name_ci_ix')
        THEN CREATE INDEX states_name_ci_ix ON states (LOWER(name)); END IF;
      IF NOT EXISTS (SELECT 1 FROM pg_indexes WHERE indexname='cities_name_ci_ix')
        THEN CREATE INDEX cities_name_ci_ix ON cities (LOWER(name)); END IF;
    END $$;
  `);
}

/* ------------------------- STRICT name→id helpers ------------------------- */
async function mustExistIdByName(table, name, extraWhereSql = "", extraParams = []) {
  if (!name) return null;
  const { rows } = await query(
    `SELECT id FROM ${table}
     WHERE LOWER(name)=LOWER($1) ${extraWhereSql} LIMIT 1`,
    [name, ...extraParams]
  );
  return rows[0]?.id || null;
}
async function getCountryId({ country_id, country_name }) {
  if (country_id) return Number(country_id);
  return await mustExistIdByName("countries", country_name);
}
async function getStateId({ state_id, state_name, country_id }) {
  if (state_id) return Number(state_id);
  return await mustExistIdByName("states", state_name, `AND ($2::int IS NULL OR country_id=$2)`, [country_id || null]);
}
async function getCityId({ city_id, city_name, state_id }) {
  if (city_id) return Number(city_id);
  return await mustExistIdByName("cities", city_name, `AND ($2::int IS NULL OR state_id=$2)`, [state_id || null]);
}
async function getReligionId({ religion_id, religion_name }) {
  if (religion_id) return Number(religion_id);
  return await mustExistIdByName("religions", religion_name);
}
async function getCasteId({ caste_id, caste_name, religion_id }) {
  if (caste_id) return Number(caste_id);
  return await mustExistIdByName("castes", caste_name, `AND ($2::int IS NULL OR religion_id=$2)`, [religion_id || null]);
}
async function getLanguageId({ id, name }) {
  if (id) return Number(id);
  return await mustExistIdByName("languages", name);
}

/* --------------------- get-or-create (upsert) helpers --------------------- */
async function getOrCreateReligionId(name) {
  if (!name) return null;
  await ensureMasterIndexes();
  const nm = name.trim();
  let { rows } = await query(`SELECT id FROM religions WHERE LOWER(name)=LOWER($1) LIMIT 1`, [nm]);
  if (rows[0]?.id) return rows[0].id;
  try {
    const ins = await query(`INSERT INTO religions(name) VALUES ($1) RETURNING id`, [nm]);
    return ins.rows[0].id;
  } catch {
    ({ rows } = await query(`SELECT id FROM religions WHERE LOWER(name)=LOWER($1) LIMIT 1`, [nm]));
    return rows[0]?.id || null;
  }
}
async function getOrCreateCasteId(name, religionId) {
  if (!name) return null;
  await ensureMasterIndexes();
  const nm = name.trim();

  if (religionId) {
    let { rows } = await query(
      `SELECT id FROM castes WHERE religion_id=$1 AND LOWER(name)=LOWER($2) LIMIT 1`,
      [religionId, nm]
    );
    if (rows[0]?.id) return rows[0].id;
    try {
      const ins = await query(
        `INSERT INTO castes(religion_id, name) VALUES ($1,$2) RETURNING id`,
        [religionId, nm]
      );
      return ins.rows[0].id;
    } catch {
      ({ rows } = await query(
        `SELECT id FROM castes WHERE religion_id=$1 AND LOWER(name)=LOWER($2) LIMIT 1`,
        [religionId, nm]
      ));
      return rows[0]?.id || null;
    }
  }

  const { rows } = await query(
    `SELECT id FROM castes WHERE LOWER(name)=LOWER($1) ORDER BY id LIMIT 1`,
    [nm]
  );
  return rows[0]?.id || null;
}
async function getOrCreateCountryId(name) {
  if (!name) return null;
  await ensureMasterIndexes();
  const nm = name.trim();
  let { rows } = await query(`SELECT id FROM countries WHERE LOWER(name)=LOWER($1) LIMIT 1`, [nm]);
  if (rows[0]?.id) return rows[0].id;
  try {
    const ins = await query(`INSERT INTO countries(name) VALUES ($1) RETURNING id`, [nm]);
    return ins.rows[0].id;
  } catch {
    ({ rows } = await query(`SELECT id FROM countries WHERE LOWER(name)=LOWER($1) LIMIT 1`, [nm]));
    return rows[0]?.id || null;
  }
}
async function getOrCreateStateId(name, countryId) {
  if (!name) return null;
  await ensureMasterIndexes();
  await ensureGeoLookupIndexes();
  const nm = name.trim();

  if (countryId) {
    let { rows } = await query(
      `SELECT id FROM states WHERE country_id=$1 AND LOWER(name)=LOWER($2) LIMIT 1`,
      [countryId, nm]
    );
    if (rows[0]?.id) return rows[0].id;
    try {
      const ins = await query(
        `INSERT INTO states(country_id, name) VALUES ($1,$2) RETURNING id`,
        [countryId, nm]
      );
      return ins.rows[0].id;
    } catch {
      ({ rows } = await query(
        `SELECT id FROM states WHERE country_id=$1 AND LOWER(name)=LOWER($2) LIMIT 1`,
        [countryId, nm]
      ));
      return rows[0]?.id || null;
    }
  }

  const { rows } = await query(
    `SELECT id FROM states WHERE LOWER(name)=LOWER($1) ORDER BY id LIMIT 1`,
    [nm]
  );
  return rows[0]?.id || null;
}
async function getOrCreateCityId(name, stateId) {
  if (!name) return null;
  await ensureMasterIndexes();
  await ensureGeoLookupIndexes();
  const nm = name.trim();

  if (stateId) {
    let { rows } = await query(
      `SELECT id FROM cities WHERE state_id=$1 AND LOWER(name)=LOWER($2) LIMIT 1`,
      [stateId, nm]
    );
    if (rows[0]?.id) return rows[0].id;
    try {
      const ins = await query(
        `INSERT INTO cities(state_id, name) VALUES ($1,$2) RETURNING id`,
        [stateId, nm]
      );
      return ins.rows[0].id;
    } catch {
      ({ rows } = await query(
        `SELECT id FROM cities WHERE state_id=$1 AND LOWER(name)=LOWER($2) LIMIT 1`,
        [stateId, nm]
      ));
      return rows[0]?.id || null;
    }
  }

  const { rows } = await query(
    `SELECT id FROM cities WHERE LOWER(name)=LOWER($1) ORDER BY id LIMIT 1`,
    [nm]
  );
  return rows[0]?.id || null;
}
async function getOrCreateEducationId(name) {
  if (!name) return null;
  await ensureMasterIndexes();
  const nm = name.trim();
  let { rows } = await query(`SELECT id FROM educations WHERE LOWER(name)=LOWER($1) LIMIT 1`, [nm]);
  if (rows[0]?.id) return rows[0].id;
  try {
    const ins = await query(`INSERT INTO educations(name) VALUES ($1) RETURNING id`, [nm]);
    return ins.rows[0].id;
  } catch {
    ({ rows } = await query(`SELECT id FROM educations WHERE LOWER(name)=LOWER($1) LIMIT 1`, [nm]));
    return rows[0]?.id || null;
  }
}
async function getOrCreateProfessionId(name) {
  if (!name) return null;
  await ensureMasterIndexes();
  const nm = name.trim();
  let { rows } = await query(`SELECT id FROM professions WHERE LOWER(name)=LOWER($1) LIMIT 1`, [nm]);
  if (rows[0]?.id) return rows[0].id;
  try {
    const ins = await query(`INSERT INTO professions(name) VALUES ($1) RETURNING id`, [nm]);
    return ins.rows[0].id;
  } catch {
    ({ rows } = await query(`SELECT id FROM professions WHERE LOWER(name)=LOWER($1) LIMIT 1`, [nm]));
    return rows[0]?.id || null;
  }
}

/* ------------------------- profile bootstrap/upsert ------------------------ */
async function ensureProfile(userId) {
  const s = await query(`SELECT id FROM ${PROFILES} WHERE user_id=$1 LIMIT 1`, [userId]);
  if (s.rows.length) return s.rows[0].id;

  const newId = uuidv4();
  try {
    const ins = await query(
      `INSERT INTO ${PROFILES}(id, user_id) VALUES ($1, $2) RETURNING id`,
      [newId, userId]
    );
    return ins.rows[0].id;
  } catch {
    try {
      const ins2 = await query(
        `INSERT INTO ${PROFILES}(id, user_id, first_name) VALUES ($1, $2, $3) RETURNING id`,
        [newId, userId, ""]
      );
      return ins2.rows[0].id;
    } catch {
      const ins3 = await query(
        `INSERT INTO ${PROFILES}(id, user_id, first_name, matri_id) VALUES ($1, $2, $3, $4) RETURNING id`,
        [newId, userId, "", ""]
      );
      return ins3.rows[0].id;
    }
  }
}

/* --------------------------- section processors --------------------------- */
// About
async function saveAbout(profileId, column, text) {
  await ensureColumn("about_me", "TEXT");
  await ensureColumn("about_family", "TEXT");
  const col = column === "about_myself" ? "about_me" : "about_family";
  await query(
    `UPDATE ${PROFILES}
       SET ${col} = $1,
           updated_at = NOW()
     WHERE id=$2`,
    [clean(text) ?? null, profileId]
  );
}

// Basic
async function saveBasic(profileId, data) {
  await ensureColumn("profile_for", "TEXT");
  await ensureColumn("body_type", "TEXT");
  await ensureColumn("complexion", "TEXT");
  await ensureColumn("mother_tongue_id", "INT");
  await ensureColumn("time", "TIME");
  await ensureColumn("status", "TEXT");
  await ensureColumn("height_code", "TEXT");
  await ensureColumn("height_cm", "SMALLINT");
  await ensureColumn("weight_kg", "NUMERIC(5,2)");
  await ensureColumn("marital_status", "TEXT");
  await ensureColumn("diet", "TEXT");
  await ensureColumn("smoking", "TEXT");
  await ensureColumn("drinking", "TEXT");
  await ensureColumn("dob", "DATE");

  const profileFor = clean(data.profileFor ?? data.profile_for) ?? null;
  const bodyType = clean(data.bodyType ?? data.body_type) ?? null;
  const complexion = clean(data.complexion) ?? null;
  const tongueId = await getLanguageId({ id: data.mother_tongue_id, name: clean(data.tongue) });

  const height_code = toHeightCode(data.height);
  const height_cm = height_code ? codeToCm(height_code) : null;

  await query(
    `UPDATE ${PROFILES}
     SET profile_for      = $1,
         body_type        = $2,
         complexion       = $3,
         mother_tongue_id = $4,
         time             = $5,
         status           = $6,
         height_code      = $7,
         height_cm        = COALESCE($8, height_cm),
         weight_kg        = $9,
         marital_status   = $10,
         diet             = $11,
         smoking          = $12,
         drinking         = $13,
         dob              = $14,
         updated_at       = NOW()
     WHERE id = $15`,
    [
      profileFor,
      bodyType,
      complexion,
      tongueId,
      clean(data.time) ?? null,
      clean(data.status) ?? null,
      height_code,
      height_cm,
      num(data.weight),
      clean(data.marital) ?? null,
      clean(data.eating) ?? null,
      clean(data.smoking) ?? null,
      clean(data.drinking) ?? null,
      clean(data.dob) ?? null,
      profileId,
    ]
  );
}

/* -------- Religion info (IDs or names; creates if needed) ----------------- */
async function saveReligionInfo(profileId, data) {
  await ensureColumn("religion_id", "INT");
  await ensureColumn("caste_id", "INT");
  await ensureColumn("gothram", "TEXT");
  await ensureColumn("rashi", "TEXT");
  await ensureColumn("star", "TEXT");
  await ensureColumn("manglik", "TEXT");
  await ensureMasterIndexes();

  const religionName = clean(data.religion);
  const casteName = clean(data.caste);

  let religion_id = null;
  if (data.religion_id != null && String(data.religion_id).trim() !== "") {
    const rid = Number(data.religion_id);
    religion_id = Number.isFinite(rid) ? rid : null;
  }
  if (!religion_id && religionName) {
    religion_id = await getOrCreateReligionId(religionName);
  }

  let caste_id = null;
  if (data.caste_id != null && String(data.caste_id).trim() !== "") {
    const cid = Number(data.caste_id);
    caste_id = Number.isFinite(cid) ? cid : null;
  }
  if (!caste_id && casteName && religion_id) {
    caste_id = await getOrCreateCasteId(casteName, religion_id);
  }
  if (!caste_id && casteName && !religion_id) {
    const { rows } = await query(
      `SELECT id FROM castes WHERE LOWER(name)=LOWER($1) ORDER BY id LIMIT 1`,
      [casteName]
    );
    caste_id = rows[0]?.id || null;
  }

  const gothram = clean(data.gothram ?? data.gotram) ?? null;
  const rashi = clean(data.rashi) ?? null;
  const star = clean(data.star ?? data.start) ?? null;
  const manglik = clean(data.manglik ?? data.mangalik) ?? null;

  const res = await query(
    `UPDATE ${PROFILES}
       SET religion_id = $1,
           caste_id    = $2,
           gothram     = $3,
           rashi       = $4,
           star        = $5,
           manglik     = $6,
           updated_at  = NOW()
     WHERE id=$7`,
    [religion_id || null, caste_id || null, gothram, rashi, star, manglik, profileId]
  );
  if (res.rowCount === 0) throw new Error("update-failed: no rows updated");

  const { rows } = await query(
    `SELECT religion_id, caste_id, gothram, rashi, star, manglik
       FROM ${PROFILES} WHERE id=$1 LIMIT 1`,
    [profileId]
  );
  return rows[0];
}

/* -------------------------------- Location -------------------------------- */
const parseIntOrNull = (v) => {
  const s = String(v ?? "").trim();
  return /^\d+$/.test(s) ? Number(s) : null;
};
const firstNonEmpty = (...vals) => {
  for (const v of vals) {
    const s = v == null ? "" : String(v).trim();
    if (s !== "") return s;
  }
  return null;
};
async function getStateInfoById(id) {
  const { rows } = await query("SELECT id, country_id FROM states WHERE id = $1 LIMIT 1", [id]);
  return rows[0] || null;
}
async function getStateInfoByName(name, countryId = null) {
  const { rows } = await query(
    `SELECT id, country_id
       FROM states
      WHERE LOWER(name) = LOWER($1)
        AND ($2::int IS NULL OR country_id = $2)
      ORDER BY country_id NULLS LAST
      LIMIT 1`,
    [name, countryId]
  );
  return rows[0] || null;
}
async function getCityInfoById(id) {
  const { rows } = await query("SELECT id, state_id FROM cities WHERE id = $1 LIMIT 1", [id]);
  return rows[0] || null;
}
async function getCityInfoByName(name, stateId = null) {
  const { rows } = await query(
    `SELECT id, state_id
       FROM cities
      WHERE LOWER(name) = LOWER($1)
        AND ($2::int IS NULL OR state_id = $2)
      ORDER BY state_id NULLS LAST
      LIMIT 1`,
    [name, stateId]
  );
  return rows[0] || null;
}

async function saveLocation(profileId, data) {
  await ensureColumn("country_id", "INT");
  await ensureColumn("state_id", "INT");
  await ensureColumn("city_id", "INT");
  await ensureColumn("citizenship_country_id", "INT");

  const countryName = firstNonEmpty(data.country, data.country_name);
  const stateName = firstNonEmpty(data.state, data.state_name);
  const cityName = firstNonEmpty(data.city, data.city_name);
  const citizenName = firstNonEmpty(data.citizenship, data.citizenship_country);

  let country_id = parseIntOrNull(data.country_id);
  let state_id = parseIntOrNull(data.state_id);
  let city_id = parseIntOrNull(data.city_id);
  let citizenship_country_id = parseIntOrNull(data.citizenship_country_id);

  if (!country_id && countryName) {
    country_id = await getOrCreateCountryId(countryName);
  }

  if (state_id) {
    const st = await getStateInfoById(state_id);
    if (st && !country_id && st.country_id) country_id = st.country_id;
  } else if (stateName) {
    const st = await getStateInfoByName(stateName, country_id ?? null);
    if (st) {
      state_id = st.id;
      if (!country_id && st.country_id) country_id = st.country_id;
    } else if (country_id) {
      state_id = await getOrCreateStateId(stateName, country_id);
    }
  }

  if (city_id) {
    const ct = await getCityInfoById(city_id);
    if (ct && !state_id && ct.state_id) {
      state_id = ct.state_id;
      const st = await getStateInfoById(state_id);
      if (st && !country_id && st.country_id) country_id = st.country_id;
    }
  } else if (cityName) {
    if (state_id) {
      const ct = await getCityInfoByName(cityName, state_id);
      city_id = ct ? ct.id : await getOrCreateCityId(cityName, state_id);
    } else {
      const ct = await getCityInfoByName(cityName, null);
      if (ct) {
        city_id = ct.id;
        state_id = ct.state_id;
        const st = await getStateInfoById(state_id);
        if (st && !country_id && st.country_id) country_id = st.country_id;
      }
    }
  }

  if (!citizenship_country_id && citizenName) {
    citizenship_country_id = await getOrCreateCountryId(citizenName);
  }

  const res = await query(
    `UPDATE ${PROFILES}
        SET country_id             = COALESCE($1, country_id),
            state_id               = COALESCE($2, state_id),
            city_id                = COALESCE($3, city_id),
            citizenship_country_id = COALESCE($4, citizenship_country_id),
            updated_at             = NOW()
      WHERE id = $5
      RETURNING id, country_id, state_id, city_id, citizenship_country_id`,
    [country_id, state_id, city_id, citizenship_country_id, profileId]
  );

  if (res.rowCount === 0) throw new Error("update-failed: profile not found (bad profileId)");
  return res.rows[0];
}

/* ------------------------------- Professional ----------------------------- */
export async function saveProfessional(profileId, data) {
  await ensureColumn("education_id", "INT");
  await ensureColumn("education_detail", "TEXT");
  await ensureColumn("college", "TEXT");
  await ensureColumn("profession_id", "INT");    // FK to professions
  await ensureColumn("job_role", "TEXT");
  await ensureColumn("job", "TEXT");             // keep text as fallback
  await ensureColumn("annual_income_inr", "BIGINT");

  const toIntOrNull = (v) => {
    if (v === undefined || v === null) return null;
    const s = String(v).trim();
    if (!s) return null;
    const n = Number(s);
    return Number.isInteger(n) && n > 0 ? n : null;
  };
  const cleanOrNull = (v) => {
    const c = typeof clean === "function" ? clean(v) : v;
    return c && String(c).trim() !== "" ? String(c).trim() : null;
  };
  const toBigintStringOrNull = (v) => {
    if (v === undefined || v === null) return null;
    const s = String(v).trim().replace(/[, _]/g, "");
    if (!s || !/^\d+$/.test(s)) return null;
    return s;
  };

  let education_id = toIntOrNull(data.education_id);
  if (!education_id && cleanOrNull(data.educuction)) {
    education_id = await getOrCreateEducationId(cleanOrNull(data.educuction));
  }
  if (!education_id && cleanOrNull(data.education)) {
    education_id = await getOrCreateEducationId(cleanOrNull(data.education));
  }

  let profession_id = toIntOrNull(data.profession_id);
  if (!profession_id && cleanOrNull(data.job)) {
    profession_id = await getOrCreateProfessionId(cleanOrNull(data.job)); // create in master if missing
  }
  const jobText = cleanOrNull(data.job);

  const { rows } = await query(
    `UPDATE ${PROFILES}
       SET education_id      = $1,
           college           = $2,
           education_detail  = $3,
           profession_id     = $4,
           job_role          = $5,
           annual_income_inr = $6,
           job               = $7,
           updated_at        = NOW()
     WHERE id = $8
     RETURNING id, education_id, profession_id, college, job_role, job, annual_income_inr`,
    [
      education_id,
      cleanOrNull(data.college),
      cleanOrNull(data.detail),
      profession_id,
      cleanOrNull(data.role),
      toBigintStringOrNull(data.income),
      jobText,
      profileId
    ]
  );

  if (!rows.length) throw new Error("Profile not found or not updated");
  return rows[0];
}

/* --------------------------------- Family --------------------------------- */
async function saveFamily(profileId, data) {
  await ensureColumn("family_values", "TEXT");
  await ensureColumn("family_type", "TEXT");
  await ensureColumn("family_status", "TEXT");
  await ensureColumn("family_origin", "TEXT");
  await ensureColumn("family_location", "TEXT");
  await ensureColumn("father_occupation", "TEXT");
  await ensureColumn("mother_occupation", "TEXT");
  await ensureColumn("brothers", "SMALLINT");
  await ensureColumn("sisters", "SMALLINT");

  await query(
    `UPDATE ${PROFILES}
       SET family_values  = $1,
           family_type    = $2,
           family_status  = $3,
           family_origin  = $4,
           family_location= $5,
           father_occupation = $6,
           mother_occupation = $7,
           brothers       = $8,
           sisters        = $9,
           updated_at     = NOW()
     WHERE id=$10`,
    [
      clean(data.values) ?? null,
      clean(data.type) ?? null,
      clean(data.status) ?? null,
      clean(data.origin) ?? null,
      clean(data.location) ?? null,
      clean(data.father) ?? null,
      clean(data.mother) ?? null,
      num(data.brothers),
      num(data.sisters),
      profileId,
    ]
  );
}



/* ----------- JUNCTION helpers (for partner preferences) ------------------- */
async function ensurePrefSchema() {
  await query(`CREATE TABLE IF NOT EXISTS pref_religions  (profile_id uuid REFERENCES partner_preferences(profile_id) ON DELETE CASCADE, religion_id  int REFERENCES religions(id),     PRIMARY KEY (profile_id, religion_id));`);
  await query(`CREATE TABLE IF NOT EXISTS pref_castes     (profile_id uuid REFERENCES partner_preferences(profile_id) ON DELETE CASCADE, caste_id     int REFERENCES castes(id),        PRIMARY KEY (profile_id, caste_id));`);
  await query(`CREATE TABLE IF NOT EXISTS pref_countries  (profile_id uuid REFERENCES partner_preferences(profile_id) ON DELETE CASCADE, country_id   int REFERENCES countries(id),    PRIMARY KEY (profile_id, country_id));`);
  await query(`CREATE TABLE IF NOT EXISTS pref_states     (profile_id uuid REFERENCES partner_preferences(profile_id) ON DELETE CASCADE, state_id     int REFERENCES states(id),       PRIMARY KEY (profile_id, state_id));`);
  await query(`CREATE TABLE IF NOT EXISTS pref_cities     (profile_id uuid REFERENCES partner_preferences(profile_id) ON DELETE CASCADE, city_id      int REFERENCES cities(id),        PRIMARY KEY (profile_id, city_id));`);
  await query(`CREATE TABLE IF NOT EXISTS pref_educations (profile_id uuid REFERENCES partner_preferences(profile_id) ON DELETE CASCADE, education_id int REFERENCES educations(id),  PRIMARY KEY (profile_id, education_id));`);
  await query(`CREATE TABLE IF NOT EXISTS pref_professions(profile_id uuid REFERENCES partner_preferences(profile_id) ON DELETE CASCADE, profession_id int REFERENCES professions(id), PRIMARY KEY (profile_id, profession_id));`);
  await query(`CREATE TABLE IF NOT EXISTS pref_languages  (profile_id uuid REFERENCES partner_preferences(profile_id) ON DELETE CASCADE, language_id  int REFERENCES languages(id),   PRIMARY KEY (profile_id, language_id));`);
}
const isIntLike = (s) => /^\d+$/.test(String(s ?? '').trim());

async function resolveIdsWithCreate(table, values) {
  const out = [];
  for (const raw of asArray(values)) {
    const v = String(raw ?? '').trim();
    if (!v) continue;
    if (isIntLike(v)) { out.push(Number(v)); continue; }

    let id = null;
    switch (table) {
      case 'professions': id = await getOrCreateProfessionId(v); break;
      case 'educations': id = await getOrCreateEducationId(v); break;
      case 'countries': id = await getOrCreateCountryId(v); break;
      case 'languages': id = await getLanguageId({ name: v }); break; // don’t create here
      default: id = await mustExistIdByName(table, v); break;
    }
    if (id) out.push(id);
  }
  return out;
}
async function replaceLinks(table, idColumn, profileId, ids) {
  await query(`DELETE FROM ${table} WHERE profile_id = $1`, [profileId]);
  if (ids && ids.length) {
    await query(
      `INSERT INTO ${table}(profile_id, ${idColumn})
       SELECT $1, UNNEST($2::int[])`,
      [profileId, ids]
    );
  }
}

// Parse incomes like “Rs. 10 - 15 Lakh”, “12 L”, “1 Crore”, “1200000”
function parseIncomeRange(v) {
  if (!v) return { min: null, max: null };
  const s = String(v).toLowerCase();
  const nums = (s.match(/\d+(?:\.\d+)?/g) || []).map(Number);
  if (!nums.length) return { min: null, max: null };
  const unit = s.includes("crore") ? 10_000_000 : (s.includes("lakh") || s.includes("lac")) ? 100_000 : 1;
  const min = Math.round(nums[0] * unit);
  const max = nums[1] != null ? Math.round(nums[1] * unit) : null;
  return { min, max };
}

/* ----------------------- Partner Preferences (junction write) ------------- */
async function savePartnerPref(profileId, data) {
  if (!(await tableExists("partner_preferences"))) {
    throw new Error('schema-missing: table "partner_preferences" does not exist');
  }

  await query(`ALTER TABLE partner_preferences ADD COLUMN IF NOT EXISTS pref_gender TEXT`);
  await query(`ALTER TABLE partner_preferences ADD COLUMN IF NOT EXISTS min_age SMALLINT`);
  await query(`ALTER TABLE partner_preferences ADD COLUMN IF NOT EXISTS max_age SMALLINT`);

  await query(`ALTER TABLE partner_preferences ADD COLUMN IF NOT EXISTS min_height_code TEXT`);
  await query(`ALTER TABLE partner_preferences ADD COLUMN IF NOT EXISTS max_height_code TEXT`);
  await query(`ALTER TABLE partner_preferences ADD COLUMN IF NOT EXISTS min_height_cm SMALLINT`);
  await query(`ALTER TABLE partner_preferences ADD COLUMN IF NOT EXISTS max_height_cm SMALLINT`);

  await query(`ALTER TABLE partner_preferences ADD COLUMN IF NOT EXISTS min_income_inr BIGINT`);
  await query(`ALTER TABLE partner_preferences ADD COLUMN IF NOT EXISTS max_income_inr BIGINT`);
  await query(`ALTER TABLE partner_preferences ADD COLUMN IF NOT EXISTS diet_in TEXT[]`);
  await query(`ALTER TABLE partner_preferences ADD COLUMN IF NOT EXISTS smoking_in TEXT[]`);
  await query(`ALTER TABLE partner_preferences ADD COLUMN IF NOT EXISTS drinking_in TEXT[]`);

  await query(`ALTER TABLE partner_preferences ADD COLUMN IF NOT EXISTS status TEXT`);
  await query(`ALTER TABLE partner_preferences ADD COLUMN IF NOT EXISTS physical TEXT`);

  await query(`ALTER TABLE partner_preferences ADD COLUMN IF NOT EXISTS is_manglik BOOLEAN`);
  await query(`ALTER TABLE partner_preferences ADD COLUMN IF NOT EXISTS extras JSONB`);
  await query(`ALTER TABLE partner_preferences ADD COLUMN IF NOT EXISTS updated_at TIMESTAMPTZ DEFAULT now()`);

  await ensurePrefSchema();

  const firstNonEmpty = (...vals) => {
    for (const v of vals) {
      const s = v == null ? "" : String(v).trim();
      if (s !== "") return s;
    }
    return null;
  };
  const toBoolOrNull = (v) => {
    const s = String(v ?? "").trim().toLowerCase();
    if (["yes", "y", "true", "1"].includes(s)) return true;
    if (["no", "n", "false", "0"].includes(s)) return false;
    return null;
  };

  const pref_gender = clean(firstNonEmpty(data.prefGender, data.gender)) || null;
  let min_age = num(data.ageFrom);
  let max_age = num(data.ageTo);
  if (min_age != null && max_age != null && min_age > max_age) [min_age, max_age] = [max_age, min_age];

  const min_height_code = toHeightCode(firstNonEmpty(data.heightFromCode, data.heightFrom));
  const max_height_code = toHeightCode(firstNonEmpty(data.heightToCode, data.heightTo));
  const min_height_cm = min_height_code ? codeToCm(min_height_code) : null;
  const max_height_cm = max_height_code ? codeToCm(max_height_code) : null;

  const { min: min_income_inr, max: max_income_inr } = parseIncomeRange(data.income);
  const diet_in = asArray(data.eating);
  const smoking_in = asArray(data.smoking);
  const drinking_in = asArray(data.drinking);

  const status = clean(data.status) ?? null;
  const physical = clean(data.physical) ?? null;

  const is_manglik = toBoolOrNull(firstNonEmpty(data.manglik, data.is_manglik));
  const extras = typeof data.extras === "string"
    ? (() => { try { return JSON.parse(data.extras); } catch { return null; } })()
    : (typeof data.extras === "object" ? data.extras : null);

  // Resolve/create ids for lists
  const religionIds = await resolveIdsWithCreate("religions", data.religion);
  const casteIds = await resolveIdsWithCreate("castes", data.caste);
  const countryIds = await resolveIdsWithCreate("countries", data.country);
  const stateIds = await resolveIdsWithCreate("states", data.state);
  const cityIds = await resolveIdsWithCreate("cities", data.city);
  const educationIds = await resolveIdsWithCreate("educations", data.degree);
  const professionIds = await resolveIdsWithCreate("professions", data.job);  // ★ ensure professions populated
  const languageIds = await resolveIdsWithCreate("languages", data.tongue);

  await query('BEGIN');
  try {
    await query(
      `INSERT INTO partner_preferences(
         profile_id, pref_gender, min_age, max_age,
         min_height_code, max_height_code, min_height_cm, max_height_cm,
         min_income_inr, max_income_inr,
         diet_in, smoking_in, drinking_in,
         status, physical,
         is_manglik, extras, updated_at
       ) VALUES (
         $1,$2,$3,$4,$5,$6,$7,$8,
         $9,$10,
         $11::text[],$12::text[],$13::text[],
         $14,$15,
         $16,$17,NOW()
       )
       ON CONFLICT (profile_id) DO UPDATE SET
         pref_gender     = EXCLUDED.pref_gender,
         min_age         = EXCLUDED.min_age,
         max_age         = EXCLUDED.max_age,
         min_height_code = EXCLUDED.min_height_code,
         max_height_code = EXCLUDED.max_height_code,
         min_height_cm   = EXCLUDED.min_height_cm,
         max_height_cm   = EXCLUDED.max_height_cm,
         min_income_inr  = EXCLUDED.min_income_inr,
         max_income_inr  = EXCLUDED.max_income_inr,
         diet_in         = EXCLUDED.diet_in,
         smoking_in      = EXCLUDED.smoking_in,
         drinking_in     = EXCLUDED.drinking_in,
         status          = EXCLUDED.status,
         physical        = EXCLUDED.physical,
         is_manglik      = EXCLUDED.is_manglik,
         extras          = EXCLUDED.extras,
         updated_at      = NOW()`,
      [
        profileId, pref_gender, min_age, max_age,
        min_height_code, max_height_code, min_height_cm, max_height_cm,
        min_income_inr, max_income_inr,
        diet_in, smoking_in, drinking_in,
        status, physical,
        is_manglik, extras
      ]
    );

    await replaceLinks('pref_religions', 'religion_id', profileId, religionIds);
    await replaceLinks('pref_castes', 'caste_id', profileId, casteIds);
    await replaceLinks('pref_countries', 'country_id', profileId, countryIds);
    await replaceLinks('pref_states', 'state_id', profileId, stateIds);
    await replaceLinks('pref_cities', 'city_id', profileId, cityIds);
    await replaceLinks('pref_educations', 'education_id', profileId, educationIds);
    await replaceLinks('pref_professions', 'profession_id', profileId, professionIds);
    await replaceLinks('pref_languages', 'language_id', profileId, languageIds);

    await query('COMMIT');
  } catch (e) {
    await query('ROLLBACK');
    throw e;
  }
}

/* ----------------------------------- API ---------------------------------- */
export async function POST(req) {
  try {
    const userId = await getUserIdFromCookie();
    if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const { section, data } = await req.json();
    console.log("edit-profile payload:", section, data);
    if (!section) return NextResponse.json({ error: "Missing section" }, { status: 400 });

    await ensureColumn("updated_at", "TIMESTAMPTZ", "NOW()");
    const profileId = await ensureProfile(userId);

    try {
      switch (section) {
        case "about_myself": await saveAbout(profileId, "about_myself", data); break;
        case "about_family": await saveAbout(profileId, "about_family", data); break;
        case "basic": await saveBasic(profileId, data || {}); break;
        case "religion_info": {
          const saved = await saveReligionInfo(profileId, data || {});
          return NextResponse.json({ ok: true, profile_id: profileId, saved });
        }
        case "location": await saveLocation(profileId, data || {}); break;
        case "professional": await saveProfessional(profileId, data || {}); break;
        case "family": await saveFamily(profileId, data || {}); break;
        // case "lifestyle":     await saveLifestyle(profileId, data || {}); break;
        case "partner_pref": await savePartnerPref(profileId, data || {}); break;
        default:
          return NextResponse.json({ error: `Unknown section: ${section}` }, { status: 400 });
      }
    } catch (e) {
      const msg = String(e.message || "");
      if (msg.startsWith("not found:") || msg.startsWith("schema-missing:") || msg.startsWith("update-failed:")) {
        return NextResponse.json({ error: msg }, { status: 400 });
      }
      throw e;
    }

    return NextResponse.json({ ok: true, profile_id: profileId });
  } catch (err) {
    console.error("edit-profile error:", err);
    return NextResponse.json({ error: "Server error" }, { status: 500 });
  }
}
