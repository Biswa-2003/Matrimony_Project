'use client';

import { useCallback, useEffect, useState } from 'react';

const FILTERS = [
  { key: 'help', label: 'Needs help', icon: 'bi-life-preserver' },
  { key: 'waiting', label: 'Waiting', icon: 'bi-hourglass-split' },
  { key: 'all', label: 'All', icon: 'bi-list-ul' },
];
const DELIVERY = {
  sent: ['Email delivered', 'bg-success-subtle text-success', 'bi-envelope-check'],
  failed: ['Email failed', 'bg-danger-subtle text-danger', 'bi-envelope-x'],
  undeliverable: ['Test / invalid address', 'bg-warning-subtle text-dark', 'bi-envelope-slash'],
  not_configured: ['Email not set up', 'bg-warning-subtle text-dark', 'bi-gear'],
  pending: ['Sending…', 'bg-light text-dark', 'bi-clock'],
  admin: ['Issued by admin', 'badge-gold', 'bi-person-badge'],
  unknown: ['Unknown', 'bg-light text-dark', 'bi-question-circle'],
};
const fmt = (t) => (t ? new Date(t).toLocaleString('en-IN', { day: 'numeric', month: 'short', hour: 'numeric', minute: '2-digit' }) : '—');
const left = (t) => {
  const m = Math.round((new Date(t) - Date.now()) / 60000);
  if (m <= 0) return 'expired';
  return m < 60 ? `${m} min left` : `${Math.floor(m / 60)} h ${m % 60} min left`;
};
const waLink = (phone, text) => {
  const digits = String(phone || '').replace(/\D/g, '');
  const n = digits.length === 10 ? `91${digits}` : digits;
  return n ? `https://wa.me/${n}?text=${encodeURIComponent(text)}` : `https://wa.me/?text=${encodeURIComponent(text)}`;
};
const message = (otp, expires) =>
  `Namaste! Your MatriMoney verification code is ${otp}. It is valid until ${fmt(expires)}. Enter it on the sign-up form to finish registering. Never share this code with anyone else. — MatriMoney Support`;

function CodeCard({ data, onClose }) {
  const [copied, setCopied] = useState(false);
  const copy = async () => { try { await navigator.clipboard.writeText(data.otp); setCopied(true); setTimeout(() => setCopied(false), 1800); } catch {} };
  const text = message(data.otp, data.expires);
  return (
    <div className="otp-card">
      <div className="d-flex justify-content-between align-items-start gap-2">
        <div>
          <div className="small text-muted">Code for <strong>{data.email}</strong></div>
          <div className="otp-code" aria-label={`Code ${data.otp.split('').join(' ')}`}>{data.otp}</div>
          <div className="small text-muted">Valid until {fmt(data.expires)} · {left(data.expires)}</div>
        </div>
        {onClose && <button className="btn btn-sm btn-link text-muted" onClick={onClose} aria-label="Hide code"><i className="bi bi-eye-slash" /> Hide</button>}
      </div>
      <div className="d-flex flex-wrap gap-2 mt-3">
        <button className="btn btn-sm btn-outline-primary rounded-pill px-3" onClick={copy}>{copied ? <><i className="bi bi-check2" /> Copied</> : <><i className="bi bi-clipboard" /> Copy code</>}</button>
        <a className="btn btn-sm rounded-pill px-3 text-white" style={{ background: '#25D366' }} href={waLink(data.phone, text)} target="_blank" rel="noopener noreferrer">
          <i className="bi bi-whatsapp" /> WhatsApp{data.phone ? ` ${data.phone}` : ''}
        </a>
        {data.phone && <a className="btn btn-sm btn-outline-secondary rounded-pill px-3" href={`sms:${data.phone}?body=${encodeURIComponent(text)}`}><i className="bi bi-chat-text" /> SMS</a>}
        {data.phone && <a className="btn btn-sm btn-outline-secondary rounded-pill px-3" href={`tel:${data.phone}`}><i className="bi bi-telephone" /> Call</a>}
      </div>
    </div>
  );
}

export default function OtpHelpPage() {
  const [filter, setFilter] = useState('help');
  const [data, setData] = useState(null);
  const [error, setError] = useState('');
  const [busy, setBusy] = useState('');
  const [revealed, setRevealed] = useState({}); // email → code data
  const [form, setForm] = useState({ email: '', phone: '', minutes: 30 });
  const [issued, setIssued] = useState(null);
  const [toast, setToast] = useState(null);

  const load = useCallback(async () => {
    try {
      const r = await fetch('/api/admin/otp', { cache: 'no-store' });
      const j = await r.json();
      if (!r.ok) throw new Error(j.error);
      setData(j);
      setError('');
    } catch (e) {
      setError(e.message || 'Could not load sign-up codes.');
    }
  }, []);
  useEffect(() => { load(); const id = setInterval(load, 30000); return () => clearInterval(id); }, [load]);
  useEffect(() => { if (!toast) return; const t = setTimeout(() => setToast(null), 3500); return () => clearTimeout(t); }, [toast]);

  const reveal = async (email) => {
    setBusy(`r-${email}`);
    try {
      const r = await fetch(`/api/admin/otp?reveal=${encodeURIComponent(email)}`, { cache: 'no-store' });
      const j = await r.json();
      if (!r.ok) throw new Error(j.error);
      setRevealed((x) => ({ ...x, [email]: j }));
    } catch (e) {
      setToast({ type: 'error', text: e.message });
    } finally { setBusy(''); }
  };

  const issue = async (email, phone, minutes = 30) => {
    setBusy(`i-${email}`);
    try {
      const r = await fetch('/api/admin/otp', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ email, phone, minutes }) });
      const j = await r.json();
      if (!r.ok) throw new Error(j.error);
      setRevealed((x) => ({ ...x, [j.email]: j }));
      setToast({ type: 'ok', text: `New code issued for ${j.email}. The previous code no longer works.` });
      load();
      return j;
    } catch (e) {
      setToast({ type: 'error', text: e.message });
      return null;
    } finally { setBusy(''); }
  };

  const cancel = async (email) => {
    setBusy(`c-${email}`);
    const r = await fetch(`/api/admin/otp?email=${encodeURIComponent(email)}`, { method: 'DELETE' });
    setBusy('');
    if (r.ok) { setRevealed((x) => { const y = { ...x }; delete y[email]; return y; }); setToast({ type: 'ok', text: 'Code cancelled.' }); load(); }
  };

  const submit = async (e) => {
    e.preventDefault();
    const j = await issue(form.email.trim(), form.phone.trim(), form.minutes);
    if (j) { setIssued(j); setForm({ email: '', phone: '', minutes: 30 }); }
  };

  const items = (data?.items || []).filter((i) =>
    filter === 'all' ? true : filter === 'waiting' ? i.status === 'waiting' : i.status === 'waiting' && i.delivery !== 'sent');

  return (
    <div className="container-fluid p-0">
      <p className="text-muted small mb-4">
        When someone can&apos;t receive the sign-up email (typo, blocked inbox, or no email at all), confirm who they are by phone, then give them a code here.
        Every code you view or issue is recorded in the admin log.
      </p>

      <div className="row g-4">
        <div className="col-xl-4">
          <form className="admin-card p-4" onSubmit={submit}>
            <h5 className="mb-1"><i className="bi bi-key me-2" />Issue a sign-up code</h5>
            <p className="small text-muted">For someone who called or messaged support.</p>
            <label className="form-label small fw-semibold" htmlFor="otp-email">Email they are registering with</label>
            <input id="otp-email" type="email" className="form-control mb-2" placeholder="name@example.com" required
              value={form.email} onChange={(e) => setForm((f) => ({ ...f, email: e.target.value }))} />
            <label className="form-label small fw-semibold" htmlFor="otp-phone">Mobile (optional — for WhatsApp/SMS)</label>
            <input id="otp-phone" className="form-control mb-2" placeholder="98765 43210" inputMode="tel"
              value={form.phone} onChange={(e) => setForm((f) => ({ ...f, phone: e.target.value }))} />
            <label className="form-label small fw-semibold" htmlFor="otp-min">Code valid for</label>
            <select id="otp-min" className="form-select mb-3" value={form.minutes} onChange={(e) => setForm((f) => ({ ...f, minutes: Number(e.target.value) }))}>
              <option value={30}>30 minutes</option>
              <option value={120}>2 hours</option>
              <option value={1440}>24 hours</option>
            </select>
            <button className="btn btn-primary w-100" disabled={!!busy}><i className="bi bi-shield-check me-1" />Generate code</button>
            <div className="otp-steps mt-3">
              <strong className="small">How it works</strong>
              <ol className="small mb-0">
                <li>Call the person on their number to confirm it&apos;s really them.</li>
                <li>Generate the code and send it by WhatsApp or SMS.</li>
                <li>They enter it in the “Email OTP” box on the sign-up form.</li>
              </ol>
            </div>
          </form>
          {issued && <div className="mt-3"><CodeCard data={issued} onClose={() => setIssued(null)} /></div>}
        </div>

        <div className="col-xl-8">
          <div className="d-flex flex-wrap justify-content-between align-items-center gap-2 mb-3">
            <div className="match-tabs" style={{ display: 'inline-flex' }}>
              {FILTERS.map((f) => (
                <button key={f.key} className={`match-tab border-0 ${filter === f.key ? 'active' : 'bg-transparent'}`} onClick={() => setFilter(f.key)}>
                  <i className={`bi ${f.icon} me-2`} />{f.label}
                  {f.key === 'help' && data?.counts?.needsHelp > 0 && <span className="ms-2 badge rounded-pill bg-danger">{data.counts.needsHelp}</span>}
                  {f.key === 'waiting' && data?.counts?.waiting > 0 && <span className="ms-2 badge rounded-pill bg-secondary">{data.counts.waiting}</span>}
                </button>
              ))}
            </div>
            <button className="btn btn-sm btn-outline-secondary" onClick={load}><i className="bi bi-arrow-clockwise" /> Refresh</button>
          </div>

          {error && <div className="alert alert-danger">{error}</div>}
          {!data && !error && <div className="admin-card loading-skeleton" style={{ height: 200 }} />}
          {data && items.length === 0 && (
            <div className="admin-card p-5 text-center">
              <div className="why-icon"><i className="bi bi-envelope-check" /></div>
              <h3 style={{ fontSize: '1.7rem' }}>{filter === 'help' ? 'Nobody is stuck' : 'No sign-up codes here'}</h3>
              <p className="text-muted mb-0">{filter === 'help' ? 'Everyone waiting received their email.' : 'Codes appear when someone taps “Send code” on the sign-up form.'}</p>
            </div>
          )}

          <div className="d-flex flex-column gap-3">
            {items.map((i) => {
              const [dLabel, dCls, dIcon] = DELIVERY[i.delivery] || DELIVERY.unknown;
              return (
                <div key={i.email} className="admin-card p-3 p-md-4">
                  <div className="d-flex flex-wrap justify-content-between gap-3">
                    <div style={{ minWidth: 0 }}>
                      <div className="fw-semibold text-break" style={{ color: 'var(--maroon-900)' }}>{i.email}</div>
                      <div className="small text-muted">
                        {i.phone && <><i className="bi bi-phone me-1" />{i.phone} · </>}
                        requested {fmt(i.created_at)}
                      </div>
                      <div className="d-flex flex-wrap gap-2 mt-2">
                        <span className={`badge rounded-pill ${dCls}`}><i className={`bi ${dIcon} me-1`} />{dLabel}{i.delivery === 'admin' && i.issued_by ? ` · ${i.issued_by}` : ''}</span>
                        {i.status === 'registered' && <span className="badge rounded-pill bg-success"><i className="bi bi-person-check me-1" />Registered</span>}
                        {i.status === 'expired' && <span className="badge rounded-pill bg-secondary">Expired</span>}
                        {i.status === 'waiting' && <span className="badge rounded-pill bg-light text-dark border"><i className="bi bi-clock me-1" />{left(i.otp_expiry)}</span>}
                      </div>
                    </div>
                    {i.status !== 'registered' && (
                      <div className="d-flex flex-wrap gap-2 align-items-start">
                        {i.status === 'waiting' && !revealed[i.email] && (
                          <button className="btn btn-sm btn-primary" disabled={busy === `r-${i.email}`} onClick={() => reveal(i.email)}><i className="bi bi-eye me-1" />Show code</button>
                        )}
                        <button className="btn btn-sm btn-outline-primary" disabled={busy === `i-${i.email}`} onClick={() => issue(i.email, i.phone, 30)}>
                          <i className="bi bi-arrow-repeat me-1" />{i.status === 'expired' ? 'Issue new code' : 'New code'}
                        </button>
                        <button className="btn btn-sm btn-outline-secondary" disabled={busy === `c-${i.email}`} onClick={() => cancel(i.email)}>Cancel</button>
                      </div>
                    )}
                  </div>
                  {revealed[i.email] && i.status !== 'registered' && (
                    <div className="mt-3"><CodeCard data={revealed[i.email]} onClose={() => setRevealed((x) => { const y = { ...x }; delete y[i.email]; return y; })} /></div>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      </div>

      {toast && (
        <div className={`ix-toast ${toast.type === 'error' ? 'error' : ''}`} role="status">
          <i className={`bi ${toast.type === 'error' ? 'bi-exclamation-circle-fill' : 'bi-check-circle-fill'}`} /> <span>{toast.text}</span>
        </div>
      )}
    </div>
  );
}
