// Server component: guna milan between the viewer and this profile.
import { gunaMilan } from "@/lib/guna-milan";

const isMale = (g) => String(g || "").toLowerCase() === "male";

export default function HoroscopeCard({ viewer, profile, name }) {
  if (!viewer || !profile) return null;
  if (isMale(viewer.gender) === isMale(profile.gender)) return null;

  const [bride, groom] = isMale(viewer.gender) ? [profile, viewer] : [viewer, profile];
  const r = gunaMilan(bride, groom);
  const first = String(name || "this member").split(" ")[0];
  const viewerHasStar = Boolean(viewer.star && String(viewer.star).trim());

  return (
    <div className="card pe-card mb-4 horo-card">
      <div className="card-header"><span className="horo-om" aria-hidden="true">ॐ</span> Horoscope match</div>
      <div className="card-body">
        {!r ? (
          <div className="text-center py-2">
            <p className="small text-muted mb-3">
              {!viewerHasStar
                ? "Add your Nakshatra (star) and Rashi to see your guna milan score with every profile."
                : `${first} hasn't added horoscope details yet.`}
            </p>
            {!viewerHasStar && (
              <a href="/dashboard/profile-edit" className="btn btn-sm btn-outline-primary rounded-pill px-3">Add my star & rashi</a>
            )}
          </div>
        ) : (
          <>
            <div className="horo-top">
              <div className="horo-ring" style={{ "--p": `${Math.round((r.total / r.max) * 100)}%` }}>
                <span><strong>{r.total}</strong><small>/{r.max}</small></span>
              </div>
              <div>
                <div className={`horo-verdict v-${r.verdict.replace(/\s/g, "").toLowerCase()}`}>{r.verdict}</div>
                <div className="small text-muted">
                  Guna milan{r.partial ? " (star-based — rashi missing)" : " · Ashtakoota"}
                </div>
              </div>
            </div>

            <ul className="horo-list">
              {r.kootas.map((k) => (
                <li key={k.key}>
                  <div className="d-flex justify-content-between small">
                    <span className="fw-semibold">{k.name}</span>
                    <span className="text-muted">{k.got}/{k.max}</span>
                  </div>
                  <div className="horo-bar"><span style={{ width: `${(k.got / k.max) * 100}%` }} className={k.got === 0 ? "zero" : ""} /></div>
                  <div className="horo-note">{k.note}</div>
                </li>
              ))}
            </ul>

            {(r.doshas.length > 0 || r.manglik === "mismatch") && (
              <div className="horo-alert">
                <i className="bi bi-exclamation-triangle" />
                <span>
                  {r.doshas.length > 0 && <>{r.doshas.join(" & ")} dosha present. </>}
                  {r.manglik === "mismatch" && <>Manglik status differs. </>}
                  Many families consult an astrologer about remedies (parihara).
                </span>
              </div>
            )}
            {r.manglik === "match" && (
              <div className="small text-success mt-2"><i className="bi bi-check-circle me-1" />Manglik status is compatible.</div>
            )}
            <p className="horo-disclaimer">Indicative score from Moon star &amp; rashi. Please consult your family astrologer before any decision.</p>
          </>
        )}
      </div>
    </div>
  );
}
