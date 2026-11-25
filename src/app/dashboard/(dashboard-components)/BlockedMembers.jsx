'use client';

import { useEffect, useState } from 'react';

/** Settings panel: list of members I've blocked, with Unblock. */
export default function BlockedMembers() {
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch('/api/block', { credentials: 'include', cache: 'no-store' })
      .then((r) => (r.ok ? r.json() : { results: [] }))
      .then((j) => setItems(j.results || []))
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  const unblock = async (matriId) => {
    const prev = items;
    setItems((l) => l.filter((x) => x.matri_id !== matriId));
    const r = await fetch(`/api/block?matri_id=${encodeURIComponent(matriId)}`, { method: 'DELETE' }).catch(() => null);
    if (!r || !r.ok) setItems(prev);
  };

  return (
    <div className="fade-in-up">
      <h5 className="fw-bold text-maroon mb-1">Blocked Members</h5>
      <p className="text-muted small mb-4">
        Blocked members can&apos;t see your profile, send you interests or message you — and you won&apos;t see them.
      </p>
      {loading && <div className="text-muted small">Loading…</div>}
      {!loading && items.length === 0 && (
        <div className="p-4 rounded-4 text-center text-muted" style={{ background: 'var(--gold-pale)' }}>
          <i className="bi bi-shield-check fs-3 d-block mb-2 text-gold" />
          You haven&apos;t blocked anyone.
        </div>
      )}
      <div className="d-flex flex-column gap-2">
        {items.map((m) => (
          <div key={m.matri_id} className="d-flex align-items-center gap-3 p-2 rounded-4" style={{ border: '1px solid #ecdfc9' }}>
            <img
              src={m.photo || (String(m.gender).toLowerCase() === 'male' ? '/images/avatar-male.svg' : '/images/avatar-female.svg')}
              alt=""
              width={44}
              height={44}
              className="rounded-circle object-fit-cover"
              onError={(e) => { e.currentTarget.onerror = null; e.currentTarget.src = '/images/avatar-female.svg'; }}
            />
            <div className="flex-grow-1">
              <div className="fw-semibold">{m.full_name || m.matri_id}</div>
              <small className="text-muted">{m.matri_id}</small>
            </div>
            <button className="btn btn-sm btn-outline-danger px-3" onClick={() => unblock(m.matri_id)}>Unblock</button>
          </div>
        ))}
      </div>
    </div>
  );
}
