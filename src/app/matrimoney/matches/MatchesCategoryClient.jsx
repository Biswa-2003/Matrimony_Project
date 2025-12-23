"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { BsInboxFill, BsHeartFill, BsGeoAltFill } from "react-icons/bs";
import ProfileResultCard from "@/app/components/ProfileResultCard";

function cmToFeetInches(cm) {
  const n = Number(cm);
  if (!n || Number.isNaN(n)) return '';
  const total = Math.round(n / 2.54);
  const ft = Math.floor(total / 12);
  const inch = total % 12;
  return `${ft}ft ${inch}in`;
}

// Helper: Resolve Photo URL reliably
const resolvePhoto = (p) => {
  if (!p) return '/uploads/default.jpg';
  if (p.startsWith('http') || p.startsWith('data:')) return p;
  // If it already has /uploads prefix (ignoring leading slash variation)
  if (p.startsWith('/uploads/') || p.startsWith('uploads/')) {
    return p.startsWith('/') ? p : `/${p}`;
  }
  return `/uploads/${p}`;
};

// Helper for detail view
function MatchesDetailView({ it }) {
  const name = it.full_name || [it.first_name, it.last_name].filter(Boolean).join(' ') || it.name || "User";
  const location = [it.city_name, it.state_name, it.country_name].filter(Boolean).join(', ');
  const pid = it.matri_id || it.user_id || 'ID-?';
  const photo = resolvePhoto(it.photo || it.photo_url);

  const details = {
    Age: String(it.age_years || it.age || '—'),
    Height: it.height_cm ? cmToFeetInches(it.height_cm) : '—',
    Religion: it.religion_name || '—',
    Caste: it.caste_name || '—',
    Location: location || '—',
    Education: it.education || '—',
    Profession: it.job_role || it.profession_name || it.profession || '—',
  };

  return (
    <div className="bg-white rounded-4 shadow-sm border p-4 fade-in-up h-100">
      <div className="row align-items-start">
        <div className="col-md-5 text-center mb-4 mb-md-0">
          <div className="position-relative d-inline-block">
            <img
              src={photo}
              className="rounded-4 shadow-sm object-fit-cover mb-3"
              alt={name}
              style={{ width: '100%', maxWidth: 280, aspectRatio: '3/4' }}
              onError={(e) => e.target.src = '/uploads/default.jpg'}
            />
            <div className="position-absolute bottom-0 start-50 translate-middle-x mb-2">
              <span className="badge bg-dark bg-opacity-75 backdrop-blur shadow-sm px-3 py-2">
                {pid}
              </span>
            </div>
          </div>
        </div>

        <div className="col-md-7">
          <div className="mb-3">
            <h2 className="fw-bold text-maroon mb-1">{name}</h2>
            <p className="text-muted mb-0"><BsGeoAltFill className="me-1 text-secondary" /> {location}</p>
          </div>

          <hr className="opacity-10 my-4" />

          <div className="row g-3 mb-4">
            {Object.entries(details).map(([k, v]) => (
              <div className="col-6" key={k}>
                <small className="text-uppercase text-muted fw-bold" style={{ fontSize: '0.7rem' }}>{k}</small>
                <p className="fw-semibold text-dark mb-0">{v}</p>
              </div>
            ))}
          </div>

          <div className="d-flex gap-2 mt-auto">
            <Link href={`/matrimoney/profile-details/${pid}`} className="btn btn-primary rounded-pill px-4 fw-bold flex-grow-1 shadow-sm">
              View Full Profile
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}

export default function MatchesCategoryClient({ endpoint }) {
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedId, setSelectedId] = useState(null);

  useEffect(() => {
    let aborted = false;
    (async () => {
      try {
        const r = await fetch(endpoint, { credentials: "include", cache: "no-store" });
        const j = await r.json().catch(() => ({}));
        if (!aborted) {
          const list = j.results || j.data || [];
          setItems(list);
          if (list.length > 0) setSelectedId(list[0].matri_id || list[0].user_id);
        }
      } catch {
        if (!aborted) setItems([]);
      } finally {
        if (!aborted) setLoading(false);
      }
    })();
    return () => { aborted = true; };
  }, [endpoint]);

  const selectedItem = items.find(it => (it.matri_id || it.user_id) === selectedId);

  if (loading) return (
    <div className="text-center py-5 bg-white rounded-4 shadow-sm fade-in-up">
      <div className="spinner-border text-primary" role="status" />
      <p className="mt-3 text-muted">Loading profiles...</p>
    </div>
  );

  if (!items.length) return (
    <div className="text-center p-5 bg-white rounded-4 shadow-sm border-0 fade-in-up mx-auto" style={{ maxWidth: 600 }}>
      <div className="mb-4">
        <div className="bg-light rounded-circle d-inline-flex align-items-center justify-content-center" style={{ width: 80, height: 80 }}>
          <BsInboxFill size="2rem" className="text-muted opacity-50" />
        </div>
      </div>
      <h4 className="fw-bold text-dark mb-2">No Profiles Found</h4>
      <p className="text-muted mb-0">
        We couldn't find any profiles in this category right now. Check back later!
      </p>
    </div>
  );

  return (
    <>
      <div className="row g-4">
        {/* Left Sidebar */}
        <div className="col-lg-4 col-xl-3">
          <div className="d-flex justify-content-between align-items-center mb-3 px-2">
            <span className="small text-muted fw-bold text-uppercase">Profiles ({items.length})</span>
          </div>
          <div className="d-flex flex-column gap-2" style={{ maxHeight: 'calc(100vh - 200px)', overflowY: 'auto' }}>
            {items.map((it, i) => {
              const pid = it.matri_id || it.user_id;
              const active = selectedId === pid;
              const name = it.full_name || [it.first_name, it.last_name].filter(Boolean).join(' ') || "User";
              let photo = it.photo || it.photo_url || '/uploads/default.jpg';
              if (!photo.startsWith('http') && !photo.startsWith('data:')) photo = `/uploads/${photo}`;

              return (
                <div
                  key={i}
                  onClick={() => setSelectedId(pid)}
                  className={`d-flex align-items-center gap-3 p-3 rounded-4 cursor-pointer transition-all border ${active ? 'bg-white border-primary shadow-sm' : 'bg-white border-transparent hover-bg-light'}`}
                  style={{ borderLeft: active ? '4px solid var(--brand-primary)' : '1px solid transparent' }}
                >
                  <img
                    src={photo}
                    alt=""
                    className="rounded-circle object-fit-cover shadow-sm"
                    width={50} height={50}
                    onError={(e) => e.target.src = '/uploads/default.jpg'}
                  />
                  <div className="overflow-hidden">
                    <h6 className={`mb-0 fw-bold text-truncate ${active ? 'text-primary' : 'text-dark'}`}>{name}</h6>
                    <small className="text-muted">{it.age_years || it.age || 'N/A'} yrs</small>
                  </div>
                  {active && <div className="ms-auto"><BsHeartFill className="text-danger" /></div>}
                </div>
              );
            })}
          </div>
        </div>

        {/* Right Detail View */}
        <div className="col-lg-8 col-xl-9">
          {selectedItem ? (
            <MatchesDetailView it={selectedItem} />
          ) : (
            <div className="h-100 d-flex align-items-center justify-content-center text-muted">Select a profile</div>
          )}
        </div>
      </div>

      <style jsx global>{`
        .hover-lift { transition: transform 0.2s ease; }
        .hover-lift:hover { transform: translateY(-5px); }
        .cursor-pointer { cursor: pointer; }
        .hover-bg-light:hover { background-color: rgba(255,255,255,0.8) !important; }
        .transition-all { transition: all 0.2s ease; }
        .object-fit-cover { object-fit: cover; }
        .backdrop-blur { backdrop-filter: blur(5px); }
        .text-maroon { color: var(--brand-maroon, #800020) !important; }
        
        @keyframes fadeInUp {
            from { opacity: 0; transform: translateY(10px); }
            to { opacity: 1; transform: translateY(0); }
        }
        .fade-in-up {
            animation: fadeInUp 0.4s ease-out forwards;
        }
      `}</style>
    </>
  );
}
