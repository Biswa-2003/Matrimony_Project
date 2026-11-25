"use client";

import { useEffect, useState } from "react";

const ROWS = [
  { key: "alertEmail", icon: "bi-heart", title: "Interests & acceptances", text: "When someone sends you an interest, or accepts yours." },
  { key: "alertMessages", icon: "bi-chat-heart", title: "New messages", text: "At most one email per conversation every few hours — the message itself stays private on MatriMoney." },
  { key: "alertDigest", icon: "bi-calendar-week", title: "Weekly summary", text: "New matches, profile visits and anything waiting for you. Only sent when there's something new." },
];

export default function NotificationSettings() {
  const [prefs, setPrefs] = useState(null);
  const [saving, setSaving] = useState("");
  const [msg, setMsg] = useState(null);

  useEffect(() => {
    fetch("/api/profile/alerts", { cache: "no-store" })
      .then((r) => (r.ok ? r.json() : Promise.reject()))
      .then(setPrefs)
      .catch(() => setMsg({ type: "error", text: "Couldn't load your notification settings." }));
  }, []);

  const toggle = async (key) => {
    const next = !prefs[key];
    setPrefs((p) => ({ ...p, [key]: next })); // optimistic
    setSaving(key);
    setMsg(null);
    try {
      const r = await fetch("/api/profile/alerts", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ [key]: next }),
      });
      if (!r.ok) throw new Error();
      setMsg({ type: "ok", text: "Saved." });
    } catch {
      setPrefs((p) => ({ ...p, [key]: !next }));
      setMsg({ type: "error", text: "Couldn't save. Please try again." });
    } finally {
      setSaving("");
    }
  };

  return (
    <div className="fade-in-up">
      <h5 className="fw-bold text-maroon mb-2">Email notifications</h5>
      <p className="text-muted mb-4">Choose what we email you about. In-app notifications (the bell) are always on.</p>

      {!prefs && !msg && <div className="py-4 text-center"><span className="spinner-border spinner-border-sm" /></div>}

      {prefs && (
        <div className="set-list">
          {ROWS.map((r) => (
            <label key={r.key} className="set-row">
              <span className="set-icon"><i className={`bi ${r.icon}`} /></span>
              <span className="set-text">
                <span className="set-title">{r.title}</span>
                <span className="set-sub">{r.text}</span>
              </span>
              <span className="form-check form-switch m-0">
                <input className="form-check-input set-switch" type="checkbox" role="switch"
                  checked={Boolean(prefs[r.key])} disabled={saving === r.key} onChange={() => toggle(r.key)}
                  aria-label={r.title} />
              </span>
            </label>
          ))}
        </div>
      )}
      {msg && <p className={`small mt-3 mb-0 ${msg.type === "error" ? "text-danger" : "text-success"}`}>{msg.text}</p>}
      <p className="small text-muted mt-4 mb-0">
        <i className="bi bi-info-circle me-1" />Important account emails (password resets, security alerts) are always sent.
      </p>
    </div>
  );
}
