'use client';

import Link from 'next/link';
import { useCallback, useEffect, useRef, useState } from 'react';

const TIPS = [
  ['bi-brightness-high', 'Use natural light and face the camera'],
  ['bi-person-bounding-box', 'Only you in the photo — no group shots for the main photo'],
  ['bi-emoji-smile', 'A clear, recent, smiling photo works best'],
  ['bi-ban', 'No sunglasses, filters, or contact details on the image'],
];

export default function PhotoManagerPage() {
  const [data, setData] = useState(null);
  const [error, setError] = useState('');
  const [busy, setBusy] = useState('');
  const [toast, setToast] = useState(null);
  const [drag, setDrag] = useState(false);
  const [confirmId, setConfirmId] = useState(null);
  const fileRef = useRef(null);

  const load = useCallback(async () => {
    try {
      const r = await fetch('/api/photos', { cache: 'no-store' });
      if (!r.ok) throw new Error();
      setData(await r.json());
      setError('');
    } catch {
      setError('Could not load your photos.');
    }
  }, []);
  useEffect(() => { load(); }, [load]);

  useEffect(() => {
    if (!toast) return;
    const t = setTimeout(() => setToast(null), 3500);
    return () => clearTimeout(t);
  }, [toast]);

  const upload = async (files) => {
    const list = Array.from(files || []).slice(0, Math.max(0, (data?.max || 8) - (data?.photos?.length || 0)));
    if (!list.length) return setToast({ type: 'error', text: `You can have up to ${data?.max || 8} photos.` });
    setBusy('upload');
    let ok = 0;
    for (const f of list) {
      const fd = new FormData();
      fd.append('photo', f);
      try {
        const r = await fetch('/api/upload-photo', { method: 'POST', body: fd });
        const j = await r.json().catch(() => ({}));
        if (!r.ok) throw new Error(j.error || 'Upload failed');
        ok++;
      } catch (e) {
        setToast({ type: 'error', text: `${f.name}: ${e.message}` });
      }
    }
    setBusy('');
    if (ok) setToast({ type: 'success', text: ok === 1 ? 'Photo added.' : `${ok} photos added.` });
    if (fileRef.current) fileRef.current.value = '';
    load();
  };

  const act = async (key, fn, okText) => {
    setBusy(key);
    try {
      const r = await fn();
      const j = await r.json().catch(() => ({}));
      if (!r.ok) throw new Error(j.error || 'Something went wrong');
      if (okText) setToast({ type: 'success', text: okText });
      await load();
    } catch (e) {
      setToast({ type: 'error', text: e.message });
    } finally {
      setBusy('');
      setConfirmId(null);
    }
  };

  const setPrimary = (id) => act(`p-${id}`, () => fetch('/api/photos', {
    method: 'PATCH', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ id, action: 'primary' }),
  }), 'Main photo updated.');
  const remove = (id) => act(`d-${id}`, () => fetch(`/api/photos?id=${id}`, { method: 'DELETE' }), 'Photo deleted.');
  const setLock = (locked) => act('lock', () => fetch('/api/photos', {
    method: 'PATCH', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ locked }),
  }), locked ? 'Photos are now visible only to your connections.' : 'Photos are visible to all members.');

  const photos = data?.photos || [];
  const slotsLeft = (data?.max || 8) - photos.length;

  return (
    <div className="ph-page">
      <div className="container">
        <div className="ph-head">
          <div>
            <span className="eyebrow">Your gallery</span>
            <h1 className="ph-title">My Photos</h1>
            <p className="text-muted mb-0">Profiles with clear photos get far more interests. Add up to {data?.max || 8}.</p>
          </div>
          <Link href="/dashboard/profile-edit" className="btn btn-outline-primary rounded-pill px-3"><i className="bi bi-pencil me-1" />Edit profile</Link>
        </div>

        {error && <div className="rp-alert error">{error} <button className="btn btn-link btn-sm p-0 ms-2" onClick={load}>Retry</button></div>}

        {data?.requests?.pending > 0 && (
          <div className="ph-requests">
            <i className="bi bi-camera-fill" />
            <div>
              <strong>{data.requests.pending} member{data.requests.pending > 1 ? 's' : ''} asked to see your photo</strong>
              <div className="small">
                {data.requests.recent.slice(0, 3).map((r) => r.name).join(', ')}{data.requests.pending > 3 ? ' and others' : ''}.{' '}
                {!photos.length ? 'Adding a photo lets them know.'
                  : data.locked ? 'Your photos are protected — accept their interest to share them.'
                    : 'Your photos are already visible to them.'}
              </div>
            </div>
          </div>
        )}

        <div className="row g-4">
          <div className="col-lg-8">
            <div className="ph-grid">
              {!data && !error && [0, 1, 2].map((i) => <div key={i} className="ph-tile ph-skel" />)}

              {photos.map((p) => (
                <div key={p.id} className={`ph-tile ${p.is_primary ? 'is-primary' : ''}`}>
                  <img src={p.url} alt="" />
                  {p.is_primary && <span className="ph-main"><i className="bi bi-star-fill" /> Main photo</span>}
                  {confirmId === p.id ? (
                    <div className="ph-confirm">
                      <span>Delete this photo?</span>
                      <div className="d-flex gap-2">
                        <button className="btn btn-sm btn-light rounded-pill" onClick={() => setConfirmId(null)}>Keep</button>
                        <button className="btn btn-sm btn-danger rounded-pill" disabled={busy === `d-${p.id}`} onClick={() => remove(p.id)}>Delete</button>
                      </div>
                    </div>
                  ) : (
                    <div className="ph-actions">
                      {!p.is_primary && (
                        <button type="button" disabled={!!busy} onClick={() => setPrimary(p.id)} title="Make main photo"><i className="bi bi-star" /> Make main</button>
                      )}
                      <button type="button" className="danger" disabled={!!busy} onClick={() => setConfirmId(p.id)} title="Delete"><i className="bi bi-trash" /></button>
                    </div>
                  )}
                </div>
              ))}

              {data && slotsLeft > 0 && (
                <label
                  className={`ph-tile ph-add ${drag ? 'drag' : ''}`}
                  onDragOver={(e) => { e.preventDefault(); setDrag(true); }}
                  onDragLeave={() => setDrag(false)}
                  onDrop={(e) => { e.preventDefault(); setDrag(false); upload(e.dataTransfer.files); }}
                >
                  <input ref={fileRef} type="file" accept="image/jpeg,image/png,image/webp" multiple hidden
                    onChange={(e) => upload(e.target.files)} disabled={busy === 'upload'} />
                  {busy === 'upload' ? (
                    <><span className="spinner-border" /><span className="mt-2 small">Uploading…</span></>
                  ) : (
                    <>
                      <i className="bi bi-cloud-arrow-up" />
                      <strong>Add photos</strong>
                      <span className="small text-muted">Drag & drop or click · JPG, PNG, WebP · max 4 MB</span>
                      <span className="small text-muted">{slotsLeft} of {data.max} slots left</span>
                    </>
                  )}
                </label>
              )}
            </div>
          </div>

          <div className="col-lg-4">
            <div className="ph-side">
              <h6 className="fw-bold mb-3" style={{ color: 'var(--maroon-900)' }}><i className="bi bi-shield-lock me-2" />Photo privacy</h6>
              <label className={`ph-opt ${data && !data.locked ? 'on' : ''}`}>
                <input type="radio" name="lock" checked={data ? !data.locked : false} disabled={!data || busy === 'lock'} onChange={() => setLock(false)} />
                <span><strong>All members</strong><small>Logged-in members can see your photos.</small></span>
              </label>
              <label className={`ph-opt ${data?.locked ? 'on' : ''}`}>
                <input type="radio" name="lock" checked={Boolean(data?.locked)} disabled={!data || busy === 'lock'} onChange={() => setLock(true)} />
                <span><strong>Only my connections</strong><small>Others see a “Photo protected” card until you accept their interest. The real photo is never sent to them.</small></span>
              </label>

              <h6 className="fw-bold mt-4 mb-2" style={{ color: 'var(--maroon-900)' }}><i className="bi bi-lightbulb me-2" />Photo tips</h6>
              <ul className="ph-tips">
                {TIPS.map(([i, t]) => <li key={t}><i className={`bi ${i}`} />{t}</li>)}
              </ul>
            </div>
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
