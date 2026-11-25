'use client';

import { useState } from 'react';
import Link from 'next/link';

const avatarFor = (g) => (String(g).toLowerCase() === 'male' ? '/images/avatar-male.svg' : '/images/avatar-female.svg');

/**
 * Premium result card used by Search. Shortlist / Interest act optimistically (instant feedback),
 * rolling back only if the server rejects the change.
 */
export default function MemberCard({ p, onToast }) {
  const [shortlisted, setShortlisted] = useState(Boolean(p.shortlisted));
  const [interest, setInterest] = useState(p.interest_status || null);
  const [busy, setBusy] = useState(false);
  const photo = p.photo_url;
  const blurred = p.photo_locked && photo;

  const toggleShortlist = async () => {
    const next = !shortlisted;
    setShortlisted(next);
    try {
      const r = next
        ? await fetch('/api/shortlist', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ matri_id: p.matri_id }) })
        : await fetch(`/api/shortlist?matri_id=${encodeURIComponent(p.matri_id)}`, { method: 'DELETE' });
      if (!r.ok) throw new Error();
      onToast?.(next ? `${p.full_name} added to your shortlist` : 'Removed from shortlist');
    } catch {
      setShortlisted(!next);
      onToast?.('Could not update shortlist');
    }
  };

  const sendInterest = async () => {
    if (interest || busy) return;
    setBusy(true);
    setInterest('sent');
    try {
      const r = await fetch('/api/interest', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ matri_id: p.matri_id }) });
      const j = await r.json().catch(() => ({}));
      if (!r.ok) throw new Error(j.error || 'Could not send interest');
      onToast?.(`Interest sent to ${p.full_name} 💌`);
    } catch (e) {
      setInterest(null);
      onToast?.(e.message);
    } finally {
      setBusy(false);
    }
  };

  const interestLabel =
    interest === 'accepted' ? 'Connected' : interest === 'sent' ? 'Interest Sent' : interest === 'declined' ? 'Declined' : 'Send Interest';

  return (
    <article className="member-card h-100">
      <Link href={`/matrimoney/profile-details/${p.matri_id}`} className="member-photo d-block" aria-label={`View ${p.full_name}'s profile`}>
        <img
          src={photo || avatarFor(p.gender)}
          alt={p.full_name}
          className={photo ? '' : 'is-avatar'}
          style={blurred ? { filter: 'blur(12px)' } : undefined}
          loading="lazy"
          onError={(e) => { e.currentTarget.onerror = null; e.currentTarget.src = avatarFor(p.gender); e.currentTarget.className = 'is-avatar'; }}
        />
        <div className="member-shade" />
        <div className="member-badges">
          {p.is_verified && <span className="verified-chip position-static"><i className="bi bi-patch-check-fill" /> Verified</span>}
          {p.is_new && <span className="member-new">New</span>}
        </div>
        {blurred && <span className="member-lock"><i className="bi bi-lock-fill" /> Photo protected</span>}
        <div className="member-name">
          <span>{p.full_name || 'Member'}</span>
          <small>{[p.age_years && `${p.age_years} yrs`, p.height_label].filter(Boolean).join(' · ')}</small>
        </div>
      </Link>
      <button
        type="button"
        className={`member-heart ${shortlisted ? 'on' : ''}`}
        onClick={toggleShortlist}
        aria-pressed={shortlisted}
        aria-label={shortlisted ? 'Remove from shortlist' : 'Add to shortlist'}
        title={shortlisted ? 'Shortlisted' : 'Shortlist'}
      >
        <i className={`bi ${shortlisted ? 'bi-bookmark-heart-fill' : 'bi-bookmark-heart'}`} />
      </button>

      <div className="member-body">
        <ul className="member-facts">
          {(p.religion_name || p.caste_name) && <li><i className="bi bi-flower1" />{[p.religion_name, p.caste_name].filter(Boolean).join(' · ')}</li>}
          {p.location_text && <li><i className="bi bi-geo-alt" />{p.location_text}</li>}
          {(p.education_name || p.profession_name) && <li><i className="bi bi-mortarboard" />{[p.education_name, p.profession_name].filter(Boolean).join(' · ')}</li>}
          {p.mother_tongue_name && <li><i className="bi bi-translate" />{p.mother_tongue_name}</li>}
        </ul>
        <div className="d-flex gap-2 mt-auto">
          <button
            type="button"
            className={`btn btn-sm flex-grow-1 ${interest ? 'btn-outline-secondary' : 'btn-primary'}`}
            onClick={sendInterest}
            disabled={Boolean(interest) || busy}
          >
            <i className={`bi ${interest === 'accepted' ? 'bi-hearts' : interest ? 'bi-check2' : 'bi-heart'} me-1`} />
            {interestLabel}
          </button>
          <Link href={`/matrimoney/profile-details/${p.matri_id}`} className="btn btn-sm btn-outline-danger px-3" title="View profile">
            <i className="bi bi-arrow-right" />
          </Link>
        </div>
      </div>
    </article>
  );
}
