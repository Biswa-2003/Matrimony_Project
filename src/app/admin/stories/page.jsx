'use client';

import { useCallback, useEffect, useState } from 'react';
import { Modal } from 'react-bootstrap';

const EMPTY = { id: null, couple_name: '', story: '', marriage_date: '', rating: 5, is_approved: true, image_url: '' };
const fmt = (d) => (d ? new Date(d).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' }) : '—');

export default function AdminStoriesPage() {
  const [status, setStatus] = useState('all');
  const [data, setData] = useState({ results: [], counts: { approved: 0, pending: 0 } });
  const [loading, setLoading] = useState(true);
  const [form, setForm] = useState(null); // null = closed
  const [file, setFile] = useState(null);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [toast, setToast] = useState('');

  const load = useCallback(async () => {
    setLoading(true);
    const r = await fetch(`/api/admin/stories?status=${status}`, { cache: 'no-store' });
    const j = await r.json().catch(() => ({}));
    if (r.ok) setData(j);
    setLoading(false);
  }, [status]);
  useEffect(() => { load(); }, [load]);
  useEffect(() => {
    if (!toast) return;
    const t = setTimeout(() => setToast(''), 2600);
    return () => clearTimeout(t);
  }, [toast]);

  const open = (s) => {
    setError('');
    setFile(null);
    setForm(s ? { ...EMPTY, ...s, marriage_date: s.marriage_date ? String(s.marriage_date).slice(0, 10) : '' } : { ...EMPTY });
  };

  const save = async () => {
    if (!form.couple_name.trim() || !form.story.trim()) return setError('Couple name and story are required.');
    setSaving(true);
    setError('');
    try {
      const fd = new FormData();
      if (form.id) fd.append('id', form.id);
      fd.append('couple_name', form.couple_name);
      fd.append('story', form.story);
      fd.append('marriage_date', form.marriage_date || '');
      fd.append('rating', String(form.rating));
      fd.append('is_approved', String(form.is_approved));
      if (file) fd.append('image', file);
      const r = await fetch('/api/admin/stories', { method: form.id ? 'PATCH' : 'POST', body: fd });
      const j = await r.json().catch(() => ({}));
      if (!r.ok) throw new Error(j.error || 'Save failed');
      setForm(null);
      setToast(form.id ? 'Story updated' : 'Story added');
      load();
    } catch (e) {
      setError(e.message);
    } finally {
      setSaving(false);
    }
  };

  const toggle = async (s) => {
    setData((d) => ({ ...d, results: d.results.map((x) => (x.id === s.id ? { ...x, is_approved: !s.is_approved } : x)) }));
    const r = await fetch('/api/admin/stories', { method: 'PATCH', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ id: s.id, is_approved: !s.is_approved }) });
    setToast(r.ok ? (s.is_approved ? 'Story hidden from the website' : 'Story published') : 'Update failed');
    load();
  };

  const remove = async (s) => {
    if (!window.confirm(`Delete the story of “${s.couple_name}”? This cannot be undone.`)) return;
    const r = await fetch(`/api/admin/stories?id=${s.id}`, { method: 'DELETE' });
    setToast(r.ok ? 'Story deleted' : 'Delete failed');
    load();
  };

  const preview = file ? URL.createObjectURL(file) : form?.image_url;

  return (
    <div className="container-fluid p-0">
      <div className="d-flex flex-wrap gap-2 align-items-center justify-content-between mb-4">
        <div className="match-tabs" style={{ display: 'inline-flex' }}>
          {[
            ['all', 'All', data.counts.approved + data.counts.pending],
            ['approved', 'Published', data.counts.approved],
            ['pending', 'Awaiting approval', data.counts.pending],
          ].map(([k, l, n]) => (
            <button key={k} className={`match-tab border-0 ${status === k ? 'active' : 'bg-transparent'}`} onClick={() => setStatus(k)}>
              {l} <span className="badge rounded-pill bg-light text-dark ms-1">{n}</span>
            </button>
          ))}
        </div>
        <button className="btn btn-gold px-4" onClick={() => open(null)}><i className="bi bi-plus-lg me-1" />Add Story</button>
      </div>

      {loading ? (
        <div className="row g-4">{[0, 1, 2].map((i) => <div key={i} className="col-md-6 col-xl-4"><div className="admin-card loading-skeleton" style={{ height: 320 }} /></div>)}</div>
      ) : data.results.length === 0 ? (
        <div className="admin-card p-5 text-center">
          <div className="why-icon"><i className="bi bi-hearts" /></div>
          <h3 style={{ fontSize: '1.8rem' }}>No stories here</h3>
          <p className="text-muted">Add a couple’s story to inspire new members.</p>
          <button className="btn btn-primary px-4" onClick={() => open(null)}>Add the first story</button>
        </div>
      ) : (
        <div className="row g-4">
          {data.results.map((s) => (
            <div key={s.id} className="col-md-6 col-xl-4">
              <div className={`admin-card story-admin h-100 ${s.is_approved ? '' : 'pending'}`}>
                <div className="d-flex gap-3 p-3 align-items-center">
                  <img src={s.image_url || '/images/couple-mandap.svg'} alt="" className="story-admin-img"
                    onError={(e) => { e.currentTarget.onerror = null; e.currentTarget.src = '/images/couple-mandap.svg'; }} />
                  <div className="overflow-hidden">
                    <div className="fw-semibold text-truncate" style={{ color: 'var(--maroon-900)' }}>{s.couple_name}</div>
                    <div className="text-warning small">{'★'.repeat(s.rating || 5)}<span className="text-muted">{'★'.repeat(5 - (s.rating || 5))}</span></div>
                    <small className="text-muted">Married {fmt(s.marriage_date)}</small>
                  </div>
                  <span className={`badge rounded-pill ms-auto ${s.is_approved ? 'bg-success-subtle text-success' : 'bg-warning-subtle text-dark'}`}>
                    {s.is_approved ? 'Live' : 'Pending'}
                  </span>
                </div>
                <p className="px-3 small text-muted story-admin-text">“{s.story}”</p>
                <div className="d-flex gap-2 p-3 pt-0 mt-auto">
                  <button className={`btn btn-sm flex-grow-1 ${s.is_approved ? 'btn-outline-secondary' : 'btn-primary'}`} onClick={() => toggle(s)}>
                    <i className={`bi ${s.is_approved ? 'bi-eye-slash' : 'bi-check2-circle'} me-1`} />{s.is_approved ? 'Hide' : 'Publish'}
                  </button>
                  <button className="btn btn-sm btn-outline-danger" onClick={() => open(s)} title="Edit"><i className="bi bi-pencil" /></button>
                  <button className="btn btn-sm btn-outline-secondary" onClick={() => remove(s)} title="Delete"><i className="bi bi-trash" /></button>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      <Modal show={Boolean(form)} onHide={() => setForm(null)} centered size="lg">
        {form && (
          <>
            <Modal.Header closeButton>
              <Modal.Title style={{ fontFamily: 'var(--font-display)', fontSize: '1.8rem' }}>{form.id ? 'Edit story' : 'Add a success story'}</Modal.Title>
            </Modal.Header>
            <Modal.Body className="p-4">
              <div className="row g-4">
                <div className="col-md-4 text-center">
                  <div className="story-admin-preview mb-2">
                    <img src={preview || '/images/couple-mandap.svg'} alt="" />
                  </div>
                  <label className="btn btn-outline-danger btn-sm w-100">
                    <i className="bi bi-camera me-1" />{preview ? 'Change photo' : 'Add photo'}
                    <input type="file" accept="image/jpeg,image/png,image/webp,image/gif" hidden onChange={(e) => setFile(e.target.files?.[0] || null)} />
                  </label>
                  <small className="text-muted d-block mt-1">JPG/PNG/WebP, max 4 MB</small>
                </div>
                <div className="col-md-8">
                  <label className="form-label" htmlFor="st-name">Couple name</label>
                  <input id="st-name" className="form-control mb-3" value={form.couple_name} onChange={(e) => setForm({ ...form, couple_name: e.target.value })} placeholder="e.g. Ananya & Rohit" />
                  <div className="row g-3 mb-3">
                    <div className="col-6">
                      <label className="form-label" htmlFor="st-date">Wedding date</label>
                      <input id="st-date" type="date" className="form-control" value={form.marriage_date} onChange={(e) => setForm({ ...form, marriage_date: e.target.value })} />
                    </div>
                    <div className="col-6">
                      <label className="form-label d-block">Rating</label>
                      <div className="star-input">
                        {[1, 2, 3, 4, 5].map((n) => (
                          <button key={n} type="button" className={n <= form.rating ? 'on' : ''} onClick={() => setForm({ ...form, rating: n })} aria-label={`${n} stars`}>★</button>
                        ))}
                      </div>
                    </div>
                  </div>
                  <label className="form-label" htmlFor="st-story">Their story</label>
                  <textarea id="st-story" className="form-control" rows={5} maxLength={2000} value={form.story} onChange={(e) => setForm({ ...form, story: e.target.value })} />
                  <div className="small text-muted text-end">{form.story.length}/2000</div>
                  <div className="form-check form-switch mt-2">
                    <input className="form-check-input" type="checkbox" id="st-live" checked={form.is_approved} onChange={(e) => setForm({ ...form, is_approved: e.target.checked })} />
                    <label className="form-check-label small" htmlFor="st-live">Show on the website</label>
                  </div>
                  {error && <div className="alert alert-danger py-2 small mt-3 mb-0">{error}</div>}
                </div>
              </div>
            </Modal.Body>
            <Modal.Footer>
              <button className="btn btn-outline-secondary px-4" onClick={() => setForm(null)}>Cancel</button>
              <button className="btn btn-primary px-4" onClick={save} disabled={saving}>
                {saving ? <><span className="spinner-border spinner-border-sm me-2" />Saving…</> : 'Save story'}
              </button>
            </Modal.Footer>
          </>
        )}
      </Modal>

      {toast && <div className="mm-toast" role="status"><i className="bi bi-check-circle me-2" />{toast}</div>}

      <style jsx global>{`
        .story-admin { display: flex; flex-direction: column; }
        .story-admin.pending { border-style: dashed !important; border-color: var(--gold) !important; }
        .story-admin-img { width: 58px; height: 58px; border-radius: 50%; object-fit: cover; border: 2px solid var(--gold-light); background: #f6ead0; flex-shrink: 0; }
        .story-admin-text { display: -webkit-box; -webkit-line-clamp: 4; -webkit-box-orient: vertical; overflow: hidden; font-style: italic; }
        .story-admin-preview { aspect-ratio: 1 / 1; border-radius: 50%; padding: 4px; background: var(--foil); }
        .story-admin-preview img { width: 100%; height: 100%; object-fit: cover; border-radius: 50%; background: #f6ead0; }
        .star-input button { border: 0; background: transparent; font-size: 1.6rem; color: #e6d7bf; padding: 0 2px; line-height: 1; }
        .star-input button.on { color: var(--gold); }
      `}</style>
    </div>
  );
}
