'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';

const photoOf = (it) => {
  const p = it.photo_url;
  if (!p) return String(it.gender).toLowerCase() === 'male' ? '/images/avatar-male.svg' : '/images/avatar-female.svg';
  if (/^(https?:|data:|\/)/.test(p)) return p;
  return `/uploads/${p}`;
};

/** Dashboard panel: interests received that still need an answer, with instant Accept / Decline. */
export default function PendingInterests() {
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(null);
  const [note, setNote] = useState('');

  useEffect(() => {
    let alive = true;
    fetch('/api/interest?type=received&status=sent&limit=5', { credentials: 'include', cache: 'no-store' })
      .then((r) => (r.ok ? r.json() : { results: [] }))
      .then((j) => alive && setItems(j.results || []))
      .catch(() => {})
      .finally(() => alive && setLoading(false));
    return () => {
      alive = false;
    };
  }, []);

  const respond = async (it, action) => {
    setBusy(it.id);
    const prev = items;
    setItems((list) => list.filter((x) => x.id !== it.id)); // optimistic
    try {
      const r = await fetch('/api/interest', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id: it.id, action }),
      });
      if (!r.ok) throw new Error();
      setNote(action === 'accept' ? `You are now connected with ${it.full_name}. 💛` : `Interest from ${it.full_name} declined.`);
    } catch {
      setItems(prev);
      setNote('Could not update. Please try again.');
    } finally {
      setBusy(null);
      setTimeout(() => setNote(''), 3000);
    }
  };

  if (loading) return <div className="luxe-card loading-skeleton mb-4" style={{ height: 120 }} />;
  if (!items.length && !note) return null;

  return (
    <div className="luxe-card p-4 mb-4">
      <div className="d-flex justify-content-between align-items-center mb-3">
        <div>
          <span className="eyebrow" style={{ fontSize: '0.6rem' }}>Awaiting Your Reply</span>
          <h5 className="mb-0 mt-1">Interests Received</h5>
        </div>
        <Link href="/matrimoney/interests?filter=received" className="small text-danger fw-semibold">See all →</Link>
      </div>

      {note && <div className="alert alert-success py-2 small mb-3">{note}</div>}

      <div className="d-flex flex-column gap-2">
        {items.map((it) => (
          <div key={it.id} className="d-flex align-items-center gap-3 p-2 rounded-4" style={{ border: '1px solid rgba(201,162,74,.25)', background: '#fffdf9' }}>
            <img
              src={photoOf(it)}
              alt=""
              width={52}
              height={52}
              className="rounded-circle object-fit-cover flex-shrink-0"
              style={{ border: '2px solid var(--gold-light)' }}
              onError={(e) => { e.currentTarget.onerror = null; e.currentTarget.src = '/images/avatar-female.svg'; }}
            />
            <div className="flex-grow-1 overflow-hidden">
              <Link href={`/matrimoney/profile-details/${it.matri_id}`} className="fw-semibold d-block text-truncate" style={{ color: 'var(--maroon-900)' }}>
                {it.full_name}
              </Link>
              <small className="text-muted">
                {[it.age_years && `${it.age_years} yrs`, it.city_name, it.profession_name].filter(Boolean).join(' · ') || it.matri_id}
              </small>
            </div>
            <div className="d-flex gap-2 flex-shrink-0">
              <button className="btn btn-sm btn-outline-secondary px-3" disabled={busy === it.id} onClick={() => respond(it, 'decline')}>
                Decline
              </button>
              <button className="btn btn-sm btn-primary px-3" disabled={busy === it.id} onClick={() => respond(it, 'accept')}>
                Accept
              </button>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
