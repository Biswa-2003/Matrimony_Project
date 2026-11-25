import { query } from "@/lib/db";
import jwt from "jsonwebtoken";
import { cookies } from "next/headers";
import { userIsPremium } from "@/lib/subscriptions";
import SendInterestButton from "./SendInterestButton";
import ShortlistButton from "./ShortlistButton";
import ViewContactButton from "./ViewContactButton";
import ProfileGlobalStyles from "./ProfileGlobalStyles";
import ProfileSafetyActions from "./ProfileSafetyActions";
import SimilarProfiles from "./SimilarProfiles";
import HoroscopeCard from "./HoroscopeCard";
import PhotoRequestButton from "./PhotoRequestButton";
import ShareProfileButton from "./ShareProfileButton";
import { photoUrl } from "@/lib/members";
import SafeImage from "@/app/components/SafeImage";
import { isBlockedBetween } from "@/lib/schema";

import { verifyLogin } from "@/lib/auth";
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
// Short all-lowercase values from forms/lookups ("india", "odia", "no") read better capitalised.
const tidy = (s) =>
  s.length <= 40 && s === s.toLowerCase() && /^[a-z][a-z\s\-/&,.]*$/.test(s)
    ? s.replace(/(^|[\s\-/&,])([a-z])/g, (m, sep, c) => sep + c.toUpperCase())
    : s;
const text = (v, fb = "—") =>
  v === null || v === undefined || String(v).trim() === "" ? fb : tidy(String(v).trim());

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
    const dec = await verifyLogin(token);
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
  const pct = total ? Math.round((score / total) * 100) : 0;
  const r = 34;
  const c = 2 * Math.PI * r;

  return (
    <div className="card pe-card mb-4">
      <div className="card-header">{title}</div>
      <div className="card-body">
        {total === 0 ? (
          <p className="small text-muted mb-0">
            No partner preferences set yet, so compatibility can&apos;t be calculated.
          </p>
        ) : (
          <>
            <div className="d-flex align-items-center gap-3 mb-3">
              <div className="position-relative" style={{ width: 84, height: 84 }}>
                <svg width="84" height="84" viewBox="0 0 84 84" style={{ transform: "rotate(-90deg)" }}>
                  <circle cx="42" cy="42" r={r} fill="none" stroke="#f3e8d6" strokeWidth="8" />
                  <circle cx="42" cy="42" r={r} fill="none" stroke="url(#mbGold)" strokeWidth="8" strokeLinecap="round"
                    strokeDasharray={`${(pct / 100) * c} ${c}`} />
                  <defs>
                    <linearGradient id="mbGold" x1="0" y1="0" x2="1" y2="1">
                      <stop offset="0" stopColor="#f3dc9b" /><stop offset=".5" stopColor="#c9a24a" /><stop offset="1" stopColor="#9c7a2c" />
                    </linearGradient>
                  </defs>
                </svg>
                <div className="position-absolute top-50 start-50 translate-middle stat-num" style={{ fontSize: "1.5rem" }}>{pct}%</div>
              </div>
              <div>
                <div className="fw-semibold" style={{ color: "var(--maroon-900)" }}>{score} of {total} preferences match</div>
                <small className="text-muted">Based on stated partner preferences</small>
              </div>
            </div>
            <ul className="list-unstyled mb-0 d-flex flex-column gap-2">
              {checks.filter((x) => x.considered).map((x) => (
                <li key={x.label} className="d-flex justify-content-between align-items-center small">
                  <span>{x.label}</span>
                  {x.pass ? (
                    <span className="text-success fw-semibold"><i className="bi bi-check-circle-fill me-1" />Match</span>
                  ) : (
                    <span className="text-muted"><i className="bi bi-dash-circle me-1" />Differs</span>
                  )}
                </li>
              ))}
            </ul>
          </>
        )}
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
  if (row) row.photo_url = photoUrl(row.photo_url);
  if (!row) {
    return (
      <>
        <div className="container py-5">
          <div className="alert alert-warning shadow-sm border-0">Profile not found.</div>
        </div>
      </>
    );
  }

  // who is viewing? (independent lookups run in parallel)
  const viewerUserId = await getUserIdFromCookieSSR();
  const targetUserId = row.user_id; // from mp.*
  const isSelf = viewerUserId && String(viewerUserId) === String(targetUserId);

  let blocked = false;
  if (viewerUserId && !isSelf) {
    try {
      blocked = await isBlockedBetween(viewerUserId, targetUserId);
    } catch { /* blocks table unavailable */ }
  }

  if (!isSelf && (blocked || row.is_active === false)) {
    return (
      <div className="profile-surface d-flex align-items-center justify-content-center py-5" style={{ minHeight: "70vh" }}>
        <div className="luxe-card p-5 text-center" style={{ maxWidth: 480 }}>
          <div className="why-icon"><i className="bi bi-eye-slash" /></div>
          <h2 className="mb-2" style={{ fontSize: "2rem" }}>Profile Unavailable</h2>
          <p className="text-muted mb-4">This profile is not available to view.</p>
          <a href="/matrimoney/matches/overall" className="btn btn-primary px-4">Browse Matches</a>
        </div>
        <ProfileGlobalStyles />
      </div>
    );
  }

  const [viewerIsPremium, targetIsPremium, connectionStatus] = await Promise.all([
    viewerUserId ? userIsPremium(viewerUserId) : false,
    targetUserId ? userIsPremium(targetUserId) : false,
    checkConnectionStatus(viewerUserId, targetUserId),
    // log the profile view (if logged in and not self)
    viewerUserId && !isSelf
      ? query(
          `INSERT INTO profile_views (viewer_id, viewed_id, viewed_at) VALUES ($1, $2, NOW())
           ON CONFLICT (viewer_id, viewed_id) DO UPDATE SET viewed_at = NOW()`,
          [viewerUserId, targetUserId]
        ).catch((e) => console.error("Failed to log profile view", e))
      : null,
  ]);
  const isConnected = connectionStatus === 'accepted';

  const displayName =
    (row.first_name || row.last_name
      ? `${row.first_name ?? ""} ${row.last_name ?? ""}`.trim()
      : row.matri_id) || "Profile";
  const heightText =
    row.height_cm != null ? cmToFeetInches(row.height_cm) : "—";
  const location = [row.city_name, row.state_name, text(row.country_name, "India")]
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
                    <SafeImage
                      src={row.photo_url}
                      fallback={String(row.gender || "").toLowerCase() === "male" ? "/images/avatar-male.svg" : "/images/avatar-female.svg"}
                      alt={displayName}
                      className="rounded-3"
                      style={{
                        width: "100%",
                        height: "100%",
                        objectFit: "cover",
                        filter: "blur(8px)",
                      }}
                      fallbackStyle={{ objectFit: "contain", padding: "18%", filter: "none" }}
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
  const lockedForViewer = Boolean(row.photo_locked) && !isSelf && !isConnected;
  const shouldBlur = lockedForViewer && !String(row.photo_url || "").startsWith("/api/member-photo/");
  // gallery: other photos of this member (the member-photo route enforces the lock per image)
  let gallery = [];
  try {
    const g = await query(
      `SELECT path FROM photos WHERE profile_id = $1 ORDER BY is_primary DESC, created_at DESC LIMIT 8`,
      [row.id]
    );
    gallery = lockedForViewer ? [] : g.rows.map((r) => photoUrl(r.path)).filter(Boolean);
  } catch { /* photos table unavailable */ }

  const fallbackAvatar = String(row.gender || "").toLowerCase() === "male" ? "/images/avatar-male.svg" : "/images/avatar-female.svg";
  const ageText = row.age_years ?? ageFromDob(row.dob);
  const chips = [
    ageText ? { icon: "bi-calendar-heart", text: `${ageText} yrs` } : null,
    heightText && heightText !== "—" ? { icon: "bi-arrows-vertical", text: heightText } : null,
    row.religion_name ? { icon: "bi-flower1", text: row.religion_name } : null,
    row.caste_name ? { icon: "bi-people", text: row.caste_name } : null,
    location ? { icon: "bi-geo-alt", text: location } : null,
    row.marital_status ? { icon: "bi-heart", text: row.marital_status } : null,
  ].filter(Boolean);

  return (
    <>
      <div className="profile-surface pb-4">
        {/* Royal header band */}
        <section className="profile-hero">
          <div className="mandala-deco light" style={{ width: 560, height: 560, right: -160, top: -220 }} aria-hidden="true" />
          <div className="container position-relative">
            <a href="/dashboard/myhome" className="profile-back">
              <i className="bi bi-arrow-left me-1" /> Back to dashboard
            </a>
          </div>
        </section>

        <div className="container profile-head">
          <div className="row g-4 align-items-end">
            <div className="col-12 col-md-4 col-lg-3">
              <div className="gold-frame profile-photo-frame">
                <div className="position-relative" style={{ background: "#f6ead0", aspectRatio: "4 / 5" }}>
                  <SafeImage
                    src={row.photo_url}
                    fallback={fallbackAvatar}
                    alt={displayName}
                    className="w-100 h-100"
                    style={{ objectFit: "cover", filter: shouldBlur ? "blur(15px)" : "none" }}
                    fallbackStyle={{ objectFit: "contain", padding: "18%", filter: "none" }}
                  />
                  {shouldBlur && (
                    <div className="position-absolute top-50 start-50 translate-middle text-center p-3 profile-lock">
                      <i className="bi bi-lock-fill fs-2 text-maroon d-block mb-1" />
                      <span className="fw-semibold d-block" style={{ color: "var(--maroon-900)" }}>Photo Protected</span>
                      <small className="text-muted" style={{ fontSize: "0.72rem" }}>Visible once you connect</small>
                    </div>
                  )}
                  {targetIsPremium && (
                    <span className="verified-chip" style={{ top: 10, left: 10, right: "auto" }}>
                      <i className="bi bi-gem" /> Premium
                    </span>
                  )}
                  {!isSelf && viewerUserId && (!row.photo_url || lockedForViewer) && (
                    <PhotoRequestButton matriId={row.matri_id} locked={Boolean(row.photo_url) && lockedForViewer} />
                  )}
                </div>
              </div>
              {gallery.length > 1 && (
                <div className="pd-gallery" aria-label="More photos">
                  {gallery.map((src, i) => (
                    <a key={src} href={src} target="_blank" rel="noopener noreferrer" title={`Photo ${i + 1}`}>
                      <img src={src} alt={`${displayName} photo ${i + 1}`} loading="lazy" />
                    </a>
                  ))}
                </div>
              )}
            </div>

            <div className="col-12 col-md-8 col-lg-9">
              <div className="luxe-card p-4 p-lg-5">
                <div className="d-flex flex-wrap align-items-center gap-2 mb-1">
                  <span className="eyebrow" style={{ fontSize: "0.65rem" }}>Profile · {row.matri_id}</span>
                </div>
                <h1 className="mb-3" style={{ fontSize: "clamp(2.2rem, 4vw, 3.2rem)" }}>{displayName}</h1>

                <div className="d-flex flex-wrap gap-2 mb-4">
                  {chips.map((c) => (
                    <span key={c.text} className="profile-chip">
                      <i className={`bi ${c.icon}`} /> {c.text}
                    </span>
                  ))}
                </div>

                <div className="row gy-3 mb-4">
                  <Field label="Gender" value={text(row.gender)} />
                  <Field label="Weight" value={row.weight_kg != null ? `${row.weight_kg} kg` : "—"} />
                  <Field label="Education" value={text(row.education_name)} />
                  <Field label="Profession" value={text(row.profession_name || row.job || row.job_role)} />
                </div>

                {isSelf ? (
                <div className="owner-bar">
                  <span><i className="bi bi-eye me-2" />This is how other members see your profile.</span>
                  <span className="d-flex gap-2">
                    <a href="/dashboard/profile-edit" className="btn btn-primary btn-sm px-3"><i className="bi bi-pencil me-1" />Edit profile</a>
                    <a href="/dashboard/upload-photo" className="btn btn-outline-danger btn-sm px-3"><i className="bi bi-images me-1" />Photos</a>
                    <ShareProfileButton matriId={row.matri_id} own />
                  </span>
                </div>
                ) : (
                <div className="d-flex flex-wrap gap-2 gap-md-3 pt-4" style={{ borderTop: "1px solid rgba(201,162,74,.3)" }}>
                  {isConnected && (
                    <a href={`/dashboard/messages?with=${row.matri_id}`} className="btn btn-primary btn-sm px-3 d-inline-flex align-items-center">
                      <i className="bi bi-chat-heart-fill me-2" />Message
                    </a>
                  )}
                  <SendInterestButton matriId={row.matri_id} />
                  <ShortlistButton matriId={row.matri_id} />
                  {viewerUserId ? (
                    <ViewContactButton matriId={row.matri_id} name={displayName} />
                  ) : (
                    <a href="/matrimoney/login" className="btn btn-outline-dark btn-sm px-3 fw-bold"><i className="bi bi-telephone-fill me-1" />Contact</a>
                  )}
                  {!isSelf && viewerUserId && <ShareProfileButton matriId={row.matri_id} firstName={String(displayName).split(" ")[0]} />}
                  {!isSelf && viewerUserId && <ProfileSafetyActions matriId={row.matri_id} name={displayName} />}
                </div>
                )}
              </div>
            </div>
          </div>
        </div>

        <div className="container pt-4">
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
              {viewer && !isSelf && (
                <>
                  <MatchBlock
                    title={`You vs ${displayName}`}
                    result={youVsThem}
                  />
                  <MatchBlock
                    title={`${displayName} vs You`}
                    result={themVsYou}
                  />
                  <HoroscopeCard viewer={viewer} profile={row} name={displayName} />
                </>
              )}
            </div>
          </div>

          {!isSelf && viewerUserId && (
            <SimilarProfiles matriId={row.matri_id} religionId={row.religion_id} age={row.age_years ?? ageFromDob(row.dob)} />
          )}
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

