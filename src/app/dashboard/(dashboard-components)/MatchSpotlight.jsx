'use client';

import { useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import { AnimatePresence, motion, useMotionValue, useTransform } from 'framer-motion';

const avatarFor = (g) => (String(g).toLowerCase() === 'male' ? '/images/avatar-male.svg' : '/images/avatar-female.svg');
const SKIP_KEY = 'mm:spotlight-skipped';

const readSkipped = () => {
  try {
    const raw = JSON.parse(localStorage.getItem(SKIP_KEY) || '{}');
    const day = 864e5;
    return Object.fromEntries(Object.entries(raw).filter(([, t]) => Date.now() - t < day)); // skips expire after 24h
  } catch {
    return {};
  }
};

/**
 * "Match Spotlight": one suggested profile at a time.
 * Swipe right / ❤ = send interest · swipe left / ✕ = skip (hidden for 24h) · 🔖 = shortlist.
 */
export default function MatchSpotlight() {
  const [queue, setQueue] = useState(null);
  const [direction, setDirection] = useState(0);
  const [toast, setToast] = useState('');
  const [undo, setUndo] = useState(null); // { id, profile } of the last interest sent

  useEffect(() => {
    fetch('/api/advanced-search', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ limit: 24, sort: 'updated' }),
    })
      .then((r) => (r.ok ? r.json() : { results: [] }))
      .then((j) => {
        const skipped = readSkipped();
        setQueue((j.results || []).filter((p) => !p.interest_status && !skipped[p.matri_id]));
      })
      .catch(() => setQueue([]));
  }, []);

  useEffect(() => {
    if (!toast) return;
    const t = setTimeout(() => { setToast(''); setUndo(null); }, undo ? 6000 : 2200);
    return () => clearTimeout(t);
  }, [toast, undo]);

  const undoInterest = async () => {
    if (!undo) return;
    const { id, profile } = undo;
    setUndo(null);
    try {
      const r = await fetch('/api/interest', { method: 'PATCH', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ id, action: 'withdraw' }) });
      if (!r.ok) throw new Error();
      setQueue((q) => [profile, ...(q || [])]);
      setToast('Interest withdrawn');
    } catch {
      setToast('Could not undo — it may already have been answered');
    }
  };

  const current = queue?.[0];
  const next = queue?.[1];

  const advance = (dir) => {
    setDirection(dir);
    setQueue((q) => q.slice(1));
  };

  const skip = () => {
    if (!current) return;
    try {
      const s = readSkipped();
      s[current.matri_id] = Date.now();
      localStorage.setItem(SKIP_KEY, JSON.stringify(s));
    } catch {}
    advance(-1);
  };

  const like = async () => {
    if (!current) return;
    const p = current;
    advance(1);
    try {
      const r = await fetch('/api/interest', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ matri_id: p.matri_id }) });
      const j = await r.json().catch(() => ({}));
      if (!r.ok) throw new Error(j.error || 'Could not send interest');
      if (j.id) setUndo({ id: j.id, profile: p });
      setToast(`Interest sent to ${p.full_name} 💌`);
    } catch (e) {
      setToast(e.message);
    }
  };

  const shortlist = async () => {
    if (!current) return;
    const p = current;
    try {
      const r = await fetch('/api/shortlist', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ matri_id: p.matri_id }) });
      if (!r.ok) throw new Error();
      setToast(`${p.full_name} saved to your shortlist`);
      setQueue((q) => q.map((x) => (x.matri_id === p.matri_id ? { ...x, shortlisted: true } : x)));
    } catch {
      setToast('Could not update shortlist');
    }
  };

  return (
    <div className="luxe-card p-4 spotlight h-100 d-flex flex-column">
      <div className="d-flex justify-content-between align-items-center mb-3">
        <div>
          <span className="eyebrow" style={{ fontSize: '0.6rem' }}>Match Spotlight</span>
          <h4 className="mb-0 mt-1" style={{ fontSize: '1.7rem' }}>Could this be the one?</h4>
        </div>
        {queue && queue.length > 0 && <span className="badge rounded-pill badge-gold">{queue.length} to discover</span>}
      </div>

      {queue === null ? (
        <div className="spotlight-stage loading-skeleton rounded-4" />
      ) : !current ? (
        <div className="spotlight-empty d-flex flex-column align-items-center justify-content-center text-center p-4 rounded-4 flex-grow-1">
          <img src="/images/ritual-rings.svg" alt="" width={70} height={70} className="mb-2 p-2 rounded-circle" style={{ background: 'var(--royal)' }} />
          <div className="fw-semibold" style={{ color: 'var(--maroon-900)' }}>You&apos;ve seen everyone for today</div>
          <small className="text-muted mb-3">New members join every day. Widen your search to discover more.</small>
          <Link href="/matrimoney/preference-search" className="btn btn-primary btn-sm px-4">Open Search</Link>
        </div>
      ) : (
        <>
          <div className="spotlight-stage">
            {next && <SpotCard key={`peek-${next.matri_id}`} p={next} peek />}
            <AnimatePresence custom={direction} initial={false}>
              <SpotCard key={current.matri_id} p={current} onSwipe={(d) => (d > 0 ? like() : skip())} direction={direction} />
            </AnimatePresence>
          </div>
          <div className="d-flex justify-content-center gap-3 mt-3">
            <button type="button" className="spot-btn skip" onClick={skip} aria-label="Skip" title="Not now"><i className="bi bi-x-lg" /></button>
            <button type="button" className={`spot-btn save ${current.shortlisted ? 'on' : ''}`} onClick={shortlist} aria-label="Shortlist" title="Shortlist">
              <i className={`bi ${current.shortlisted ? 'bi-bookmark-heart-fill' : 'bi-bookmark-heart'}`} />
            </button>
            <button type="button" className="spot-btn like" onClick={like} aria-label="Send interest" title="Send interest"><i className="bi bi-heart-fill" /></button>
          </div>
          <p className="text-center small text-muted mt-2 mb-0">Swipe right to send interest · left to skip</p>
        </>
      )}
      {toast && (
        <div className="mm-toast d-flex align-items-center gap-3" role="status">
          <span><i className="bi bi-check-circle me-2" />{toast}</span>
          {undo && (
            <button type="button" className="btn btn-sm btn-gold py-0 px-3" onClick={undoInterest}>Undo</button>
          )}
        </div>
      )}
    </div>
  );
}

function SpotCard({ p, peek = false, onSwipe, direction = 0 }) {
  const x = useMotionValue(0);
  const rotate = useTransform(x, [-220, 220], [-14, 14]);
  const likeOpacity = useTransform(x, [30, 140], [0, 1]);
  const skipOpacity = useTransform(x, [-140, -30], [1, 0]);
  const facts = useMemo(
    () => [p.religion_name && p.caste_name ? `${p.religion_name} · ${p.caste_name}` : p.religion_name, p.location_text, p.profession_name || p.education_name].filter(Boolean),
    [p]
  );

  return (
    <motion.div
      className={`spot-card ${peek ? 'peek' : ''}`}
      style={peek ? undefined : { x, rotate }}
      drag={peek ? false : 'x'}
      dragConstraints={{ left: 0, right: 0 }}
      dragElastic={0.9}
      onDragEnd={(_, info) => {
        if (peek) return;
        if (info.offset.x > 120 || info.velocity.x > 600) onSwipe(1);
        else if (info.offset.x < -120 || info.velocity.x < -600) onSwipe(-1);
      }}
      initial={peek ? false : { scale: 0.94, opacity: 0, y: 14 }}
      animate={peek ? { scale: 0.94, y: 14, opacity: 0.6 } : { scale: 1, opacity: 1, y: 0 }}
      custom={direction}
      variants={{ exit: (dir) => ({ x: dir > 0 ? 420 : -420, rotate: dir > 0 ? 18 : -18, opacity: 0, transition: { duration: 0.35 } }) }}
      exit="exit"
      transition={{ type: 'spring', stiffness: 260, damping: 26 }}
      whileTap={peek ? undefined : { cursor: 'grabbing' }}
    >
      <img
        src={p.photo_url || avatarFor(p.gender)}
        alt={p.full_name}
        className={p.photo_url ? '' : 'is-avatar'}
        draggable={false}
        onError={(e) => { e.currentTarget.onerror = null; e.currentTarget.src = avatarFor(p.gender); e.currentTarget.className = 'is-avatar'; }}
      />
      <div className="spot-shade" />
      {!peek && (
        <>
          <motion.span className="spot-stamp like" style={{ opacity: likeOpacity }}>INTEREST</motion.span>
          <motion.span className="spot-stamp skip" style={{ opacity: skipOpacity }}>NOT NOW</motion.span>
        </>
      )}
      <div className="spot-info">
        <div className="d-flex align-items-center gap-2 mb-1">
          <span className="spot-name">{p.full_name}</span>
          {p.is_verified && <i className="bi bi-patch-check-fill" style={{ color: 'var(--gold-light)' }} />}
        </div>
        <div className="spot-sub">{[p.age_years && `${p.age_years} yrs`, p.height_label, p.mother_tongue_name].filter(Boolean).join(' · ')}</div>
        <div className="d-flex flex-wrap gap-1 mt-2">
          {facts.map((f) => <span key={f} className="spot-fact">{f}</span>)}
        </div>
        {!peek && (
          <Link href={`/matrimoney/profile-details/${p.matri_id}`} className="spot-view" onPointerDown={(e) => e.stopPropagation()}>
            View full profile <i className="bi bi-arrow-right" />
          </Link>
        )}
      </div>
    </motion.div>
  );
}
