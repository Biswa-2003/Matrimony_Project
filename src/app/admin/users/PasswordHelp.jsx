'use client';

// Admin → Members → "Password help": for members who forgot their password and can't use email.
// Option 1: one-time reset link (member picks the password; admin never sees it).
// Option 2: temporary password (member must change it at next sign-in).
import { useState } from 'react';

const digits = (p) => String(p || '').replace(/\D/g, '');
// WhatsApp needs the country code; Indian 10-digit numbers get 91
const waNumber = (p) => {
  const d = digits(p);
  return d.length === 10 ? `91${d}` : d;
};

export default function PasswordHelp({ member, onClose }) {
  const [busy, setBusy] = useState('');
  const [error, setError] = useState('');
  const [result, setResult] = useState(null);
  const [copied, setCopied] = useState(false);
  const [confirmTemp, setConfirmTemp] = useState(false);

  const name = member.first_name || 'Member';

  const run = async (mode) => {
    setBusy(mode);
    setError('');
    setCopied(false);
    try {
      const res = await fetch(`/api/admin/users/${member.id}/password`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ mode }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data.error || 'Something went wrong.');
      setResult(data);
      setConfirmTemp(false);
    } catch (e) {
      setError(e.message);
    } finally {
      setBusy('');
    }
  };

  const message = !result
    ? ''
    : result.mode === 'link'
      ? `Hello ${name}, here is your MatriMoney password reset link (valid for ${result.minutes} minutes, works once):\n${result.url}`
      : `Hello ${name}, your temporary MatriMoney password is: ${result.password}\nSign in at ${window.location.origin}/matrimoney/login and choose a new password straight away.`;

  const copy = async () => {
    try {
      await navigator.clipboard.writeText(result.mode === 'link' ? result.url : result.password);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      setError('Could not copy - select the text and copy it manually.');
    }
  };

  const phone = member.phone;

  return (
    <div className="modal show d-block" tabIndex="-1" style={{ backgroundColor: 'rgba(0,0,0,0.5)', zIndex: 1065 }}>
      <div className="modal-dialog modal-dialog-centered">
        <div className="modal-content rounded-4 border-0 shadow-lg">
          <div className="modal-header text-white" style={{ background: 'linear-gradient(135deg, #3b0a16, #7a1530)' }}>
            <h5 className="modal-title font-heading fw-bold">
              <i className="bi bi-key me-2" /> Password help — {name}
            </h5>
            <button type="button" className="btn-close btn-close-white" onClick={onClose} aria-label="Close" />
          </div>

          <div className="modal-body p-4">
            <p className="small text-muted mb-3">
              {member.email}
              {phone ? ` · ${phone}` : ''}
              <br />
              Only do this after confirming it is really the member (for example, call them on their registered number).
            </p>

            {error && (
              <div className="alert alert-danger py-2 small">
                <i className="bi bi-exclamation-circle me-1" /> {error}
              </div>
            )}

            {!result && (
              <div className="d-grid gap-3">
                <div className="pw-help-card">
                  <div className="d-flex align-items-start gap-3">
                    <i className="bi bi-link-45deg fs-3 text-maroon" />
                    <div className="flex-grow-1">
                      <div className="fw-semibold">Send a reset link <span className="badge bg-success-subtle text-success ms-1">Recommended</span></div>
                      <div className="small text-muted mb-2">
                        The member opens the link and chooses their own password. You never see it. Works once, for 30 minutes.
                      </div>
                      <button className="btn btn-sm btn-primary" disabled={!!busy} onClick={() => run('link')}>
                        {busy === 'link' ? <span className="spinner-border spinner-border-sm me-1" /> : <i className="bi bi-link me-1" />}
                        Create reset link
                      </button>
                    </div>
                  </div>
                </div>

                <div className="pw-help-card">
                  <div className="d-flex align-items-start gap-3">
                    <i className="bi bi-123 fs-3 text-maroon" />
                    <div className="flex-grow-1">
                      <div className="fw-semibold">Give a temporary password</div>
                      <div className="small text-muted mb-2">
                        Replaces the current password straight away and signs the member out everywhere. They must choose a new one when they sign in.
                      </div>
                      {!confirmTemp ? (
                        <button className="btn btn-sm btn-outline-danger" disabled={!!busy} onClick={() => setConfirmTemp(true)}>
                          <i className="bi bi-arrow-repeat me-1" /> Set temporary password
                        </button>
                      ) : (
                        <div className="d-flex flex-wrap gap-2 align-items-center">
                          <span className="small fw-semibold text-danger">Their old password will stop working. Continue?</span>
                          <button className="btn btn-sm btn-danger" disabled={!!busy} onClick={() => run('temp')}>
                            {busy === 'temp' && <span className="spinner-border spinner-border-sm me-1" />} Yes, reset
                          </button>
                          <button className="btn btn-sm btn-light" onClick={() => setConfirmTemp(false)}>Cancel</button>
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              </div>
            )}

            {result && (
              <div>
                <div className="alert alert-success py-2 small mb-3">
                  <i className="bi bi-check-circle me-1" />
                  {result.mode === 'link'
                    ? `Reset link ready — valid for ${result.minutes} minutes and works once.`
                    : 'Temporary password set. The member has been signed out everywhere and emailed (if their email works).'}
                </div>

                <label className="form-label small fw-semibold">
                  {result.mode === 'link' ? 'Reset link' : 'Temporary password'}
                </label>
                <div className="input-group mb-2">
                  <input
                    className={`form-control ${result.mode === 'temp' ? 'fs-5 fw-bold font-monospace text-center' : 'small'}`}
                    readOnly
                    value={result.mode === 'link' ? result.url : result.password}
                    onFocus={(e) => e.target.select()}
                  />
                  <button className="btn btn-outline-secondary" onClick={copy}>
                    <i className={`bi ${copied ? 'bi-check2' : 'bi-clipboard'} me-1`} /> {copied ? 'Copied' : 'Copy'}
                  </button>
                </div>
                <p className="small text-muted">
                  This is shown only now. Share it only with the member, privately.
                </p>

                <div className="d-flex flex-wrap gap-2">
                  {phone && (
                    <a
                      className="btn btn-sm btn-success"
                      href={`https://wa.me/${waNumber(phone)}?text=${encodeURIComponent(message)}`}
                      target="_blank"
                      rel="noopener noreferrer"
                    >
                      <i className="bi bi-whatsapp me-1" /> Send on WhatsApp
                    </a>
                  )}
                  {phone && (
                    <a className="btn btn-sm btn-outline-secondary" href={`sms:${digits(phone)}?body=${encodeURIComponent(message)}`}>
                      <i className="bi bi-chat-text me-1" /> SMS
                    </a>
                  )}
                  {phone && (
                    <a className="btn btn-sm btn-outline-secondary" href={`tel:${digits(phone)}`}>
                      <i className="bi bi-telephone me-1" /> Call
                    </a>
                  )}
                </div>
              </div>
            )}
          </div>

          <div className="modal-footer bg-light">
            {result && (
              <button className="btn btn-outline-secondary me-auto" onClick={() => { setResult(null); setError(''); }}>
                <i className="bi bi-arrow-left me-1" /> Back
              </button>
            )}
            <button className="btn btn-secondary" onClick={onClose}>Done</button>
          </div>
        </div>
      </div>
    </div>
  );
}
