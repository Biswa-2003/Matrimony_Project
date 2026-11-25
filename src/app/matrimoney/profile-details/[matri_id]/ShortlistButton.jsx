"use client";

import { useEffect, useState } from "react";

/**
 * Real, persisted shortlist toggle (was a 600 ms simulation that saved nothing).
 * Optimistic: the button flips instantly and rolls back only if the server rejects it.
 */
export default function ShortlistButton({ matriId }) {
  const [isShortlisted, setIsShortlisted] = useState(false);
  const [busy, setBusy] = useState(false);
  const [toast, setToast] = useState("");

  useEffect(() => {
    let alive = true;
    fetch(`/api/shortlist?matri_id=${encodeURIComponent(matriId)}`, { credentials: "include", cache: "no-store" })
      .then((r) => (r.ok ? r.json() : null))
      .then((j) => alive && j && setIsShortlisted(Boolean(j.shortlisted)))
      .catch(() => {});
    return () => {
      alive = false;
    };
  }, [matriId]);

  useEffect(() => {
    if (!toast) return;
    const t = setTimeout(() => setToast(""), 2200);
    return () => clearTimeout(t);
  }, [toast]);

  const handleToggle = async () => {
    if (busy) return;
    const next = !isShortlisted;
    setIsShortlisted(next); // optimistic
    setBusy(true);
    try {
      const r = next
        ? await fetch("/api/shortlist", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ matri_id: matriId }),
          })
        : await fetch(`/api/shortlist?matri_id=${encodeURIComponent(matriId)}`, { method: "DELETE" });
      const j = await r.json().catch(() => ({}));
      if (!r.ok) throw new Error(j.error || "Could not update shortlist");
      setToast(next ? "Added to your shortlist" : "Removed from your shortlist");
    } catch (e) {
      setIsShortlisted(!next); // roll back
      setToast(e.message);
    } finally {
      setBusy(false);
    }
  };

  return (
    <>
      <button
        type="button"
        className={`btn ${isShortlisted ? "btn-gold" : "btn-outline-danger"} d-inline-flex align-items-center gap-2`}
        onClick={handleToggle}
        aria-pressed={isShortlisted}
      >
        <i className={`bi ${isShortlisted ? "bi-bookmark-heart-fill" : "bi-bookmark-heart"}`} />
        {isShortlisted ? "Shortlisted" : "Shortlist"}
      </button>
      {toast && (
        <div className="mm-toast" role="status">
          <i className="bi bi-check-circle me-2" /> {toast}
        </div>
      )}
    </>
  );
}
