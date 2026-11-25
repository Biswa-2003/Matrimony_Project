// Public, read-only "family view" of a profile, opened from a share link the member created.
// Shows only basic biodata — never phone, email, address or locked photos.
import Link from "next/link";
import { query } from "@/lib/db";
import { verifyShareToken, SHARE_DAYS } from "@/lib/share";
import { photoUrl } from "@/lib/members";
import SafeImage from "@/app/components/SafeImage";

export const dynamic = "force-dynamic";

async function load(matriId) {
  const { rows } = await query(
    `SELECT mp.matri_id, mp.first_name, mp.gender, mp.marital_status, mp.height_cm, mp.about_me,
            COALESCE(mp.photo_locked, false) AS photo_locked, COALESCE(mp.is_active, true) AS is_active,
            CAST(date_part('year', age(mp.dob)) AS int) AS age,
            r.name AS religion, c.name AS caste, ci.name AS city, st.name AS state,
            e.name AS education, pr.name AS profession,
            (SELECT ph.path FROM photos ph WHERE ph.profile_id = mp.id ORDER BY ph.is_primary DESC, ph.created_at DESC LIMIT 1) AS photo
       FROM matrimony_profiles mp
       LEFT JOIN religions r ON r.id = mp.religion_id
       LEFT JOIN castes c ON c.id = mp.caste_id
       LEFT JOIN cities ci ON ci.id = mp.city_id
       LEFT JOIN states st ON st.id = mp.state_id
       LEFT JOIN educations e ON e.id = mp.education_id
       LEFT JOIN professions pr ON pr.id = mp.profession_id
      WHERE UPPER(mp.matri_id) = UPPER($1) LIMIT 1`,
    [matriId]
  );
  return rows[0] || null;
}

const height = (cm) => {
  const n = Number(cm);
  if (!n) return null;
  const t = Math.round(n / 2.54);
  return `${Math.floor(t / 12)}ft ${t % 12}in`;
};
const tidy = (s) => (s && s === s.toLowerCase() ? s.replace(/\b([a-z])/g, (c) => c.toUpperCase()) : s);

export async function generateMetadata({ params }) {
  const { token } = await params;
  const m = verifyShareToken(token);
  const p = m ? await load(m).catch(() => null) : null;
  if (!p || !p.is_active) return { title: "Shared profile · MatriMoney", robots: { index: false } };
  const line = [p.age && `${p.age} yrs`, tidy(p.city), p.religion].filter(Boolean).join(" · ");
  return {
    title: `${p.first_name || "A member"} — shared profile · MatriMoney`,
    description: `${line}. Shared with family on MatriMoney.`,
    robots: { index: false, follow: false },
    openGraph: { title: `${p.first_name || "A member"} · MatriMoney`, description: line },
  };
}

export default async function SharedProfilePage({ params }) {
  const { token } = await params;
  const matri = verifyShareToken(token);
  const p = matri ? await load(matri) : null;

  if (!p || !p.is_active) {
    return (
      <div className="sp-page">
        <div className="sp-card text-center">
          <div className="rp-hero-icon is-warn"><i className="bi bi-link-45deg" /></div>
          <h1 className="sp-name">This link has expired</h1>
          <p className="text-muted">Shared profile links work for {SHARE_DAYS} days. Please ask for a new link.</p>
          <Link href="/" className="btn btn-primary rounded-pill px-4">Visit MatriMoney</Link>
        </div>
      </div>
    );
  }

  const fallback = String(p.gender).toLowerCase() === "male" ? "/images/avatar-male.svg" : "/images/avatar-female.svg";
  const src = p.photo_locked ? null : photoUrl(p.photo);
  const facts = [
    ["bi-calendar-heart", "Age", p.age && `${p.age} years`],
    ["bi-arrows-vertical", "Height", height(p.height_cm)],
    ["bi-heart", "Marital status", p.marital_status],
    ["bi-flower1", "Religion", p.religion],
    ["bi-people", "Community", p.caste],
    ["bi-geo-alt", "Lives in", [tidy(p.city), tidy(p.state)].filter(Boolean).join(", ")],
    ["bi-mortarboard", "Education", tidy(p.education)],
    ["bi-briefcase", "Profession", tidy(p.profession)],
  ].filter(([, , v]) => v);

  return (
    <div className="sp-page">
      <div className="sp-card">
        <div className="sp-banner"><i className="bi bi-people-fill me-2" />Shared with family · view only</div>
        <div className="sp-top">
          <div className="sp-photo">
            <SafeImage src={src} fallback={fallback} alt={p.first_name || "Member"} style={{ objectFit: "cover" }}
              fallbackStyle={{ objectFit: "contain", padding: "16%" }} />
          </div>
          <div>
            <span className="eyebrow" style={{ fontSize: "0.62rem" }}>Profile · {p.matri_id}</span>
            <h1 className="sp-name">{p.first_name || "Member"}</h1>
            <p className="text-muted mb-0">{[p.age && `${p.age} yrs`, tidy(p.city), p.religion].filter(Boolean).join(" · ")}</p>
            {p.photo_locked && <p className="small text-muted mt-2 mb-0"><i className="bi bi-lock me-1" />Photos are shared only with connections.</p>}
          </div>
        </div>
        <div className="sp-facts">
          {facts.map(([i, k, v]) => (
            <div key={k} className="ix-fact"><i className={`bi ${i}`} /><div><small>{k}</small><span>{v}</span></div></div>
          ))}
        </div>
        {p.about_me && (
          <div className="sp-about">
            <h2>About</h2>
            <p>{String(p.about_me).slice(0, 600)}</p>
          </div>
        )}
        <div className="sp-cta">
          <p className="mb-2">Contact details are shared only between connected members on MatriMoney.</p>
          <div className="d-flex flex-wrap gap-2 justify-content-center">
            <Link href={`/matrimoney/profile-details/${p.matri_id}`} className="btn btn-primary rounded-pill px-4">View full profile</Link>
            <Link href="/matrimoney/register" className="btn btn-outline-primary rounded-pill px-4">Create a free profile</Link>
          </div>
        </div>
      </div>
    </div>
  );
}
