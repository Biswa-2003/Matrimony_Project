import { query } from "@/lib/db";
import jwt from "jsonwebtoken";
import { cookies } from "next/headers";
import { userIsPremium } from "@/lib/subscriptions";
import SendInterestButton from "./SendInterestButton";
import ShortlistButton from "./ShortlistButton";
import ViewContactButton from "./ViewContactButton";
import ProfileGlobalStyles from "./ProfileGlobalStyles";

export const dynamic = "force-dynamic";
export const revalidate = 0;

/* helpers */
function cmToFeetInches(cm) {
  const n = Number(cm);
  if (!n || Number.isNaN(n)) return "—";
  const total = Math.round(n / 2.54);
  const ft = Math.floor(total / 12);
  const inch = total % 12;
  return `${ft}ft ${inch}in`;
}
const text = (v, fb = "—") =>
  v === null || v === undefined || String(v).trim() === "" ? fb : String(v).trim();

function ageFromDob(dob) {
  if (!dob) return null;
  const d = new Date(dob);
  if (Number.isNaN(d.getTime())) return null;
  const now = new Date();
  let a = now.getFullYear() - d.getFullYear();
  const m = now.getMonth() - d.getMonth();
  if (m < 0 || (m === 0 && now.getDate() < d.getDate())) a--;
  return a >= 0 && a <= 120 ? a : null;
}

/* auth via cookie (SSR, Next 15 -> async) */
async function getUserIdFromCookieSSR() {
  const c = await cookies();
  const token =
    c.get("token")?.value ||
    c.get("auth_token")?.value ||
    c.get("auth")?.value ||
    null;
  const secret = process.env.JWT_SECRET;
  if (!token || !secret) return null;
  try {
    const dec = jwt.verify(token, secret);
    return dec?.id ?? dec?.userId ?? null;
  } catch {
    return null;
  }
}

/* ------------------------- data load ------------------------- */
async function loadProfileByMatriId(matriId) {
  const sql = `
    SELECT
      mp.*,
      CAST(date_part('year', age(mp.dob)) AS int) AS age_years,

      r.name  AS religion_name,
      c.name  AS caste_name,
      ci.name AS city_name, s.name AS state_name, co.name AS country_name,
      e.name  AS education_name,
      p.name  AS profession_name,

      pth.path AS photo_url,

      -- Lifestyle lists
      langs.languages,
      hobs.hobbies,

      -- Partner prefs merged with arrays (JSONB everywhere)
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

    FROM matrimony_profiles mp
    LEFT JOIN religions  r ON r.id = mp.religion_id
    LEFT JOIN castes     c ON c.id = mp.caste_id
    LEFT JOIN cities    ci ON ci.id = mp.city_id
    LEFT JOIN states     s ON s.id = mp.state_id
    LEFT JOIN countries co ON co.id = mp.country_id
    LEFT JOIN educations e ON e.id = mp.education_id
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
      SELECT COALESCE(array_agg(l.name ORDER BY l.name), '{}') AS languages
      FROM profile_languages pl
      JOIN languages l ON l.id = pl.language_id
      WHERE pl.profile_id = mp.id
    ) langs ON TRUE

    LEFT JOIN LATERAL (
      SELECT COALESCE(array_agg(h.name ORDER BY h.name), '{}') AS hobbies
      FROM profile_hobbies phh
      JOIN hobbies h ON h.id = phh.hobby_id
      WHERE phh.profile_id = mp.id
    ) hobs ON TRUE

    -- partner pref arrays -> JSONB
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

    WHERE LOWER(mp.matri_id) = LOWER($1)
    LIMIT 1
  `;
  const { rows } = await query(sql, [String(matriId || "").trim()]);
  return rows[0] || null;
}

async function loadProfileByUserId(userId) {
  const sql = `
    SELECT
      mp.*,
      CAST(date_part('year', age(mp.dob)) AS int) AS age_years,
      r.name  AS religion_name,
      c.name  AS caste_name,
      co.name AS country_name,
      s.name  AS state_name,
      ci.name AS city_name,
      e.name  AS education_name,
      p.name  AS profession_name,
      langs.languages,
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
    FROM matrimony_profiles mp
    LEFT JOIN religions   r ON r.id = mp.religion_id
    LEFT JOIN castes      c ON c.id = mp.caste_id
    LEFT JOIN countries  co ON co.id = mp.country_id
    LEFT JOIN states      s ON s.id = mp.state_id
    LEFT JOIN cities     ci ON ci.id = mp.city_id
    LEFT JOIN educations  e ON e.id = mp.education_id
    LEFT JOIN professions p ON p.id = mp.profession_id

    LEFT JOIN LATERAL (
      SELECT COALESCE(array_agg(l.name ORDER BY l.name), '{}') AS languages
      FROM profile_languages pl
      JOIN languages l ON l.id = pl.language_id
      WHERE pl.profile_id = mp.id
    ) langs ON TRUE

    -- partner pref arrays -> JSONB
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

    WHERE mp.user_id = $1
    LIMIT 1
  `;
  const { rows } = await query(sql, [userId]);
  return rows[0] || null;
}

/* ---------------------- matching logic ---------------------- */
const normalizeList = (v) =>
  Array.isArray(v) ? v.filter(Boolean) : v ? [String(v)] : [];

function inRange(n, min, max) {
  if (n == null) return false;
  if (min != null && n < min) return false;
  if (max != null && n > max) return false;
  return true;
}
function anyOrIncludes(list, value) {
  const arr = normalizeList(list);
  if (!arr.length) return { considered: false, pass: true };
  const ok =
    value != null &&
    arr.map((s) => String(s).toLowerCase()).includes(String(value).toLowerCase());
  return { considered: true, pass: !!ok };
}
function anyOrIntersects(list, values) {
  const arr = normalizeList(list);
  if (!arr.length) return { considered: false, pass: true };
  const vs = normalizeList(values).map((s) => String(s).toLowerCase());
  const ok = arr.some((a) => vs.includes(String(a).toLowerCase()));
  return { considered: true, pass: ok };
}

function evaluateAgainst(profile, prefs) {
  const checks = [];

  const age = profile.age_years ?? ageFromDob(profile.dob);
  const ageConsidered = prefs?.min_age != null || prefs?.max_age != null;
  checks.push({
    label: "Age",
    pass: ageConsidered ? inRange(age, prefs?.min_age ?? null, prefs?.max_age ?? null) : true,
    considered: !!ageConsidered,
  });

  const htConsidered = prefs?.min_height_cm != null || prefs?.max_height_cm != null;
  checks.push({
    label: "Height",
    pass: htConsidered ? inRange(profile.height_cm ?? null, prefs?.min_height_cm ?? null, prefs?.max_height_cm ?? null) : true,
    considered: !!htConsidered,
  });

  const rel = anyOrIncludes(prefs?.religions, profile.religion_name);
  checks.push({ label: "Religion", pass: rel.pass, considered: rel.considered });

  const cas = anyOrIncludes(prefs?.castes, profile.caste_name);
  checks.push({ label: "Caste", pass: cas.pass, considered: cas.considered });

  const mt = anyOrIntersects(prefs?.languages, profile.languages || []);
  checks.push({ label: "Mother Tongue", pass: mt.pass, considered: mt.considered });

  const edu = anyOrIncludes(prefs?.educations, profile.education_name);
  checks.push({ label: "Education", pass: edu.pass, considered: edu.considered });

  const occ = anyOrIncludes(
    prefs?.professions,
    profile.profession_name || profile.job || profile.job_role
  );
  checks.push({ label: "Occupation", pass: occ.pass, considered: occ.considered });

  const incomeConsidered = prefs?.min_income_inr != null;
  const incomePass =
    profile.annual_income_inr != null &&
    Number(profile.annual_income_inr) >= Number(prefs?.min_income_inr || 0);
  checks.push({
    label: "Annual Income",
    pass: incomeConsidered ? incomePass : true,
    considered: !!incomeConsidered,
  });

  const co = anyOrIncludes(prefs?.countries, profile.country_name);
  checks.push({ label: "Country", pass: co.pass, considered: co.considered });

  // Manglik
  const prefMang = prefs?.is_manglik;
  const myMang = (() => {
    const s = String(profile.manglik ?? "").toLowerCase();
    if (["yes", "y", "true", "1"].includes(s)) return true;
    if (["no", "n", "false", "0"].includes(s)) return false;
    return null;
  })();
  const mangConsidered = typeof prefMang === "boolean";
  const mangPass = mangConsidered ? myMang === prefMang : true;
  checks.push({ label: "Manglik", pass: mangPass, considered: mangConsidered });

  const diet = anyOrIncludes(prefs?.diet_in, profile.diet);
  checks.push({ label: "Diet", pass: diet.pass, considered: diet.considered });
  const drink = anyOrIncludes(prefs?.drinking_in, profile.drinking);
  checks.push({ label: "Drinking", pass: drink.pass, considered: drink.considered });
  const smoke = anyOrIncludes(prefs?.smoking_in, profile.smoking);
  checks.push({ label: "Smoking", pass: smoke.pass, considered: smoke.considered });

  const considered = checks.filter((c) => c.considered);
  const score = considered.filter((c) => c.pass).length;
  const total = considered.length;

  return { score, total, checks };
}

/* Match UI */
function MatchBlock({ title, result }) {
  if (!result) return null;
  const { score, total, checks } = result;

  return (
    <div className="card pe-card mb-4">
      <div className="card-header bg-white fw-bold text-maroon">{title}</div>
      <div className="card-body">
        <div className="d-flex align-items-center mb-3">
          <div className="display-4 fw-bold text-primary me-3">
            {score}/{total}
          </div>
          <div>
            <h6 className="mb-0 fw-bold">Compatibility Score</h6>
            <small className="text-muted">Based on Partner Preferences</small>
          </div>
        </div>

        <ul className="list-group list-group-flush">
          {checks.map((c, i) => (
            <li key={i} className="list-group-item d-flex justify-content-between align-items-center px-0">
              <span>{c.label}</span>
              {c.considered ? (
                c.pass ? (
                  <span className="badge bg-success-subtle text-success rounded-pill">Matched</span>
                ) : (
                  <span className="badge bg-danger-subtle text-danger rounded-pill">Mis-match</span>
                )
              ) : (
                <span className="badge bg-light text-muted rounded-pill">Not Specified</span>
              )}
            </li>
          ))}
        </ul>
      </div>
    </div>
  );
}

/* --------------------------- page --------------------------- */

async function checkConnectionStatus(meId, themId) {
  if (!meId || !themId) return "none";
  // check accepted
  const sql = `
    SELECT status, from_profile FROM interests 
    WHERE (from_profile = $1 AND to_profile = $2)
       OR (from_profile = $2 AND to_profile = $1)
    ORDER BY  
      CASE WHEN status='accepted' THEN 1 ELSE 2 END,
      updated_at DESC
    LIMIT 1
  `;
  const { rows } = await query(sql, [meId, themId]);
  if (!rows.length) return "none";
  const r = rows[0];
  if (r.status === 'accepted') return 'accepted';
  if (r.status === 'sent') {
    // if from_profile == me => sent
    // if from_profile == them => received? (But button logic handles 'sent' as 'I sent')
    // For now return 'sent' if I sent it, or maybe just return the raw status and let component handle?
    // The component expects "sent", "accepted", "rejected".
    if (String(r.from_profile) === String(meId)) return 'sent';
    // If they sent it, for the button it might mean "Respond"? 
    // But for photo unlock, only "accepted" matters.
    return 'none'; // effectively
  }
  return r.status;
}

/* --------------------------- page --------------------------- */

export default async function ProfileDetailsPage({ params }) {
  const { matri_id } = await params;

  const row = await loadProfileByMatriId(matri_id);
  if (!row) {
    return (
      <>
        <div className="container py-5">
          <div className="alert alert-warning shadow-sm border-0">Profile not found.</div>
        </div>
      </>
    );
  }

  // who is viewing?
  const viewerUserId = await getUserIdFromCookieSSR();
  const viewerIsPremium = viewerUserId
    ? await userIsPremium(viewerUserId)
    : false;
  const targetUserId = row.user_id; // from mp.*
  const targetIsPremium = targetUserId
    ? await userIsPremium(targetUserId)
    : false;

  // Insert profile view (if logged in and not self)
  if (viewerUserId && viewerUserId !== targetUserId) {
    // Fire and forget (optional: await it)
    await query(
      `INSERT INTO profile_views (viewer_id, viewed_id, viewed_at) VALUES ($1, $2, NOW())
       ON CONFLICT (viewer_id, viewed_id) DO UPDATE SET viewed_at = NOW()`,
      [viewerUserId, targetUserId]
    ).catch(e => console.error('Failed to log profile view', e));
  }

  // Check connection
  const connectionStatus = await checkConnectionStatus(viewerUserId, targetUserId);
  const isConnected = connectionStatus === 'accepted';

  const displayName =
    (row.first_name || row.last_name
      ? `${row.first_name ?? ""} ${row.last_name ?? ""}`.trim()
      : row.matri_id) || "Profile";
  const heightText =
    row.height_cm != null ? cmToFeetInches(row.height_cm) : "—";
  const location = [row.city_name, row.state_name, row.country_name || "India"]
    .filter(Boolean)
    .join(", ");

  // 🔒 if viewer is FREE and this member is PREMIUM → show locked view (unless connected?)
  // Usually premium details are hidden unless connected or premium.
  // If connected, we should arguably show details.
  const hideDetailsForViewer = !viewerIsPremium && targetIsPremium && !isConnected;

  if (hideDetailsForViewer) {
    return (
      <>
        <div className="profile-surface py-4">
          <div className="container py-4">
            <div className="d-flex align-items-center justify-content-between mb-3">
              <h4 className="mb-0 fw-bold text-maroon">
                {displayName}{" "}
                <span className="text-muted fw-normal fs-6">[{row.matri_id}]</span>{" "}
                <span className="badge bg-primary ms-2 fs-6">Premium Member</span>
              </h4>
              <a
                href="/dashboard/myhome"
                className="btn btn-outline-secondary btn-sm"
              >
                Back
              </a>
            </div>

            <div className="row g-4">
              <div className="col-12 col-md-4">
                <div
                  className="pe-card p-2 d-flex align-items-center justify-content-center bg-white"
                  style={{
                    width: "100%",
                    height: 380,
                    overflow: "hidden",
                  }}
                >
                  {row.photo_url ? (
                    <img
                      src={row.photo_url}
                      alt={displayName}
                      className="rounded-3"
                      style={{
                        width: "100%",
                        height: "100%",
                        objectFit: "cover",
                        filter: "blur(8px)",
                      }}
                    />
                  ) : (
                    <div className="text-muted">Premium photo</div>
                  )}
                </div>
              </div>

              <div className="col-12 col-md-8">
                <div className="card pe-card h-100 d-flex flex-column justify-content-center">
                  <div className="card-body text-center p-5">
                    <div className="mb-4">
                      <span className="d-inline-flex align-items-center justify-content-center bg-warning-subtle text-warning rounded-circle" style={{ width: 60, height: 60 }}>
                        <i className="bi bi-lock-fill fs-3"></i>
                      </span>
                    </div>
                    <h3 className="mb-3 fw-bold text-dark">Premium Content Locked</h3>
                    <p className="mb-4 text-muted mx-auto" style={{ maxWidth: 500 }}>
                      You&apos;re viewing a{" "}
                      <strong>Premium member</strong>. Upgrade your membership to view their full profile details, photos, and contact information.
                    </p>

                    <div className="d-flex gap-3 justify-content-center">
                      <a
                        href="/matrimoney/package"
                        className="btn btn-primary px-4 py-2 fw-bold"
                      >
                        View Plans &amp; Upgrade
                      </a>
                      <a
                        href="/dashboard/myhome"
                        className="btn btn-outline-secondary px-4 py-2"
                      >
                        Back to Home
                      </a>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
        <ProfileGlobalStyles />
      </>
    );
  }

  // viewer is premium OR target is not premium OR connected → show full details + matching
  const viewer = viewerUserId ? await loadProfileByUserId(viewerUserId) : null;

  const youVsThem =
    viewer && row.partner_json ? evaluateAgainst(viewer, row.partner_json) : null;
  const themVsYou =
    viewer && viewer.partner_json ? evaluateAgainst(row, viewer.partner_json) : null;

  // Decide blur
  const shouldBlur = row.photo_locked && viewerUserId !== targetUserId && !isConnected;

  return (
    <>
      <div className="profile-surface py-4">
        <div className="container py-4">
          {/* Header */}
          <div className="d-flex align-items-center justify-content-between mb-4">
            <h4 className="mb-0 fw-bold text-maroon">
              {displayName} <span className="text-muted fw-normal fs-6">[{row.matri_id}]</span>
              {targetIsPremium && (
                <span className="badge bg-primary ms-2 fs-6">Premium Member</span>
              )}
            </h4>
            <a href="/dashboard/myhome" className="btn btn-outline-secondary btn-sm">
              Back
            </a>
          </div>

          {/* Top snapshot */}
          <div className="row g-4 mb-4">
            <div className="col-12 col-md-4">
              <div
                className="pe-card p-2 d-flex align-items-center justify-content-center bg-white"
                style={{
                  width: "100%",
                  height: 380,
                  overflow: "hidden",
                }}
              >
                {row.photo_url ? (
                  <div style={{ position: "relative", width: "100%", height: "100%" }}>
                    <img
                      src={row.photo_url}
                      alt={displayName}
                      className="rounded-3"
                      style={{
                        width: "100%",
                        height: "100%",
                        objectFit: "cover",
                        filter: shouldBlur ? "blur(15px)" : "none",
                      }}
                    />
                    {shouldBlur && (
                      <div
                        className="position-absolute top-50 start-50 translate-middle d-flex flex-column align-items-center justify-content-center text-center p-3"
                        style={{
                          width: "80%",
                          background: "rgba(255,255,255,0.85)",
                          borderRadius: 12,
                          boxShadow: "0 4px 12px rgba(0,0,0,0.1)",
                        }}
                      >
                        <i className="bi bi-lock-fill text-dark fs-1 mb-2"></i>
                        <span className="fw-bold text-dark mb-1">Photo Locked</span>
                        <small className="text-muted" style={{ fontSize: "0.75rem" }}>
                          This member has chosen to keep their photo private.
                        </small>
                      </div>
                    )}
                  </div>
                ) : (
                  <div className="text-muted">No photo</div>
                )}
              </div>
            </div>

            <div className="col-12 col-md-8">
              <div className="card pe-card h-100">
                <div className="card-body p-4">
                  <h5 className="fw-bold text-maroon mb-4 border-bottom pb-2">Profile Snapshot</h5>
                  <div className="row gy-3">
                    <Field label="Gender" value={text(row.gender)} />
                    <Field
                      label="Age"
                      value={row.age_years ?? ageFromDob(row.dob) ?? "—"}
                    />
                    <Field label="Religion" value={text(row.religion_name)} />
                    <Field label="Caste" value={text(row.caste_name)} />
                    <Field
                      label="Marital Status"
                      value={text(row.marital_status)}
                    />
                    <Field label="Height" value={heightText} />
                    <Field
                      label="Weight"
                      value={
                        row.weight_kg != null ? `${row.weight_kg} kg` : "—"
                      }
                    />
                    <Field label="Location" value={location || "—"} />
                  </div>

                  <div className="mt-5 d-flex gap-3 border-top pt-4">
                    <SendInterestButton matriId={row.matri_id} />
                    <ShortlistButton matriId={row.matri_id} />
                    <ViewContactButton
                      mobile={
                        viewerIsPremium || String(viewerUserId) === String(targetUserId)
                          ? row.mobile
                          : null
                      }
                      email={
                        viewerIsPremium || String(viewerUserId) === String(targetUserId)
                          ? row.email
                          : null
                      }
                      isPremiumViewer={viewerIsPremium}
                    />
                  </div>
                </div>
              </div>
            </div>
          </div>

          <div className="row g-4">
            {/* Left Column Details */}
            <div className="col-lg-8">
              {/* About */}
              <Section title="About My Self" body={row.about_me} />
              <Section title="About My Family" body={row.about_family} />

              {/* Basic Details */}
              <InfoCard
                title="Basic Details"
                items={[
                  ["Profile created for", text(row.profile_for)],
                  ["Body Type", text(row.body_type)],
                  ["Body Complexion", text(row.complexion)],
                  ["Weight", row.weight_kg != null ? `${row.weight_kg} kg` : "—"],
                  ["Marital Status", text(row.marital_status)],
                  ["Age", row.age_years ?? ageFromDob(row.dob) ?? "—"],
                  ["Height", heightText],
                  ["Mother Tongue", (row.languages || [])[0] || "—"],
                  ["Eating Habits", text(row.diet || row.eating)],
                  ["Smoking Habits", text(row.smoking)],
                  ["Drinking Habits", text(row.drinking)],
                ]}
              />

              {/* Religion Information */}
              <InfoCard
                title="Religion Information"
                items={[
                  ["Religion", text(row.religion_name)],
                  ["Caste", text(row.caste_name)],
                  ["Gothram", text(row.gothram)],
                  ["Zodiac / Raasi", text(row.rashi)],
                  ["Star", text(row.star)],
                  ["Manglik", text(row.manglik)],
                ]}
              />

              {/* Location */}
              <InfoCard
                title="Location Details"
                items={[
                  ["Country", text(row.country_name || "India")],
                  ["State", text(row.state_name)],
                  ["City / Town", text(row.city_name)],
                ]}
              />

              {/* Professional Information */}
              <InfoCard
                title="Education & Career"
                items={[
                  ["Education", text(row.education_name)],
                  ["College / Institution", text(row.college)],
                  ["Education in Detail", text(row.education_detail)],
                  ["Employed in", text(row.employed_in)],
                  [
                    "Occupation",
                    text(row.profession_name || row.job || row.job_role),
                  ],
                  ["Occupation in Detail", text(row.job_role)],
                  ["Annual Income", text(row.annual_income_inr)],
                ]}
              />

              {/* Family Details */}
              <InfoCard
                title="Family Details"
                items={[
                  ["Family Values", text(row.family_values)],
                  ["Family Type", text(row.family_type)],
                  ["Family Status", text(row.family_status)],
                  ["Father's Occupation", text(row.father_occupation)],
                  ["Mother's Occupation", text(row.mother_occupation)],
                  ["Ancestral / Family Origin", text(row.family_origin)],
                  ["Family Location", text(row.family_location)],
                  ["No of Brother(s)", text(row.no_of_brothers)],
                  ["No of Sister(s)", text(row.no_of_sisters)],
                ]}
              />

              {/* Lifestyle */}
              <InfoCard
                title="Lifestyle"
                items={[
                  ["Hobbies & Interests", (row.hobbies || []).join(", ") || "—"],
                  ["Spoken Languages", (row.languages || []).join(", ") || "—"],
                ]}
              />
            </div>

            {/* Right Column: Preferences & Matches */}
            <div className="col-lg-4">
              {/* Partner Preferences (raw) */}
              <PartnerPrefs data={row.partner_json || {}} />

              {/* Comparison blocks */}
              {viewer && (
                <>
                  <MatchBlock
                    title={`You vs ${displayName}`}
                    result={youVsThem}
                  />
                  <MatchBlock
                    title={`${displayName} vs You`}
                    result={themVsYou}
                  />
                </>
              )}
            </div>
          </div>
        </div>
      </div>
      <ProfileGlobalStyles />
    </>
  );
}

/* UI bits */
function Field({ label, value }) {
  return (
    <div className="col-12 col-sm-6">
      <div className="d-flex flex-column">
        <span className="small text-muted fw-bold text-uppercase">{label}</span>
        <span className="fw-semibold text-dark">{String(value)}</span>
      </div>
    </div>
  );
}

function Section({ title, body }) {
  return (
    <div className="card pe-card mb-4">
      <div className="card-header bg-white fw-bold text-maroon border-bottom">{title}</div>
      <div className="card-body">
        {body?.trim() ? <p className="mb-0 text-secondary">{body}</p> : <span className="text-muted fst-italic">Not provided</span>}
      </div>
    </div>
  );
}

function InfoCard({ title, items }) {
  return (
    <div className="card pe-card mb-4">
      <div className="card-header bg-white fw-bold text-maroon border-bottom">{title}</div>
      <div className="card-body">
        <div className="row gy-3">
          {items.map(([k, v]) => (
            <div className="col-12 col-sm-6" key={k}>
              <div className="d-flex flex-column">
                <span className="small text-muted fw-bold">{k}</span>
                <span className="fw-semibold text-dark">{v}</span>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

function PartnerPrefs({ data }) {
  if (!data || typeof data !== "object") return null;
  const h = (cm) => (cm ? cmToFeetInches(cm) : "—");
  const listVal = (x) =>
    Array.isArray(x) ? (x.length ? x.join(", ") : "Any") : x || "—";

  return (
    <div className="card pe-card mb-4">
      <div className="card-header bg-white fw-bold text-maroon border-bottom">Partner Preferences</div>
      <div className="card-body">
        <div className="d-flex flex-column gap-3">
          <Pref k="Age" v={`${data.min_age ?? "Any"} – ${data.max_age ?? "Any"}`} />
          <Pref k="Height" v={`${h(data.min_height_cm)} – ${h(data.max_height_cm)}`} />
          <Pref k="Religion" v={listVal(data.religions)} />
          <Pref k="Caste" v={listVal(data.castes)} />
          <Pref k="Language" v={listVal(data.languages)} />
          <Pref k="Location" v={[listVal(data.cities), listVal(data.states), listVal(data.countries)].filter(x => x !== 'Any' && x !== '—').join(', ') || 'Any'} />
          <Pref k="Education" v={listVal(data.educations)} />
          <Pref k="Occupation" v={listVal(data.professions)} />
          <Pref k="Min Income" v={data.min_income_inr ? `₹ ${data.min_income_inr}` : "—"} />
          <Pref
            k="Manglik"
            v={
              data.is_manglik === true
                ? "Yes"
                : data.is_manglik === false
                  ? "No"
                  : "Doesn't Matter"
            }
          />
          <Pref k="Diet" v={listVal(data.diet_in)} />
        </div>
      </div>
    </div>
  );
}

function Pref({ k, v }) {
  return (
    <div className="d-flex justify-content-between border-bottom pb-2">
      <span className="text-muted small fw-bold">{k}</span>
      <span className="text-dark fw-semibold text-end" style={{ maxWidth: '60%' }}>{String(v)}</span>
    </div>
  );
}

