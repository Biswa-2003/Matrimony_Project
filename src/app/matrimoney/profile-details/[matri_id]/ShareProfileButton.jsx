"use client";

import { useState } from "react";

/**
 * own=true  → create a 7-day family link (works without login, basic details only)
 * own=false → share this profile's normal link (recipient must log in to view)
 */
export default function ShareProfileButton({ matriId, firstName, own }) {
  const [open, setOpen] = useState(false);
  const [url, setUrl] = useState("");
  const [busy, setBusy] = useState(false);
  const [copied, setCopied] = useState(false);
  const [err, setErr] = useState("");

  const start = async () => {
    setOpen(true);
    setErr("");
    setCopied(false);
    if (!own) {
      setUrl(`${window.location.origin}/matrimoney/profile-details/${matriId}`);
      return;
    }
    if (url) return;
    setBusy(true);
    try {
      const r = await fetch("/api/share-link", { method: "POST" });
      const j = await r.json().catch(() => ({}));
      if (!r.ok) throw new Error(j.error || "Could not create a link.");
      setUrl(j.url);
    } catch (e) {
      setErr(e.message);
    } finally {
      setBusy(false);
    }
  };

  const text = own
    ? `Namaste! Here is my MatriMoney profile for the family to see: ${url}`
    : `Please have a look at ${firstName || "this"}'s profile on MatriMoney: ${url}`;

  const copy = async () => {
    try { await navigator.clipboard.writeText(url); setCopied(true); setTimeout(() => setCopied(false), 2000); } catch {}
  };
  const nativeShare = async () => {
    try { await navigator.share({ title: "MatriMoney profile", text, url }); } catch {}
  };

  return (
    <>
      <button type="button" className={`btn btn-sm px-3 ${own ? "btn-gold" : "btn-outline-secondary"}`} onClick={start}>
        <i className={`bi ${own ? "bi-people" : "bi-share"} me-1`} />{own ? "Share with family" : "Share"}
      </button>

      {open && (
        <div className="mx-modal-backdrop" onClick={() => setOpen(false)}>
          <div className="mx-modal" role="dialog" aria-modal="true" onClick={(e) => e.stopPropagation()}>
            <h3>{own ? "Share with your family" : `Share ${firstName || "profile"}`}</h3>
            <p>
              {own
                ? "Anyone with this link can see your basic details (no phone, email or protected photos) for 7 days — no login needed."
                : "The person you send this to will need to log in to MatriMoney to see the profile."}
            </p>
            {err && <div className="rp-alert error">{err}</div>}
            {busy ? (
              <div className="text-center py-3"><span className="spinner-border spinner-border-sm" /></div>
            ) : url && (
              <>
                <div className="input-group mb-3">
                  <input className="form-control" value={url} readOnly onFocus={(e) => e.target.select()} aria-label="Share link" />
                  <button className="btn btn-outline-primary" type="button" onClick={copy}>{copied ? <><i className="bi bi-check2" /> Copied</> : "Copy"}</button>
                </div>
                <div className="d-flex flex-wrap gap-2">
                  <a className="btn rounded-pill px-3 text-white" style={{ background: "#25D366" }}
                    href={`https://wa.me/?text=${encodeURIComponent(text)}`} target="_blank" rel="noopener noreferrer">
                    <i className="bi bi-whatsapp me-1" /> WhatsApp
                  </a>
                  {typeof navigator !== "undefined" && navigator.share && (
                    <button type="button" className="btn btn-outline-secondary rounded-pill px-3" onClick={nativeShare}><i className="bi bi-box-arrow-up me-1" /> More</button>
                  )}
                  <button type="button" className="btn btn-link ms-auto" onClick={() => setOpen(false)}>Close</button>
                </div>
              </>
            )}
          </div>
        </div>
      )}
    </>
  );
}
