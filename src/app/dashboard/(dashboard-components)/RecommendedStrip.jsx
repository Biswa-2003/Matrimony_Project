'use client';

import { useEffect, useRef, useState } from 'react';
import Link from 'next/link';
import MemberCard from '@/app/components/MemberCard';

/** Horizontal, snap-scrolling row of recommended matches with arrow controls. */
export default function RecommendedStrip() {
  const [items, setItems] = useState(null);
  const [toast, setToast] = useState('');
  const [edges, setEdges] = useState({ start: true, end: false });
  const track = useRef(null);

  useEffect(() => {
    fetch('/api/advanced-search', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ limit: 12, sort: 'newest' }),
    })
      .then((r) => (r.ok ? r.json() : { results: [] }))
      .then((j) => setItems((j.results || []).filter((p) => p.matri_id))) // a card needs an id to link to
      .catch(() => setItems([]));
  }, []);

  useEffect(() => {
    if (!toast) return;
    const t = setTimeout(() => setToast(''), 2400);
    return () => clearTimeout(t);
  }, [toast]);

  const onScroll = () => {
    const el = track.current;
    if (!el) return;
    setEdges({ start: el.scrollLeft < 8, end: el.scrollLeft + el.clientWidth >= el.scrollWidth - 8 });
  };
  useEffect(onScroll, [items]);

  const scrollBy = (dir) => track.current?.scrollBy({ left: dir * (track.current.clientWidth * 0.8), behavior: 'smooth' });

  return (
    <div className="luxe-card p-4">
      <div className="d-flex justify-content-between align-items-end mb-3">
        <div>
          <span className="eyebrow" style={{ fontSize: '0.6rem' }}>Handpicked for you</span>
          <h4 className="mb-0 mt-1" style={{ fontSize: '1.7rem' }}>Recommended Matches</h4>
        </div>
        <div className="d-flex gap-2 align-items-center">
          <Link href="/matrimoney/matches/overall" className="small fw-semibold text-danger me-2 d-none d-sm-inline">View all →</Link>
          <button type="button" className="carousel-orb-btn" style={{ width: 40, height: 40 }} onClick={() => scrollBy(-1)} disabled={edges.start} aria-label="Scroll left"><i className="bi bi-chevron-left" /></button>
          <button type="button" className="carousel-orb-btn" style={{ width: 40, height: 40 }} onClick={() => scrollBy(1)} disabled={edges.end} aria-label="Scroll right"><i className="bi bi-chevron-right" /></button>
        </div>
      </div>

      {items === null ? (
        <div className="rec-track">{[0, 1, 2, 3].map((k) => <div key={k} className="rec-item"><div className="member-card loading-skeleton" style={{ height: 400 }} /></div>)}</div>
      ) : items.length === 0 ? (
        <div className="text-center py-4">
          <p className="text-muted mb-3">No recommendations yet — try widening your preferences.</p>
          <Link href="/matrimoney/preference-search" className="btn btn-primary btn-sm px-4">Open Search</Link>
        </div>
      ) : (
        <div className="rec-track" ref={track} onScroll={onScroll}>
          {items.map((p, i) => (
            <div key={p.matri_id || p.user_id || i} className="rec-item">
              <MemberCard p={p} onToast={setToast} />
            </div>
          ))}
          <div className="rec-item">
            <Link href="/matrimoney/preference-search" className="rec-more">
              <span className="why-icon" style={{ width: 60, height: 60 }}><i className="bi bi-search-heart" /></span>
              <span className="fw-semibold" style={{ color: 'var(--maroon-900)' }}>Discover more</span>
              <small className="text-muted">Search by community, city &amp; career</small>
            </Link>
          </div>
        </div>
      )}
      {toast && <div className="mm-toast" role="status"><i className="bi bi-check-circle me-2" />{toast}</div>}
    </div>
  );
}
