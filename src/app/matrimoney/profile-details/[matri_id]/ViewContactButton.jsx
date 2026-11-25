"use client";

import { useState } from "react";
import { Modal } from "react-bootstrap";

/**
 * Contact details are fetched on demand from /api/contact-unlock, which enforces plan credits.
 * Nothing sensitive is embedded in the page HTML.
 */
export default function ViewContactButton({ matriId, name }) {
  const [show, setShow] = useState(false);
  const [state, setState] = useState({ phase: "idle" }); // idle | loading | confirm | revealed | upgrade | error
  const first = String(name || "this member").split(" ")[0];

  const open = async () => {
    setShow(true);
    setState({ phase: "loading" });
    try {
      const r = await fetch(`/api/contact-unlock?matri_id=${encodeURIComponent(matriId)}`, { cache: "no-store" });
      const j = await r.json().catch(() => ({}));
      if (!r.ok) throw new Error(j.error || "Could not load contact details.");
      if (j.unlocked) return setState({ phase: "revealed", contact: j.contact, remaining: j.plan?.remaining, self: j.self });
      if (!j.plan?.active) return setState({ phase: "upgrade", text: `Upgrade to a premium plan to view ${first}'s phone number and email.` });
      if (!j.plan.remaining) return setState({ phase: "upgrade", text: "You've used all the contacts in your plan. Renew or upgrade to view more." });
      setState({ phase: "confirm", remaining: j.plan.remaining });
    } catch (e) {
      setState({ phase: "error", text: e.message });
    }
  };

  const unlock = async () => {
    setState((s) => ({ ...s, phase: "loading" }));
    try {
      const r = await fetch("/api/contact-unlock", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ matri_id: matriId }),
      });
      const j = await r.json().catch(() => ({}));
      if (r.status === 402 || j.upgrade) return setState({ phase: "upgrade", text: j.error });
      if (!r.ok) throw new Error(j.error || "Could not unlock contact details.");
      setState({ phase: "revealed", contact: j.contact, remaining: j.remaining });
    } catch (e) {
      setState({ phase: "error", text: e.message });
    }
  };

  const c = state.contact || {};
  return (
    <>
      <button className="btn btn-outline-dark btn-sm px-3 fw-bold d-inline-flex align-items-center gap-2" onClick={open} style={{ borderColor: "#333" }}>
        <i className="bi bi-telephone-fill" /> Contact
      </button>

      <Modal show={show} onHide={() => setShow(false)} centered>
        <Modal.Header closeButton className="border-0">
          <Modal.Title className="fw-bold" style={{ color: "#5a0f22" }}>Contact details</Modal.Title>
        </Modal.Header>
        <Modal.Body className="text-center pb-4">
          {state.phase === "loading" && <div className="py-4"><span className="spinner-border" style={{ color: "var(--gold-dark)" }} /></div>}

          {state.phase === "confirm" && (
            <div className="py-2">
              <div className="rp-hero-icon" style={{ width: 72, height: 72, fontSize: "1.8rem" }}><i className="bi bi-person-lines-fill" /></div>
              <p className="mb-1">View {first}&apos;s phone number and email?</p>
              <p className="small text-muted mb-4">This uses <strong>1</strong> of your <strong>{state.remaining}</strong> remaining contacts. Viewing it again later is free.</p>
              <div className="d-flex justify-content-center gap-2">
                <button className="btn btn-outline-secondary rounded-pill px-4" onClick={() => setShow(false)}>Not now</button>
                <button className="btn btn-primary rounded-pill px-4" onClick={unlock}><i className="bi bi-unlock me-1" />View contact</button>
              </div>
            </div>
          )}

          {state.phase === "revealed" && (
            <div className="d-flex flex-column gap-3 text-start">
              {c.mobile ? (
                <div className="p-3 bg-white shadow-sm rounded-4 border d-flex align-items-center justify-content-between gap-2 flex-wrap">
                  <div>
                    <small className="text-muted d-block text-uppercase fw-bold" style={{ fontSize: "0.7rem" }}>Mobile</small>
                    <span className="fs-5 fw-bold">{c.mobile}</span>
                  </div>
                  <span className="d-flex gap-2">
                    <a href={`tel:${c.mobile}`} className="btn btn-sm btn-success rounded-pill px-3"><i className="bi bi-telephone" /> Call</a>
                    <a href={`https://wa.me/${String(c.mobile).replace(/\D/g, "").replace(/^(\d{10})$/, "91$1")}`} target="_blank" rel="noopener noreferrer"
                      className="btn btn-sm rounded-pill px-3 text-white" style={{ background: "#25D366" }}><i className="bi bi-whatsapp" /></a>
                  </span>
                </div>
              ) : c.hidden?.phone ? (
                <div className="small text-muted"><i className="bi bi-eye-slash me-1" />{first} has chosen to hide their phone number.</div>
              ) : null}
              {c.email ? (
                <div className="p-3 bg-white shadow-sm rounded-4 border">
                  <small className="text-muted d-block text-uppercase fw-bold" style={{ fontSize: "0.7rem" }}>Email</small>
                  <a href={`mailto:${c.email}`} className="fs-6 fw-semibold text-dark text-break">{c.email}</a>
                </div>
              ) : c.hidden?.email ? (
                <div className="small text-muted"><i className="bi bi-eye-slash me-1" />{first} has chosen to hide their email.</div>
              ) : null}
              {!state.self && typeof state.remaining === "number" && (
                <div className="small text-muted text-center">{state.remaining} contact{state.remaining === 1 ? "" : "s"} left in your plan</div>
              )}
              <div className="small text-muted bg-light p-2 rounded-3">
                <i className="bi bi-shield-check me-1" />Be respectful, involve your families, and never send money to anyone you meet online.
              </div>
            </div>
          )}

          {state.phase === "upgrade" && (
            <div className="py-2">
              <div className="rp-hero-icon is-warn" style={{ width: 72, height: 72, fontSize: "1.8rem" }}><i className="bi bi-gem" /></div>
              <p className="mb-4">{state.text}</p>
              <a href="/matrimoney/package" className="btn btn-gold rounded-pill px-4">See plans</a>
            </div>
          )}

          {state.phase === "error" && <div className="rp-alert error text-start">{state.text}</div>}
        </Modal.Body>
      </Modal>
    </>
  );
}
