'use client';

import { useEffect, useState } from 'react';

const TONES = [
  ['gold', 'Gold', 'var(--foil)'],
  ['maroon', 'Royal maroon', 'var(--royal)'],
  ['green', 'Success green', 'linear-gradient(90deg,#1f7a4a,#2a9d63)'],
];
const IDEAS = [
  'Diwali offer: 20% off Platinum membership this week only',
  'New: verified profiles now carry a gold badge',
  'Our support team is available 9 am – 9 pm, all 7 days',
];

export default function AdminSettingsPage() {
  const [a, setA] = useState(null);
  const [saving, setSaving] = useState(false);
  const [msg, setMsg] = useState({ type: '', text: '' });

  useEffect(() => {
    fetch('/api/admin/settings', { cache: 'no-store' })
      .then((r) => r.json())
      .then((j) => setA(j.announcement || { enabled: false, text: '', linkText: '', linkUrl: '', tone: 'gold' }))
      .catch(() => setMsg({ type: 'error', text: 'Failed to load settings' }));
  }, []);

  const save = async () => {
    setSaving(true);
    setMsg({ type: '', text: '' });
    try {
      const r = await fetch('/api/admin/settings', { method: 'PUT', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ announcement: a }) });
      const j = await r.json().catch(() => ({}));
      if (!r.ok) throw new Error(j.error || 'Save failed');
      setA(j.announcement);
      setMsg({ type: 'success', text: a.enabled ? 'Saved — the announcement is live on the website.' : 'Saved — the announcement is turned off.' });
    } catch (e) {
      setMsg({ type: 'error', text: e.message });
    } finally {
      setSaving(false);
    }
  };

  if (!a) return <div className="admin-card loading-skeleton" style={{ height: 420 }} />;
  const set = (patch) => setA((x) => ({ ...x, ...patch }));

  return (
    <div className="row g-4">
      <div className="col-xl-7">
        <div className="admin-card p-4 p-lg-5">
          <div className="d-flex justify-content-between align-items-start mb-4">
            <div>
              <h5 className="mb-1"><i className="bi bi-megaphone me-2 text-gold" />Announcement bar</h5>
              <small className="text-muted">A slim banner shown at the top of every public and member page.</small>
            </div>
            <div className="form-check form-switch fs-5 m-0">
              <input className="form-check-input" type="checkbox" role="switch" id="ann-on" checked={a.enabled} onChange={(e) => set({ enabled: e.target.checked })} />
              <label className="visually-hidden" htmlFor="ann-on">Show announcement</label>
            </div>
          </div>

          <label className="form-label" htmlFor="ann-text">Message</label>
          <input id="ann-text" className="form-control mb-1" maxLength={180} value={a.text} onChange={(e) => set({ text: e.target.value })} placeholder="Write a short, friendly message" />
          <div className="small text-muted text-end mb-2">{a.text.length}/180</div>
          <div className="d-flex flex-wrap gap-2 mb-4">
            {IDEAS.map((t) => <button key={t} type="button" className="sf-pill" onClick={() => set({ text: t })}>{t}</button>)}
          </div>

          <div className="row g-3 mb-4">
            <div className="col-md-5">
              <label className="form-label" htmlFor="ann-lt">Button text (optional)</label>
              <input id="ann-lt" className="form-control" maxLength={40} value={a.linkText} onChange={(e) => set({ linkText: e.target.value })} placeholder="e.g. View plans" />
            </div>
            <div className="col-md-7">
              <label className="form-label" htmlFor="ann-lu">Link (optional)</label>
              <input id="ann-lu" className="form-control" value={a.linkUrl} onChange={(e) => set({ linkUrl: e.target.value })} placeholder="/matrimoney/package or https://…" />
            </div>
          </div>

          <label className="form-label d-block">Style</label>
          <div className="d-flex flex-wrap gap-2 mb-4">
            {TONES.map(([k, l, bg]) => (
              <button key={k} type="button" className={`tone-pick ${a.tone === k ? 'on' : ''}`} onClick={() => set({ tone: k })}>
                <span style={{ background: bg }} />{l}
              </button>
            ))}
          </div>

          {msg.text && <div className={`alert ${msg.type === 'error' ? 'alert-danger' : 'alert-success'} py-2 small`}>{msg.text}</div>}
          <button className="btn btn-primary px-5" onClick={save} disabled={saving}>
            {saving ? <><span className="spinner-border spinner-border-sm me-2" />Saving…</> : 'Save settings'}
          </button>
        </div>
      </div>

      <div className="col-xl-5">
        <div className="admin-card p-4">
          <div className="nav-menu-label p-0 mb-3">Live preview</div>
          <div className="preview-browser">
            <div className="preview-chrome"><span /><span /><span /></div>
            <div className="preview-nav"><span className="brand-mark" style={{ width: 24, height: 24 }} /> MatriMoney</div>
            {a.enabled && a.text ? (
              <div className={`announce-bar tone-${a.tone}`} style={{ fontSize: '0.78rem' }}>
                <div className="d-flex align-items-center justify-content-center gap-2 px-2">
                  <i className="bi bi-megaphone-fill" />
                  <span className="text-truncate">{a.text}</span>
                  {a.linkText && <span className="announce-link">{a.linkText} →</span>}
                </div>
              </div>
            ) : (
              <div className="text-center small text-muted py-2" style={{ background: '#fbf4e8' }}>Announcement is off</div>
            )}
            <div className="preview-body" />
          </div>
          <small className="text-muted d-block mt-3"><i className="bi bi-info-circle me-1" />Visitors can dismiss it; it shows again in their next session or when you change the text.</small>
        </div>
      </div>

      <style jsx global>{`
        .tone-pick { display: inline-flex; align-items: center; gap: 8px; padding: 6px 14px 6px 6px; border-radius: 50px; border: 1px solid #e6d7bf; background: #fff; font-size: 0.85rem; }
        .tone-pick span { width: 26px; height: 26px; border-radius: 50%; border: 2px solid #fff; box-shadow: 0 0 0 1px #e6d7bf; }
        .tone-pick.on { border-color: var(--maroon-700); box-shadow: 0 0 0 3px rgba(201,162,74,.25); }
        .preview-browser { border-radius: 16px; overflow: hidden; border: 1px solid #e6d7bf; background: #fff; }
        .preview-chrome { display: flex; gap: 6px; padding: 8px 10px; background: #f3ece0; }
        .preview-chrome span { width: 9px; height: 9px; border-radius: 50%; background: #d9c9ad; }
        .preview-nav { display: flex; align-items: center; gap: 8px; padding: 10px 14px; font-family: var(--font-display); font-weight: 700; color: var(--maroon-800); border-bottom: 1px solid #f1e6d4; }
        .preview-body { height: 140px; background: url('/images/paisley-light.svg') repeat, var(--royal); }
      `}</style>
    </div>
  );
}
