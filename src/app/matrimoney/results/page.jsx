'use client';

import React, { useEffect, useState } from 'react';
import { useSearchParams, useRouter } from 'next/navigation';
import DashNav from '@/app/components/dashnav';
import Link from 'next/link';
import 'bootstrap/dist/css/bootstrap.min.css';
import { BsSearch, BsGeoAltFill, BsHeartFill, BsExclamationCircleFill } from 'react-icons/bs';

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
  if (p.startsWith('/uploads/') || p.startsWith('uploads/')) {
    return p.startsWith('/') ? p : `/${p}`;
  }
  return `/uploads/${p}`;
};

function SearchDetailView({ it }) {
  const name = it.name || "User";
  const location = it.details?.Location || '—';
  const pid = it.matriId || 'ID-?';
  const photo = resolvePhoto(it.photo);

  // Parse details back if needed, or rely on what we have
  // The fetch logic normalized data into `it` props, but let's check structure
  // fetching logic below maps to: { name, matriId, photo, details: { Age, Location } }
  // We might want more details if available, but for now we display what we have.

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
            {Object.entries(it.details).map(([k, v]) => (
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

export default function ResultsPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const initialMatriId = searchParams.get('matriId') || '';

  const [matriId, setMatriId] = useState(initialMatriId);
  const [profiles, setProfiles] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [selectedId, setSelectedId] = useState(null);

  // Search function
  const fetchResults = async (queryId) => {
    if (!queryId) return;
    setLoading(true);
    setError('');
    setProfiles([]);
    setSelectedId(null);

    try {
      const res = await fetch(`/api/search?matriId=${encodeURIComponent(queryId)}`);

      if (!res.ok) {
        // Fallback: try direct profile details
        const res2 = await fetch(`/api/profile-details?id=${encodeURIComponent(queryId)}`);
        if (res2.ok) {
          const data = await res2.json();
          if (data.profile) {
            const p = transformProfile(data.profile);
            setProfiles([p]);
          } else {
            setProfiles([]);
          }
          return;
        }
        throw new Error('No results found');
      }

      const data = await res.json();
      const list = Array.isArray(data.users)
        ? data.users
        : (Array.isArray(data.results) ? data.results : (data.user ? [data.user] : []));

      setProfiles(list.map(transformProfile));
    } catch (err) {
      console.error(err);
      setError('No matching profiles found.');
      setProfiles([]);
    } finally {
      setLoading(false);
    }
  };

  const transformProfile = (p) => ({
    name: p.first_name || p.name || 'Member',
    matriId: p.matri_id || p.id,
    photo: p.photo || p.photo_url,
    details: {
      Age: String(p.age || p.basic?.age || '—'),
      Location: p.location?.city ? `${p.location?.city}, ${p.location?.state}` : (p.city || '—'),
      Religion: p.religion_name || p.religion || '—',
      Caste: p.caste_name || p.caste || '—',
    }
  });

  useEffect(() => {
    if (initialMatriId) {
      fetchResults(initialMatriId);
    }
  }, [initialMatriId]);

  // Auto-select first
  useEffect(() => {
    if (profiles.length > 0 && !selectedId) {
      setSelectedId(profiles[0].matriId);
    }
  }, [profiles, selectedId]);

  const handleSearch = (e) => {
    e.preventDefault();
    router.push(`/matrimoney/results?matriId=${encodeURIComponent(matriId)}`);
  };

  const selectedItem = profiles.find(p => p.matriId === selectedId);

  return (
    <>

      <div className="page-surface">
        <div className="container py-4">

          {/* Search Header */}
          <div className="bg-white rounded-4 shadow-sm p-4 mb-4 fade-in-up">
            <form onSubmit={handleSearch} className="row g-3 align-items-end">
              <div className="col-md-9">
                <label className="fw-bold text-muted small mb-2 text-uppercase tracking-wider">Search by Matri ID</label>
                <div className="input-group">
                  <span className="input-group-text bg-light border-0 ps-3 text-muted"><BsSearch /></span>
                  <input
                    type="text"
                    className="form-control form-control-lg bg-light border-0"
                    placeholder="Enter ID (e.g. DU12345)"
                    value={matriId}
                    onChange={(e) => setMatriId(e.target.value)}
                  />
                </div>
              </div>
              <div className="col-md-3">
                <button type="submit" className="btn btn-primary btn-lg w-100 rounded-pill fw-bold shadow-sm h-100">
                  Search
                </button>
              </div>
            </form>
          </div>

          {/* Content State */}
          {loading && (
            <div className="text-center py-5 bg-white rounded-4 shadow-sm fade-in-up">
              <div className="spinner-border text-primary" role="status" />
              <p className="mt-3 text-muted">Searching matches...</p>
            </div>
          )}

          {error && !loading && (
            <div className="alert alert-danger shadow-sm border-0 rounded-4 p-4 text-center fade-in-up">
              <BsExclamationCircleFill className="fs-3 mb-2" />
              <p className="mb-0">{error}</p>
            </div>
          )}

          {!loading && !error && profiles.length === 0 && initialMatriId && (
            <div className="text-center py-5 bg-white rounded-4 shadow-sm fade-in-up">
              <h5 className="text-muted fw-bold">No profiles found for "{initialMatriId}"</h5>
              <p className="text-muted small">Check the ID or try a different search.</p>
            </div>
          )}

          {/* Results Layout */}
          {!loading && !error && profiles.length > 0 && (
            <div className="row g-4 mobile-flex-order">
              {/* Left Sidebar */}
              <div className="col-lg-4 col-xl-3">
                <div className="d-flex justify-content-between align-items-center mb-3 px-2">
                  <span className="small text-muted fw-bold text-uppercase">Matches Found ({profiles.length})</span>
                </div>
                <div className="d-flex flex-column gap-2" style={{ maxHeight: 'calc(100vh - 300px)', overflowY: 'auto' }}>
                  {profiles.map((p, i) => {
                    const active = selectedId === p.matriId;
                    const photo = resolvePhoto(p.photo);
                    return (
                      <div
                        key={i}
                        onClick={() => setSelectedId(p.matriId)}
                        className={`d-flex align-items-center gap-3 p-3 rounded-4 cursor-pointer transition-all border ${active ? 'bg-white border-primary shadow-sm' : 'bg-white border-transparent hover-bg-light'}`}
                        style={{ borderLeft: active ? '4px solid var(--brand-primary)' : '1px solid transparent' }}
                      >
                        <img
                          src={photo}
                          className="rounded-circle object-fit-cover shadow-sm"
                          width={50} height={50}
                          alt=""
                          onError={(e) => e.target.src = '/uploads/default.jpg'}
                        />
                        <div className="overflow-hidden">
                          <h6 className={`mb-0 fw-bold text-truncate ${active ? 'text-primary' : 'text-dark'}`}>{p.name}</h6>
                          <small className="text-muted">{p.matriId}</small>
                        </div>
                      </div>
                    )
                  })}
                </div>
              </div>

              {/* Right Detail */}
              <div className="col-lg-8 col-xl-9">
                {selectedItem ? (
                  <SearchDetailView it={selectedItem} />
                ) : (
                  <div className="h-100 d-flex align-items-center justify-content-center text-muted">Select a profile</div>
                )}
              </div>
            </div>
          )}
        </div>
      </div>

      <style jsx global>{`
        .page-surface {
            background-color: #f4f7fa;
            min-height: 100vh;
        }
        .text-maroon { color: var(--brand-maroon, #800020) !important; }
        .cursor-pointer { cursor: pointer; }
        .hover-bg-light:hover { background-color: rgba(255,255,255,0.8) !important; }
        .transition-all { transition: all 0.2s ease; }
        .object-fit-cover { object-fit: cover; }
        .tracking-wider { letter-spacing: 0.5px; }

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
