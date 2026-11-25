"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { AnimatePresence, motion } from "framer-motion";

function cmToFeetInches(cm) {
  const n = Number(cm);
  if (!n || Number.isNaN(n)) return "";
  const total = Math.round(n / 2.54);
  return `${Math.floor(total / 12)}ft ${total % 12}in`;
}

const avatarFor = (it) =>
  String(it?.gender || "").toLowerCase() === "male" ? "/images/avatar-male.svg" : "/images/avatar-female.svg";

// Resolve a stored photo path to a URL without double-prefixing /uploads/
const resolvePhoto = (p, it) => {
  if (!p || /default\.jpg$/.test(p)) return avatarFor(it);
  if (p.startsWith("http") || p.startsWith("data:")) return p;
  if (p.startsWith("/uploads/") || p.startsWith("uploads/")) return p.startsWith("/") ? p : `/${p}`;
  if (p.startsWith("/")) return p;
  return `/uploads/${p}`;
};

const nameOf = (it) => it.full_name || [it.first_name, it.last_name].filter(Boolean).join(" ") || it.name || "Member";

function MatchesDetailView({ it }) {
  const name = nameOf(it);
  const location = [it.city_name, it.state_name, it.country_name].filter(Boolean).join(", ");
  const pid = it.matri_id || it.user_id || "—";
  const photo = resolvePhoto(it.photo || it.photo_url, it);
  const isAvatar = photo.startsWith("/images/avatar");

  const details = [
    ["Age", it.age_years || it.age ? `${it.age_years || it.age} yrs` : "—"],
    ["Height", it.height_cm ? cmToFeetInches(it.height_cm) : "—"],
    ["Religion", it.religion_name || "—"],
    ["Community", it.caste_name || "—"],
    ["Education", it.education || it.education_name || "—"],
    ["Profession", it.job_role || it.profession_name || it.profession || "—"],
  ];

  return (
    <motion.div
      key={pid}
      initial={{ opacity: 0, y: 20, rotateY: -6 }}
      animate={{ opacity: 1, y: 0, rotateY: 0 }}
      exit={{ opacity: 0, y: -10 }}
      transition={{ duration: 0.45, ease: [0.16, 1, 0.3, 1] }}
      className="luxe-card p-4 p-lg-5 h-100"
      style={{ transformPerspective: 1200 }}
    >
      <div className="row g-4 align-items-start">
        <div className="col-md-5">
          <div className="gold-frame">
            <div className="position-relative" style={{ background: "#f6ead0", aspectRatio: "4 / 5" }}>
              <img
                src={photo}
                alt={name}
                className="w-100 h-100"
                style={{ objectFit: isAvatar ? "contain" : "cover", padding: isAvatar ? "16%" : 0 }}
                onError={(e) => {
                  e.currentTarget.onerror = null;
                  e.currentTarget.src = avatarFor(it);
                  e.currentTarget.style.objectFit = "contain";
                  e.currentTarget.style.padding = "16%";
                }}
              />
              <span className="verified-chip" style={{ top: "auto", bottom: 12, right: 12 }}>
                <i className="bi bi-person-badge" /> {pid}
              </span>
            </div>
          </div>
        </div>

        <div className="col-md-7">
          <span className="eyebrow mb-2" style={{ fontSize: "0.62rem" }}>Suggested Match</span>
          <h2 className="mb-1" style={{ fontSize: "2.6rem" }}>{name}</h2>
          {location && (
            <p className="text-muted mb-3">
              <i className="bi bi-geo-alt text-gold me-1" /> {location}
            </p>
          )}
          <span className="ornament start mb-4" />

          <div className="row g-3 mb-4">
            {details.map(([k, v]) => (
              <div className="col-6" key={k}>
                <div className="match-fact">
                  <small>{k}</small>
                  <div>{v}</div>
                </div>
              </div>
            ))}
          </div>

          <div className="d-flex flex-wrap gap-2">
            <Link href={`/matrimoney/profile-details/${pid}`} className="btn btn-primary px-4 flex-grow-1">
              View Full Profile <i className="bi bi-arrow-right ms-1" />
            </Link>
            <Link href="/matrimoney/shortlist" className="btn btn-outline-danger px-3" title="My shortlist">
              <i className="bi bi-bookmark-heart" />
            </Link>
          </div>
        </div>
      </div>
    </motion.div>
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
    return () => {
      aborted = true;
    };
  }, [endpoint]);

  const selectedItem = items.find((it) => (it.matri_id || it.user_id) === selectedId);

  if (loading)
    return (
      <div className="row g-4">
        <div className="col-lg-4 col-xl-3 d-flex flex-column gap-2">
          {[...Array(4)].map((_, i) => (
            <div key={i} className="luxe-card loading-skeleton" style={{ height: 76 }} />
          ))}
        </div>
        <div className="col-lg-8 col-xl-9">
          <div className="luxe-card loading-skeleton" style={{ height: 420 }} />
        </div>
      </div>
    );

  if (!items.length)
    return (
      <div className="luxe-card text-center p-5 mx-auto" style={{ maxWidth: 620 }}>
        <img src="/images/ritual-rings.svg" alt="" width={90} height={90} className="mb-3 p-3 rounded-circle" style={{ background: "var(--royal)" }} />
        <h3 className="mb-2" style={{ fontSize: "2rem" }}>No profiles here yet</h3>
        <p className="text-muted mb-4">
          New members join every day. Complete your profile and partner preferences to receive better matches.
        </p>
        <div className="d-flex gap-2 justify-content-center flex-wrap">
          <Link href="/dashboard/profile-edit" className="btn btn-primary px-4">Complete My Profile</Link>
          <Link href="/matrimoney/preference-search" className="btn btn-outline-danger px-4">Search Profiles</Link>
        </div>
      </div>
    );

  return (
    <>
      <div className="row g-4">
        <div className="col-lg-4 col-xl-3">
          <div className="d-flex justify-content-between align-items-center mb-3 px-1">
            <span className="eyebrow" style={{ fontSize: "0.62rem" }}>{items.length} Profiles</span>
          </div>
          <div className="d-flex flex-column gap-2 match-list">
            {items.map((it) => {
              const pid = it.matri_id || it.user_id;
              const active = selectedId === pid;
              return (
                <button
                  type="button"
                  key={pid}
                  onClick={() => setSelectedId(pid)}
                  className={`match-item ${active ? "active" : ""}`}
                  aria-pressed={active}
                >
                  <img
                    src={resolvePhoto(it.photo || it.photo_url, it)}
                    alt=""
                    width={52}
                    height={52}
                    className="rounded-circle object-fit-cover"
                    onError={(e) => {
                      e.currentTarget.onerror = null;
                      e.currentTarget.src = avatarFor(it);
                    }}
                  />
                  <div className="overflow-hidden text-start">
                    <div className="match-name text-truncate">{nameOf(it)}</div>
                    <small className="text-muted">
                      {it.age_years || it.age ? `${it.age_years || it.age} yrs` : "—"}
                      {it.city_name ? ` · ${it.city_name}` : ""}
                    </small>
                  </div>
                  <i className={`bi ${active ? "bi-heart-fill" : "bi-chevron-right"} ms-auto`} />
                </button>
              );
            })}
          </div>
        </div>

        <div className="col-lg-8 col-xl-9">
          <AnimatePresence mode="wait">
            {selectedItem ? (
              <MatchesDetailView key={selectedId} it={selectedItem} />
            ) : (
              <div className="h-100 d-flex align-items-center justify-content-center text-muted">Select a profile</div>
            )}
          </AnimatePresence>
        </div>
      </div>

      <style jsx global>{`
        .match-list { max-height: calc(100vh - 220px); overflow-y: auto; padding: 2px; }
        .match-item {
          display: flex; align-items: center; gap: 12px;
          width: 100%;
          padding: 12px 14px;
          border-radius: 18px;
          border: 1px solid rgba(201, 162, 74, 0.22);
          background: #fff;
          color: var(--muted);
          transition: all 0.3s cubic-bezier(0.16, 1, 0.3, 1);
        }
        .match-item img { border: 2px solid var(--gold-pale); }
        .match-item:hover { transform: translateX(4px); border-color: var(--gold); box-shadow: var(--shadow-sm); }
        .match-item.active {
          background: var(--royal);
          border-color: var(--gold);
          color: var(--gold-light);
          box-shadow: var(--shadow-md);
        }
        .match-item.active .text-muted { color: rgba(255, 255, 255, 0.65) !important; }
        .match-item.active img { border-color: var(--gold); }
        .match-name { font-family: var(--font-poppins), sans-serif; font-weight: 600; color: var(--maroon-900); }
        .match-item.active .match-name { color: #fff; }
        .match-fact {
          padding: 12px 14px;
          border-radius: 14px;
          background: #fffdf9;
          border: 1px solid rgba(201, 162, 74, 0.25);
        }
        .match-fact small { display: block; font-size: 0.66rem; letter-spacing: 0.14em; text-transform: uppercase; color: var(--muted); }
        .match-fact div { font-weight: 600; color: var(--ink); }
      `}</style>
    </>
  );
}
