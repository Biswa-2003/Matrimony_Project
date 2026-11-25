'use client';

import { useEffect, useRef, useState } from 'react';

const fmtDate = (d) => (d ? new Date(d).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' }) : null);

export default function AdminMediaPage() {
  const [slots, setSlots] = useState(null);
  const [busy, setBusy] = useState(null);
  const [toast, setToast] = useState({ type: '', text: '' });
  const inputs = useRef({});

  const load = async () => {
    const r = await fetch('/api/admin/media', { cache: 'no-store' });
    const j = await r.json().catch(() => ({}));
    if (r.ok) setSlots(j.slots);
    else setToast({ type: 'error', text: j.error || 'Failed to load images' });
  };
  useEffect(() => { load(); }, []);
  useEffect(() => {
    if (!toast.text) return;
    const t = setTimeout(() => setToast({ type: '', text: '' }), 3200);
    return () => clearTimeout(t);
  }, [toast]);

  const upload = async (slot, file) => {
    if (!file) return;
    if (file.size > 4 * 1024 * 1024) return setToast({ type: 'error', text: 'Image is too large — please keep it under 4 MB.' });
    const preview = URL.createObjectURL(file);
    setSlots((s) => s.map((x) => (x.key === slot ? { ...x, url: preview, uploading: true } : x)));
    setBusy(slot);
    try {
      const fd = new FormData();
      fd.append('slot', slot);
      fd.append('file', file);
      const r = await fetch('/api/admin/media', { method: 'POST', body: fd });
      const j = await r.json().catch(() => ({}));
      if (!r.ok) throw new Error(j.error || 'Upload failed');
      setToast({ type: 'success', text: 'Image updated — it is live on the website now.' });
    } catch (e) {
      setToast({ type: 'error', text: e.message });
    } finally {
      setBusy(null);
      URL.revokeObjectURL(preview);
      if (inputs.current[slot]) inputs.current[slot].value = '';
      load();
    }
  };

  const reset = async (slot) => {
    setBusy(slot);
    try {
      const r = await fetch(`/api/admin/media?slot=${slot}`, { method: 'DELETE' });
      if (!r.ok) throw new Error('Could not restore');
      setToast({ type: 'success', text: 'Default artwork restored.' });
      load();
    } catch (e) {
      setToast({ type: 'error', text: e.message });
    } finally {
      setBusy(null);
    }
  };

  return (
    <div className="container-fluid p-0">
      <div className="admin-card p-4 mb-4 d-flex flex-wrap gap-3 align-items-center justify-content-between">
        <div>
          <h5 className="mb-1"><i className="bi bi-images me-2 text-gold" />Website images</h5>
          <small className="text-muted">
            Replace any picture on the public website. JPG, PNG, WebP or GIF up to 4 MB. Changes go live within a minute.
          </small>
        </div>
        <div className="d-flex gap-2 small text-muted">
          <span><span className="legend-dot" style={{ background: 'var(--gold)' }} /> Custom photo</span>
          <span className="ms-3"><span className="legend-dot" style={{ background: '#e6d7bf' }} /> Built-in artwork</span>
        </div>
      </div>

      <div className="row g-4">
        {(slots || [...Array(8)].map((_, i) => ({ key: `s${i}`, loading: true }))).map((s) => (
          <div key={s.key} className="col-sm-6 col-xl-3">
            {s.loading ? (
              <div className="admin-card loading-skeleton" style={{ height: 360 }} />
            ) : (
              <div className={`admin-card media-slot h-100 ${s.isCustom ? 'custom' : ''}`}>
                <div className="media-preview" style={{ aspectRatio: '4 / 3' }}>
                  <img src={s.url} alt={s.label} style={{ objectFit: s.isCustom || s.uploading ? 'cover' : 'contain', padding: s.isCustom || s.uploading ? 0 : '8%' }} />
                  <span className={`media-tag ${s.isCustom ? 'custom' : ''}`}>{s.isCustom ? 'Custom' : 'Default'}</span>
                  {busy === s.key && <div className="media-busy"><span className="spinner-border" /></div>}
                </div>
                <div className="p-3 d-flex flex-column flex-grow-1">
                  <div className="fw-semibold" style={{ color: 'var(--maroon-900)' }}>{s.label}</div>
                  <small className="text-muted mb-2">{s.where}</small>
                  {s.updatedAt && <small className="text-gold mb-2"><i className="bi bi-clock-history me-1" />Updated {fmtDate(s.updatedAt)}</small>}
                  <div className="d-flex gap-2 mt-auto">
                    <input
                      ref={(el) => (inputs.current[s.key] = el)}
                      type="file"
                      accept="image/jpeg,image/png,image/webp,image/gif"
                      className="d-none"
                      onChange={(e) => upload(s.key, e.target.files?.[0])}
                    />
                    <button type="button" className="btn btn-primary btn-sm flex-grow-1" disabled={busy === s.key} onClick={() => inputs.current[s.key]?.click()}>
                      <i className="bi bi-upload me-1" />{s.isCustom ? 'Replace' : 'Upload'}
                    </button>
                    {s.isCustom && (
                      <button type="button" className="btn btn-outline-secondary btn-sm" disabled={busy === s.key} onClick={() => reset(s.key)} title="Restore default artwork">
                        <i className="bi bi-arrow-counterclockwise" />
                      </button>
                    )}
                  </div>
                </div>
              </div>
            )}
          </div>
        ))}
      </div>

      {toast.text && (
        <div className="mm-toast" role="status" style={toast.type === 'error' ? { background: '#7a1530' } : undefined}>
          <i className={`bi ${toast.type === 'error' ? 'bi-exclamation-circle' : 'bi-check-circle'} me-2`} />{toast.text}
        </div>
      )}

      <style jsx global>{`
        .media-slot { overflow: hidden; display: flex; flex-direction: column; }
        .media-slot.custom { border-color: var(--gold) !important; }
        .media-preview { position: relative; background: linear-gradient(135deg, #fbf4e8, #f3e3c4); overflow: hidden; }
        .media-preview img { width: 100%; height: 100%; display: block; transition: transform 0.6s ease; }
        .media-slot:hover .media-preview img { transform: scale(1.04); }
        .media-tag { position: absolute; top: 10px; left: 10px; padding: 3px 10px; border-radius: 50px; font-size: 0.68rem; font-weight: 600; background: rgba(255,253,249,.92); color: var(--muted); border: 1px solid #e6d7bf; }
        .media-tag.custom { color: var(--maroon-900); background: var(--foil); border-color: var(--gold-dark); }
        .media-busy { position: absolute; inset: 0; display: flex; align-items: center; justify-content: center; background: rgba(255,253,249,.6); color: var(--maroon-700); }
        .legend-dot { display: inline-block; width: 10px; height: 10px; border-radius: 50%; margin-right: 6px; vertical-align: middle; }
      `}</style>
    </div>
  );
}
