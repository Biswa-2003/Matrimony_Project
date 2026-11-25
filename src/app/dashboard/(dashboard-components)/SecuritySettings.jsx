"use client";

import { useCallback, useEffect, useState } from "react";

const when = (t) => {
  const m = Math.floor((Date.now() - new Date(t).getTime()) / 60000);
  if (m < 2) return "Active now";
  if (m < 60) return `Active ${m} min ago`;
  const h = Math.floor(m / 60);
  return `Active ${h} hour${h > 1 ? "s" : ""} ago`;
};
const iconFor = (d) => (/Android|iPhone/.test(d) ? "bi-phone" : /Mac|Windows|Linux/.test(d) ? "bi-laptop" : "bi-display");

export default function SecuritySettings() {
  const [data, setData] = useState(null);
  const [busy, setBusy] = useState("");
  const [msg, setMsg] = useState(null);

  const load = useCallback(() => {
    fetch("/api/sessions", { cache: "no-store" })
      .then((r) => (r.ok ? r.json() : Promise.reject()))
      .then(setData)
      .catch(() => setMsg({ type: "error", text: "Couldn't load your devices." }));
  }, []);
  useEffect(load, [load]);

  const revoke = async (url, key, okText) => {
    setBusy(key);
    setMsg(null);
    try {
      const r = await fetch(url, { method: "DELETE" });
      const j = await r.json().catch(() => ({}));
      if (!r.ok) throw new Error(j.error);
      setMsg({ type: "ok", text: okText || j.message || "Done." });
      load();
    } catch (e) {
      setMsg({ type: "error", text: e.message || "Something went wrong." });
    } finally {
      setBusy("");
    }
  };

  const others = (data?.sessions || []).filter((s) => !s.current);

  return (
    <div className="fade-in-up">
      <h5 className="fw-bold text-maroon mb-2">Where you&apos;re logged in</h5>
      <p className="text-muted mb-4">
        If you see a device you don&apos;t recognise, log it out and change your password. Sessions end automatically after 2 hours.
      </p>

      {!data && !msg && <div className="py-4 text-center"><span className="spinner-border spinner-border-sm" /></div>}

      {data && (
        <>
          {!data.tracked && (
            <div className="rp-note mb-3"><i className="bi bi-info-circle" />
              <span>You signed in before device tracking was added. Log out and back in to see this device here.</span>
            </div>
          )}
          <div className="set-list">
            {data.sessions.map((s) => (
              <div key={s.id} className="set-row">
                <span className="set-icon"><i className={`bi ${iconFor(s.device)}`} /></span>
                <span className="set-text">
                  <span className="set-title">
                    {s.device}
                    {s.current && <span className="set-badge">This device</span>}
                  </span>
                  <span className="set-sub">
                    {s.current ? "You're using this now" : when(s.last_seen_at)}
                    {s.ip ? ` · IP ${s.ip}` : ""} · signed in {new Date(s.created_at).toLocaleString("en-IN", { day: "numeric", month: "short", hour: "numeric", minute: "2-digit" })}
                  </span>
                </span>
                {!s.current && (
                  <button type="button" className="btn btn-sm btn-outline-danger rounded-pill px-3" disabled={busy === s.id}
                    onClick={() => revoke(`/api/sessions?id=${s.id}`, s.id, "That device has been logged out.")}>
                    {busy === s.id ? "…" : "Log out"}
                  </button>
                )}
              </div>
            ))}
            {!data.sessions.length && <p className="text-muted small mb-0">No active sessions found.</p>}
          </div>

          {others.length > 0 && (
            <button type="button" className="btn btn-outline-danger rounded-pill px-4 mt-3" disabled={busy === "others"}
              onClick={() => revoke("/api/sessions?others=1", "others")}>
              <i className="bi bi-box-arrow-right me-1" /> Log out all other devices
            </button>
          )}
        </>
      )}

      {msg && <p className={`small mt-3 mb-0 ${msg.type === "error" ? "text-danger" : "text-success"}`}>{msg.text}</p>}

      <hr className="my-4" />
      <h6 className="fw-bold text-dark mb-2">Security tips</h6>
      <ul className="small text-muted ps-3 mb-0">
        <li>Changing your password signs you out everywhere else automatically.</li>
        <li>MatriMoney will never ask for your password or OTP by phone, chat or email.</li>
        <li>Never send money to someone you&apos;ve met online, whatever the reason.</li>
      </ul>
    </div>
  );
}
