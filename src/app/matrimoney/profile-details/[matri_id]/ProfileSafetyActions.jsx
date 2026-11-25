"use client";

import { useState } from "react";
import { Modal } from "react-bootstrap";

const REASONS = [
  "Fake profile / impersonation",
  "Inappropriate photos or content",
  "Harassment or abusive messages",
  "Asking for money / scam",
  "Already married / misleading details",
  "Other",
];

/** Report / Block controls shown on another member's profile. */
export default function ProfileSafetyActions({ matriId, name }) {
  const [mode, setMode] = useState(null); // 'report' | 'block' | null
  const [reason, setReason] = useState("");
  const [details, setDetails] = useState("");
  const [alsoBlock, setAlsoBlock] = useState(true);
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState({ type: "", text: "" });

  const close = () => {
    setMode(null);
    setMsg({ type: "", text: "" });
  };

  const submitReport = async () => {
    if (!reason) return setMsg({ type: "error", text: "Please choose a reason." });
    setBusy(true);
    try {
      const r = await fetch("/api/report", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ matri_id: matriId, reason, details, block: alsoBlock }),
      });
      const j = await r.json().catch(() => ({}));
      if (!r.ok) throw new Error(j.error || "Could not submit the report.");
      setMsg({ type: "success", text: j.message });
      if (alsoBlock) setTimeout(() => (window.location.href = "/dashboard/myhome"), 1600);
    } catch (e) {
      setMsg({ type: "error", text: e.message });
    } finally {
      setBusy(false);
    }
  };

  const submitBlock = async () => {
    setBusy(true);
    try {
      const r = await fetch("/api/block", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ matri_id: matriId }),
      });
      const j = await r.json().catch(() => ({}));
      if (!r.ok) throw new Error(j.error || "Could not block this member.");
      setMsg({ type: "success", text: `${name} has been blocked. You will no longer see each other.` });
      setTimeout(() => (window.location.href = "/dashboard/myhome"), 1400);
    } catch (e) {
      setMsg({ type: "error", text: e.message });
    } finally {
      setBusy(false);
    }
  };

  return (
    <>
      <div className="dropdown ms-auto">
        <button className="btn btn-outline-secondary px-3" data-bs-toggle="dropdown" aria-expanded="false" aria-label="More actions">
          <i className="bi bi-three-dots" />
        </button>
        <ul className="dropdown-menu dropdown-menu-end">
          <li>
            <button className="dropdown-item" onClick={() => setMode("report")}>
              <i className="bi bi-flag me-2 text-danger" /> Report profile
            </button>
          </li>
          <li>
            <button className="dropdown-item" onClick={() => setMode("block")}>
              <i className="bi bi-slash-circle me-2" /> Block {name.split(" ")[0]}
            </button>
          </li>
        </ul>
      </div>

      <Modal show={mode === "report"} onHide={close} centered>
        <Modal.Header closeButton>
          <Modal.Title style={{ fontFamily: "var(--font-display)", fontSize: "1.7rem" }}>Report this profile</Modal.Title>
        </Modal.Header>
        <Modal.Body className="p-4">
          <p className="text-muted small">Reports are confidential. Our safety team reviews every report within 24 hours.</p>
          <div className="d-flex flex-column gap-2 mb-3">
            {REASONS.map((r) => (
              <label key={r} className={`report-reason ${reason === r ? "active" : ""}`}>
                <input type="radio" name="reason" value={r} checked={reason === r} onChange={() => setReason(r)} className="form-check-input me-2" />
                {r}
              </label>
            ))}
          </div>
          <label className="form-label" htmlFor="report-details">Details (optional)</label>
          <textarea id="report-details" className="form-control mb-3" rows={3} maxLength={2000} value={details}
            onChange={(e) => setDetails(e.target.value)} placeholder="Tell us what happened" />
          <div className="form-check mb-3">
            <input className="form-check-input" type="checkbox" id="also-block" checked={alsoBlock} onChange={(e) => setAlsoBlock(e.target.checked)} />
            <label className="form-check-label small" htmlFor="also-block">Also block this member</label>
          </div>
          {msg.text && <div className={`alert ${msg.type === "error" ? "alert-danger" : "alert-success"} py-2 small`}>{msg.text}</div>}
          <button className="btn btn-primary w-100" disabled={busy || msg.type === "success"} onClick={submitReport}>
            {busy ? <span className="spinner-border spinner-border-sm" /> : "Submit Report"}
          </button>
        </Modal.Body>
      </Modal>

      <Modal show={mode === "block"} onHide={close} centered>
        <Modal.Body className="p-4 text-center">
          <div className="why-icon"><i className="bi bi-slash-circle" /></div>
          <h3 style={{ fontSize: "1.8rem" }}>Block {name}?</h3>
          <p className="text-muted small mb-4">
            You won&apos;t see each other in matches or searches, and they can&apos;t send you interests or messages.
            You can unblock anytime from Settings.
          </p>
          {msg.text && <div className={`alert ${msg.type === "error" ? "alert-danger" : "alert-success"} py-2 small`}>{msg.text}</div>}
          <div className="d-flex gap-2">
            <button className="btn btn-outline-secondary flex-fill" onClick={close}>Cancel</button>
            <button className="btn btn-primary flex-fill" disabled={busy || msg.type === "success"} onClick={submitBlock}>
              {busy ? <span className="spinner-border spinner-border-sm" /> : "Block"}
            </button>
          </div>
        </Modal.Body>
      </Modal>

      <style jsx global>{`
        .report-reason {
          display: flex; align-items: center;
          padding: 10px 14px;
          border-radius: 12px;
          border: 1px solid #ecdfc9;
          cursor: pointer;
          font-size: 0.9rem;
          transition: all 0.2s ease;
        }
        .report-reason:hover { background: var(--gold-pale); }
        .report-reason.active { border-color: var(--maroon-700); background: #fbecef; }
      `}</style>
    </>
  );
}
