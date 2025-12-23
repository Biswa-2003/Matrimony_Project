"use client";

import "bootstrap/dist/css/bootstrap.min.css";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { useState, useEffect } from "react";
import { useInterests } from "@/app/hooks/useInterests";
import DashNav from "@/app/components/dashnav";
import { BsArrowThroughHeartFill, BsCheckCircleFill, BsInboxFill, BsGeoAltFill, BsHeartFill } from "react-icons/bs";

function cmToFeetInches(cm) {
  const n = Number(cm);
  if (!n || Number.isNaN(n)) return '';
  const total = Math.round(n / 2.54);
  const ft = Math.floor(total / 12);
  const inch = total % 12;
  return `${ft}ft ${inch}in`;
}

// Detail View Component
function InterestsDetailView({ it, filter, acceptingId, onAccept }) {
  const name = it.full_name || "User";
  const location = it.location_text || [it.city_name, it.state_name, it.country_name].filter(Boolean).join(', ') || '—';
  const photo = it.photo_url || '/uploads/default.jpg';

  const details = {
    Age: String(it.age_years || '—'),
    Height: it.height_cm ? cmToFeetInches(it.height_cm) : '—',
    Religion: it.religion_name || '—',
    Caste: it.caste_name || '—',
    Location: location,
    Education: it.education || '—',
    Profession: it.occupation || '—',
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
                {it.matri_id}
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

          <div className="mt-4 pt-4 border-top">
            {filter === "received" && it.status !== "accepted" && (
              <div className="d-flex gap-3">
                <button
                  className="btn btn-primary rounded-pill px-5 fw-bold shadow-sm"
                  onClick={() => onAccept(it.id)}
                  disabled={acceptingId === it.id}
                >
                  {acceptingId === it.id ? (
                    <>
                      <span className="spinner-border spinner-border-sm me-2"></span>
                      Accepting...
                    </>
                  ) : 'Accept Request'}
                </button>
                <Link href={`/matrimoney/profile-details/${it.matri_id}`} className="btn btn-outline-dark rounded-pill px-4 fw-bold">
                  View Full Profile
                </Link>
              </div>
            )}
            {filter === "accepted" && (
              <div className="d-flex align-items-center gap-3">
                <span className="badge bg-success-subtle text-success fs-6 rounded-pill px-3 py-2 border border-success-subtle">
                  Connected <BsCheckCircleFill className="ms-2" />
                </span>
                <Link href={`/matrimoney/profile-details/${it.matri_id}`} className="btn btn-outline-primary rounded-pill px-4 fw-bold">
                  View Full Profile
                </Link>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

export default function InterestsPage() {
  const searchParams = useSearchParams();
  const filter = searchParams.get("filter") || "received"; // received | accepted

  // mapping for API
  let type = "received";
  let status = "sent";
  let title = "Interests Received";
  let subtitle = "Profiles that have expressed interest in you.";
  let Icon = BsInboxFill;

  if (filter === "accepted") {
    type = "received";
    status = "accepted";
    title = "Connections Made";
    subtitle = "Interests you have accepted. Start a conversation!";
    Icon = BsArrowThroughHeartFill;
  }

  const { items, meta, loading, error, refetch } = useInterests({
    type,
    status,
    page: 1,
    limit: 50, // Increased limit for sidebar list
  });

  const [acceptingId, setAcceptingId] = useState(null);
  const [message, setMessage] = useState("");
  const [messageType, setMessageType] = useState("info");
  const [selectedId, setSelectedId] = useState(null);

  // Auto-select first item
  useEffect(() => {
    if (items.length > 0 && !selectedId) {
      setSelectedId(items[0].id);
    }
  }, [items, selectedId]);

  const selectedItem = items.find(it => it.id === selectedId);

  const handleAccept = async (id) => {
    try {
      setAcceptingId(id);
      setMessage("");
      setMessageType("info");

      const res = await fetch("/api/interest", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({ id, action: "accept" }),
      });

      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        setMessage(data?.error || "Failed to accept interest.");
        setMessageType("danger");
        return;
      }

      setMessage("Interest accepted successfully!");
      setMessageType("success");
      refetch();
    } catch (e) {
      setMessage("Something went wrong while accepting.");
      setMessageType("danger");
    } finally {
      setAcceptingId(null);
    }
  };

  return (
    <>

      <div className="page-surface">
        {/* Header Section */}
        <div className="header-section text-center text-white mb-4">
          <div className="container py-5">
            <div className="d-inline-block p-3 rounded-circle bg-white bg-opacity-10 mb-3 backdrop-blur shadow-sm">
              <Icon size="2.5rem" className="text-white" />
            </div>
            <h2 className="fw-bold mb-2">{title}</h2>
            <p className="opacity-75 mb-0" style={{ maxWidth: 600, margin: '0 auto' }}>
              {subtitle}
            </p>

            {/* Tabs / Segmented Control */}
            <div className="d-inline-flex bg-white bg-opacity-20 p-1 rounded-pill mt-4 backdrop-blur border border-white border-opacity-25">
              <Link
                href="/matrimoney/interests?filter=received"
                className={`btn rounded-pill px-4 fw-semibold transition-all ${filter === "received" ? "bg-white text-maroon shadow-sm" : "text-white hover-white"}`}
                style={{ border: 'none' }}
              >
                Received
              </Link>
              <Link
                href="/matrimoney/interests?filter=accepted"
                className={`btn rounded-pill px-4 fw-semibold transition-all ${filter === "accepted" ? "bg-white text-maroon shadow-sm" : "text-white hover-white"}`}
                style={{ border: 'none' }}
              >
                Accepted
              </Link>
            </div>
          </div>
        </div>

        <div className="container pb-5" style={{ marginTop: '-40px' }}>

          {/* Messages */}
          {message && (
            <div className={`alert alert-${messageType} shadow-sm border-0 rounded-4 text-center mb-4 fade-in-up`}>
              {messageType === 'success' && <BsCheckCircleFill className="me-2" />}
              {message}
            </div>
          )}

          {/* Loading */}
          {loading && (
            <div className="text-center py-5">
              <div className="spinner-border text-primary" role="status"></div>
            </div>
          )}

          {/* Error */}
          {error && !loading && (
            <div className="alert alert-danger shadow-sm border-0 rounded-4 p-4 text-center">
              {error}
            </div>
          )}

          {/* Empty State */}
          {!loading && !error && !items.length && (
            <div className="text-center p-5 bg-white rounded-4 shadow-sm border-0 mx-auto" style={{ maxWidth: 600 }}>
              <div className="mb-4">
                <div className="bg-light rounded-circle d-inline-flex align-items-center justify-content-center" style={{ width: 80, height: 80 }}>
                  <BsInboxFill size="2rem" className="text-muted opacity-50" />
                </div>
              </div>
              <h4 className="fw-bold text-dark mb-3">No Interests Found</h4>
              <p className="text-muted mb-0">
                {filter === 'received'
                  ? "You haven't received any new interests yet. Improve your profile to get noticed!"
                  : "You haven't accepted any interests yet. Check your received requests."}
              </p>
            </div>
          )}

          {/* Grid Layout */}
          {!loading && !error && !!items.length && (
            <div className="row g-4">
              {/* Left Sidebar List */}
              <div className="col-lg-4 col-xl-3">
                <div className="d-flex justify-content-between align-items-center mb-3 px-2">
                  <span className="small text-muted fw-bold text-uppercase">Interests ({meta.total})</span>
                </div>
                <div className="d-flex flex-column gap-2" style={{ maxHeight: 'calc(100vh - 200px)', overflowY: 'auto' }}>
                  {items.map((it) => {
                    const active = selectedId === it.id;
                    const photo = it.photo_url || '/uploads/default.jpg';

                    return (
                      <div
                        key={it.id}
                        onClick={() => setSelectedId(it.id)}
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
                          <h6 className={`mb-0 fw-bold text-truncate ${active ? 'text-primary' : 'text-dark'}`}>{it.full_name || 'User'}</h6>
                          <small className="text-muted">{it.age_years || 'N/A'} yrs</small>
                        </div>
                        {active && <div className="ms-auto"><BsHeartFill className="text-danger" /></div>}
                      </div>
                    );
                  })}
                </div>
              </div>

              {/* Right Detail Pane */}
              <div className="col-lg-8 col-xl-9">
                {selectedItem ? (
                  <InterestsDetailView
                    it={selectedItem}
                    filter={filter}
                    acceptingId={acceptingId}
                    onAccept={handleAccept}
                  />
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
        .header-section {
             background: linear-gradient(135deg, var(--brand-maroon) 0%, #800020 100%);
            border-bottom-left-radius: 40px;
            border-bottom-right-radius: 40px;
        }
        .backdrop-blur {
            backdrop-filter: blur(8px);
        }
        .hover-white:hover {
            background-color: rgba(255,255,255,0.1);
        }
        .text-maroon { color: var(--brand-maroon, #800020) !important; }
        .hover-lift {
            transition: transform 0.2s ease;
        }
        .hover-lift:hover {
            transform: translateY(-5px);
        }
        .cursor-pointer { cursor: pointer; }
        .hover-bg-light:hover { background-color: rgba(255,255,255,0.8) !important; }
        .transition-all { transition: all 0.2s ease; }
        .object-fit-cover { object-fit: cover; }
        
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
