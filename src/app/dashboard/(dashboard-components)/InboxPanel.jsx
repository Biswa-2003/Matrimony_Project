'use client';

import { useCallback, useEffect, useState } from 'react';
import Link from 'next/link';
import { AnimatePresence, motion } from 'framer-motion';

const avatarFor = (g) => (String(g).toLowerCase() === 'male' ? '/images/avatar-male.svg' : '/images/avatar-female.svg');
const photoOf = (p, g) => {
  if (!p || /default\.jpg$/.test(p)) return avatarFor(g);
  if (/^(https?:|data:|\/)/.test(p)) return p;
  return `/uploads/${p}`;
};
const ago = (ts) => {
  if (!ts) return '';
  const s = Math.max(1, Math.floor((Date.now() - new Date(ts).getTime()) / 1000));
  if (s < 3600) return `${Math.max(1, Math.floor(s / 60))}m ago`;
  if (s < 86400) return `${Math.floor(s / 3600)}h ago`;
  const d = Math.floor(s / 86400);
  return d < 30 ? `${d}d ago` : new Date(ts).toLocaleDateString('en-IN', { day: 'numeric', month: 'short' });
};

const TABS = [
  { key: 'requests', label: 'Requests', icon: 'bi-envelope-heart' },
  { key: 'visitors', label: 'Visitors', icon: 'bi-eye' },
  { key: 'connections', label: 'Connections', icon: 'bi-hearts' },
  { key: 'new', label: 'New Members', icon: 'bi-stars' },
];

/**
 * Tabbed "inbox" for everything people-related: interest requests (accept/decline inline),
 * recent visitors, connections and newly joined members. Each tab loads on first open.
 */
export default function InboxPanel({ counts = {}, visitors = [] }) {
  const [tab, setTab] = useState('requests');
  const [data, setData] = useState({ visitors });
  const [loading, setLoading] = useState({});
  const [busy, setBusy] = useState(null);
  const [note, setNote] = useState('');

  useEffect(() => setData((d) => ({ ...d, visitors })), [visitors]);

  const load = useCallback(async (key) => {
    const urls = {
      requests: '/api/interest?type=received&status=sent&limit=8',
      connections: '/api/interest?status=accepted&limit=8',
      new: '/api/recent-users?limit=8&months=12',
    };
    if (!urls[key]) return;
    setLoading((l) => ({ ...l, [key]: true }));
    try {
      const r = await fetch(urls[key], { credentials: 'include', cache: 'no-store' });
      const j = r.ok ? await r.json() : {};
      setData((d) => ({ ...d, [key]: j.results || j.users || [] }));
    } catch {
      setData((d) => ({ ...d, [key]: [] }));
    } finally {
      setLoading((l) => ({ ...l, [key]: false }));
    }
  }, []);

  useEffect(() => {
    if (data[tab] === undefined) load(tab);
  }, [tab, data, load]);

  const respond = async (it, action) => {
    setBusy(it.id);
    const prev = data.requests;
    setData((d) => ({ ...d, requests: d.requests.filter((x) => x.id !== it.id) }));
    try {
      const r = await fetch('/api/interest', { method: 'PATCH', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ id: it.id, action }) });
      if (!r.ok) throw new Error();
      setNote(action === 'accept' ? `You're now connected with ${it.full_name} 💛` : `Declined ${it.full_name}'s interest`);
      if (action === 'accept') setData((d) => ({ ...d, connections: undefined })); // refresh on next open
    } catch {
      setData((d) => ({ ...d, requests: prev }));
      setNote('Could not update. Please try again.');
    } finally {
      setBusy(null);
      setTimeout(() => setNote(''), 3000);
    }
  };

  const list = data[tab] || [];
  const badge = { requests: counts.pending_received, visitors: counts.visitors, connections: counts.connections };

  const empty = {
    requests: ['bi-envelope-open-heart', 'No pending requests', 'When someone sends you an interest it will appear here.'],
    visitors: ['bi-eye', 'No visitors yet', 'A clear photo and a complete profile attract more visitors.'],
    connections: ['bi-hearts', 'No connections yet', 'Accept interests or send your own to start connecting.'],
    new: ['bi-stars', 'No new members right now', 'Check back soon — families join every day.'],
  }[tab];

  return (
    <div className="luxe-card inbox h-100">
      <div className="inbox-head">
        <div>
          <span className="eyebrow" style={{ fontSize: '0.6rem' }}>Your Inbox</span>
          <h5 className="mb-0 mt-1">People &amp; Activity</h5>
        </div>
        <span className="live-pill"><span className="dot" />Live</span>
      </div>

      <div className="inbox-tabs" role="tablist">
        {TABS.map((t) => (
          <button key={t.key} role="tab" aria-selected={tab === t.key} className={`inbox-tab ${tab === t.key ? 'active' : ''}`} onClick={() => setTab(t.key)}>
            <i className={`bi ${t.icon}`} />
            <span>{t.label}</span>
            {Number(badge[t.key]) > 0 && <span className="inbox-badge">{badge[t.key]}</span>}
          </button>
        ))}
      </div>

      {note && <div className="alert alert-success py-2 small mx-3 mt-3 mb-0">{note}</div>}

      <div className="inbox-body">
        <AnimatePresence mode="wait" initial={false}>
          <motion.div key={tab} initial={{ opacity: 0, x: 12 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -12 }} transition={{ duration: 0.2 }}>
            {loading[tab] ? (
              [0, 1, 2].map((k) => <div key={k} className="inbox-row loading-skeleton" style={{ height: 64, background: '#f6ead0' }} />)
            ) : list.length === 0 ? (
              <div className="text-center py-4 px-3">
                <span className="why-icon" style={{ width: 56, height: 56, fontSize: '1.3rem' }}><i className={`bi ${empty[0]}`} /></span>
                <div className="fw-semibold" style={{ color: 'var(--maroon-900)' }}>{empty[1]}</div>
                <small className="text-muted d-block mb-3">{empty[2]}</small>
                <Link href="/matrimoney/preference-search" className="btn btn-sm btn-outline-danger px-3">Find matches</Link>
              </div>
            ) : (
              list.map((it) => {
                const name = it.full_name || it.first_name || it.name || 'Member';
                const matri = it.matri_id;
                const photo = photoOf(it.photo_url || it.photo, it.gender);
                const meta =
                  tab === 'visitors' ? `Visited ${ago(it.viewed_at)}`
                  : tab === 'new' ? `Active ${ago(it.created_at)}`
                  : [it.age_years && `${it.age_years} yrs`, it.city_name, it.profession_name].filter(Boolean).join(' · ') || matri;
                return (
                  <div key={`${tab}-${it.id || matri}`} className="inbox-row">
                    <Link href={`/matrimoney/profile-details/${matri}`} className="d-flex align-items-center gap-3 flex-grow-1 overflow-hidden">
                      <img src={photo} alt="" width={46} height={46} className="rounded-circle object-fit-cover flex-shrink-0"
                        onError={(e) => { e.currentTarget.onerror = null; e.currentTarget.src = avatarFor(it.gender); }} />
                      <span className="overflow-hidden">
                        <span className="d-block fw-semibold text-truncate" style={{ color: 'var(--maroon-900)' }}>{name}</span>
                        <small className="text-muted d-block text-truncate">{meta}</small>
                      </span>
                    </Link>
                    {tab === 'requests' ? (
                      <span className="d-flex gap-2 flex-shrink-0">
                        <button className="btn btn-sm btn-outline-secondary px-3" disabled={busy === it.id} onClick={() => respond(it, 'decline')}>Decline</button>
                        <button className="btn btn-sm btn-primary px-3" disabled={busy === it.id} onClick={() => respond(it, 'accept')}>Accept</button>
                      </span>
                    ) : tab === 'connections' ? (
                      <Link href={`/matrimoney/profile-details/${matri}`} className="btn btn-sm btn-gold px-3 flex-shrink-0"><i className="bi bi-telephone me-1" />Contact</Link>
                    ) : (
                      <Link href={`/matrimoney/profile-details/${matri}`} className="btn btn-sm btn-outline-danger px-3 flex-shrink-0">View</Link>
                    )}
                  </div>
                );
              })
            )}
          </motion.div>
        </AnimatePresence>
      </div>

      <div className="inbox-foot">
        <Link
          href={tab === 'visitors' ? '/matrimoney/matches/who-viewed-myprofile' : tab === 'new' ? '/matrimoney/matches/newmatches' : tab === 'connections' ? '/matrimoney/interests?filter=accepted' : '/matrimoney/interests?filter=received'}
          className="small fw-semibold text-danger"
        >
          See all {TABS.find((t) => t.key === tab).label.toLowerCase()} →
        </Link>
      </div>
    </div>
  );
}
