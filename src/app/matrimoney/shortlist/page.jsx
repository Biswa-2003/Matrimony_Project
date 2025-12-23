"use client";
import "bootstrap/dist/css/bootstrap.min.css";
import Link from "next/link";
import { useState, useEffect } from 'react';
import { useShortlist } from "@/app/hooks/useShortlist";

import { BsHeart, BsHeartFill, BsBookmarkHeart } from "react-icons/bs";

function cmToFeetInches(cm) {
  const n = Number(cm);
  if (!n || Number.isNaN(n)) return '';
  const total = Math.round(n / 2.54);
  const ft = Math.floor(total / 12);
  const inch = total % 12;
  return `${ft}ft ${inch}in`;
}

export default function ShortlistPage() {
  const { items, meta, loading, error } = useShortlist({ limit: 50, offset: 0 }); // Increased limit for sidebar
  const [selectedId, setSelectedId] = useState(null);

  // Auto-select first item
  useEffect(() => {
    if (items.length > 0 && !selectedId) {
      const firstId = items[0].id || items[0].to_profile;
      setSelectedId(firstId);
    }
  }, [items, selectedId]);

  const selectedProfile = items.find((it) => (it.id || it.to_profile) === selectedId);

  return (
    <>
      <div className="page-surface">
        {/* Header Section */}
        <div className="header-section text-center text-white mb-4">
          <div className="container py-5">
            <div className="d-inline-block p-3 rounded-circle bg-white bg-opacity-10 mb-3 backdrop-blur">
              <BsBookmarkHeart size="2.5rem" className="text-white" />
            </div>
            <h2 className="fw-bold mb-2">My Shortlisted Profiles</h2>
            <p className="opacity-75 mb-0" style={{ maxWidth: 600, margin: '0 auto' }}>
              Keep track of the profiles you've saved.
            </p>
          </div>
        </div>

        <div className="container pb-5">
          {loading && (
            <div className="text-center py-5">
              <div className="spinner-border text-primary" role="status"></div>
            </div>
          )}

          {error && (
            <div className="alert alert-danger shadow-sm border-0 rounded-4 p-4 text-center">
              {error}
            </div>
          )}

          {!loading && !items.length && (
            <div className="empty-state-card text-center p-5 bg-white rounded-4 shadow-sm border-0">
              <div className="mb-4">
                <div className="bg-light rounded-circle d-inline-flex align-items-center justify-content-center" style={{ width: 80, height: 80 }}>
                  <BsHeart size="2rem" className="text-muted opacity-50" />
                </div>
              </div>
              <h4 className="fw-bold text-dark mb-3">Your Shortlist is Empty</h4>
              <Link className="btn btn-primary btn-lg rounded-pill px-5 fw-bold shadow-sm" href="/matrimoney/preference-search">
                Find Matches
              </Link>
            </div>
          )}

          {!loading && items.length > 0 && (
            <div className="row g-4">
              {/* Left Sidebar - List */}
              <div className="col-lg-4 col-xl-3">
                <div className="d-flex align-items-center justify-content-between mb-3 px-2">
                  <span className="text-muted fw-bold small text-uppercase">Profiles ({meta.total})</span>
                </div>

                <div className="d-flex flex-column gap-2" style={{ minHeight: 400 }}>
                  {items.map((it) => {
                    const pid = it.id || it.to_profile;
                    const active = selectedId === pid;
                    const photo = it.photo_url || '/uploads/default.jpg';

                    return (
                      <div
                        key={pid}
                        onClick={() => setSelectedId(pid)}
                        className={`d-flex align-items-center gap-3 p-3 rounded-4 cursor-pointer transition-all border ${active ? 'bg-white border-primary shadow-sm' : 'bg-white border-transparent hover-bg-light'}`}
                        style={{ borderLeft: active ? '4px solid var(--brand-primary)' : '1px solid transparent' }}
                      >
                        <img
                          src={photo}
                          alt=""
                          className="rounded-circle object-fit-cover"
                          width={50} height={50}
                          onError={(e) => e.target.src = '/uploads/default.jpg'}
                        />
                        <div className="overflow-hidden">
                          <h6 className={`mb-0 fw-bold text-truncate ${active ? 'text-primary' : 'text-dark'}`}>{it.full_name || 'User'}</h6>
                          <small className="text-muted">{it.age_years ? `${it.age_years} yrs` : 'N/A'}</small>
                        </div>
                        {active && <div className="ms-auto"><BsHeartFill className="text-danger" /></div>}
                      </div>
                    );
                  })}
                </div>
              </div>

              {/* Right Pane - Details */}
              <div className="col-lg-8 col-xl-9">
                {selectedProfile ? (
                  <ShortlistDetailView it={selectedProfile} />
                ) : (
                  <div className="h-100 d-flex align-items-center justify-content-center text-muted">Select a profile</div>
                )}
              </div>
            </div>
          )}
        </div>
      </div>

      <style jsx global>{`
        .page-surface { background-color: #f4f7fa; min-height: 100vh; }
        .header-section { background: linear-gradient(135deg, var(--brand-maroon) 0%, #800020 100%); border-bottom-left-radius: 30px; border-bottom-right-radius: 30px; }
        .backdrop-blur { backdrop-filter: blur(5px); }
        .cursor-pointer { cursor: pointer; }
        .hover-bg-light:hover { background-color: rgba(255,255,255,0.6) !important; }
        .transition-all { transition: all 0.2s ease; }
        .object-fit-cover { object-fit: cover; }
      `}</style>
    </>
  );
}

function ShortlistDetailView({ it }) {
  const location = [it.city_name, it.state_name, it.country_name].filter(Boolean).join(', ');
  const p = {
    name: it.full_name || "User",
    matriId: it.matri_id,
    relation: "Member",
    photo: it.photo_url || null,
    profileUrl: `/matrimoney/profile-details/${it.matri_id}`,
    status: it.status === 'accepted' ? 'Accepted' : 'Interest Sent',
    details: {
      Age: it.age_years ? String(it.age_years) : '—',
      Height: cmToFeetInches(it.height_cm),
      Religion: it.religion_name,
      Caste: it.caste_name,
      Location: location || '—',
      Education: it.education,
      Profession: it.occupation,
    },
  };

  return (
    <div className="bg-white rounded-4 shadow-sm border p-4 fade-in h-100">
      <div className="row align-items-start">
        <div className="col-md-5 text-center mb-4 mb-md-0">
          <div className="position-relative d-inline-block">
            <img
              src={p.photo || '/uploads/default.jpg'}
              className="rounded-4 shadow-sm object-fit-cover mb-3"
              alt={p.name}
              style={{ width: '100%', maxWidth: 280, aspectRatio: '3/4' }}
              onError={(e) => e.target.src = '/uploads/default.jpg'}
            />
            <div className="position-absolute bottom-0 start-50 translate-middle-x mb-2 d-flex gap-2">
              <span className="badge bg-dark bg-opacity-75 backdrop-blur shadow-sm px-3 py-2">
                {it.matri_id}
              </span>
            </div>
          </div>
        </div>

        <div className="col-md-7">
          <div className="d-flex justify-content-between align-items-start mb-3">
            <div>
              <h2 className="fw-bold text-maroon mb-1">{p.name}</h2>
              <p className="text-muted mb-0"><i className="bi bi-geo-alt-fill me-1 text-secondary"></i> {location}</p>
            </div>
            <span className={`badge rounded-pill px-3 py-2 ${p.status === 'Accepted' ? 'bg-success' : 'bg-primary'}`}>
              {p.status}
            </span>
          </div>

          <hr className="opacity-10 my-4" />

          <div className="row g-3 mb-4">
            {Object.entries(p.details).map(([k, v]) => (
              v && (
                <div className="col-6" key={k}>
                  <small className="text-uppercase text-muted fw-bold" style={{ fontSize: '0.7rem' }}>{k}</small>
                  <p className="fw-semibold text-dark mb-0">{v}</p>
                </div>
              )
            ))}
          </div>

          <div className="d-flex gap-2 mt-auto">
            <Link href={p.profileUrl} className="btn btn-primary rounded-pill px-4 fw-bold flex-grow-1">
              View Full Profile
            </Link>
            <button className="btn btn-outline-danger rounded-circle p-2 d-flex align-items-center justify-content-center" style={{ width: 42, height: 42 }}>
              <i className="bi bi-trash"></i>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
