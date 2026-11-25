'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { motion, AnimatePresence } from 'framer-motion';

/* ---------- Profile views: animated 7-day bar chart ---------- */
const avatarFor = (g) => (String(g).toLowerCase() === 'male' ? '/images/avatar-male.svg' : '/images/avatar-female.svg');

export function ViewsChart({ data = [], weekTotal = 0, visitors = [] }) {
  const max = Math.max(1, ...data.map((d) => d.count));
  const today = new Date().toISOString().slice(0, 10);
  return (
    <div className="luxe-card p-4 flex-grow-1">
      <div className="d-flex justify-content-between align-items-start mb-3">
        <div>
          <span className="eyebrow" style={{ fontSize: '0.6rem' }}>Last 7 days</span>
          <h5 className="mb-0 mt-1">Profile Visitors</h5>
        </div>
        <div className="text-end">
          <div className="stat-num" style={{ fontSize: '2rem' }}>{weekTotal}</div>
          <small className="text-muted">this week</small>
        </div>
      </div>
      <div className="views-chart" role="img" aria-label={`Profile visitors over the last 7 days: ${data.map((d) => d.count).join(', ')}`}>
        {data.map((d, i) => {
          const h = Math.max(6, (d.count / max) * 100);
          const label = new Date(`${d.day}T00:00:00`).toLocaleDateString('en-IN', { weekday: 'short' });
          return (
            <div key={d.day} className="views-col" title={`${d.count} visitor${d.count === 1 ? '' : 's'} on ${label}`}>
              <span className="views-val">{d.count || ''}</span>
              <motion.span
                className={`views-bar ${d.day === today ? 'today' : ''} ${d.count ? '' : 'zero'}`}
                initial={{ height: 0 }}
                animate={{ height: `${h}%` }}
                transition={{ delay: 0.1 + i * 0.06, duration: 0.6, ease: [0.16, 1, 0.3, 1] }}
              />
              <span className="views-day">{label}</span>
            </div>
          );
        })}
      </div>
      {visitors.length > 0 && (
        <div className="d-flex align-items-center gap-2 mt-3">
          <div className="visitor-stack">
            {visitors.slice(0, 5).map((v) => (
              <Link key={v.matri_id} href={`/matrimoney/profile-details/${v.matri_id}`} title={`${v.first_name || 'Member'} visited your profile`}>
                <img src={v.photo || avatarFor(v.gender)} alt={v.first_name || 'Visitor'}
                  onError={(e) => { e.currentTarget.onerror = null; e.currentTarget.src = avatarFor(v.gender); }} />
              </Link>
            ))}
          </div>
          <small className="text-muted">recently visited you</small>
        </div>
      )}
      {weekTotal === 0 && (
        <small className="text-muted d-block mt-2">
          <i className="bi bi-lightbulb text-gold me-1" />Tip: a clear photo and complete profile attract more visitors.
        </small>
      )}
      <Link href="/matrimoney/matches/who-viewed-myprofile" className="small fw-semibold text-danger d-inline-block mt-2">See who visited →</Link>
    </div>
  );
}

/* ---------- Profile checklist with strength ring ---------- */
export function ProfileChecklist({ items = [], strength = 0 }) {
  const r = 30;
  const c = 2 * Math.PI * r;
  const todo = items.filter((i) => !i.done);
  return (
    <div className="luxe-card p-4 h-100">
      <div className="d-flex align-items-center gap-3 mb-3">
        <div className="position-relative flex-shrink-0" style={{ width: 76, height: 76 }}>
          <svg width="76" height="76" viewBox="0 0 76 76" style={{ transform: 'rotate(-90deg)' }}>
            <circle cx="38" cy="38" r={r} fill="none" stroke="#f3e8d6" strokeWidth="7" />
            <motion.circle
              cx="38" cy="38" r={r} fill="none" stroke="url(#ckGold)" strokeWidth="7" strokeLinecap="round"
              strokeDasharray={c}
              initial={{ strokeDashoffset: c }}
              animate={{ strokeDashoffset: c - (strength / 100) * c }}
              transition={{ duration: 1.2, ease: [0.16, 1, 0.3, 1] }}
            />
            <defs>
              <linearGradient id="ckGold" x1="0" y1="0" x2="1" y2="1">
                <stop offset="0" stopColor="#f3dc9b" /><stop offset=".5" stopColor="#c9a24a" /><stop offset="1" stopColor="#7a1530" />
              </linearGradient>
            </defs>
          </svg>
          <span className="position-absolute top-50 start-50 translate-middle stat-num" style={{ fontSize: '1.35rem' }}>{strength}%</span>
        </div>
        <div>
          <h5 className="mb-0">Profile Strength</h5>
          <small className="text-muted">
            {todo.length ? `${todo.length} step${todo.length > 1 ? 's' : ''} to a standout profile` : 'Your profile is complete — wonderful!'}
          </small>
        </div>
      </div>
      <div className="d-flex flex-column gap-2">
        {items.map((it) => (
          <Link key={it.key} href={it.href} className={`check-row ${it.done ? 'done' : ''}`}>
            <span className="check-icon"><i className={`bi ${it.done ? 'bi-check-lg' : it.icon}`} /></span>
            <span className="flex-grow-1 overflow-hidden">
              <span className="d-block check-label">{it.label}</span>
              {!it.done && <span className="d-block check-hint">{it.hint}</span>}
            </span>
            {!it.done && <i className="bi bi-chevron-right small" />}
          </Link>
        ))}
      </div>
    </div>
  );
}

/* ---------- Membership card ---------- */
export function PlanCard({ plan }) {
  if (!plan) {
    return (
      <div className="plan-card free">
        <div className="mandala-deco light" style={{ width: 240, height: 240, right: -80, top: -90 }} aria-hidden="true" />
        <span className="eyebrow light" style={{ fontSize: '0.6rem' }}>Free Membership</span>
        <h4 className="text-white mt-1 mb-2" style={{ fontSize: '1.6rem' }}>Unlock premium benefits</h4>
        <ul className="plan-perks">
          <li><i className="bi bi-check2" /> View contact details of matches</li>
          <li><i className="bi bi-check2" /> Appear higher in searches</li>
          <li><i className="bi bi-check2" /> Chat with your connections</li>
        </ul>
        <Link href="/matrimoney/package" className="btn btn-gold btn-sm w-100 mt-2">View Plans</Link>
      </div>
    );
  }
  return (
    <div className="plan-card">
      <div className="mandala-deco light" style={{ width: 240, height: 240, right: -80, top: -90 }} aria-hidden="true" />
      <div className="d-flex justify-content-between align-items-start position-relative">
        <div>
          <span className="eyebrow light" style={{ fontSize: '0.6rem' }}>Your Membership</span>
          <h4 className="mt-1 mb-0 gold-text" style={{ fontSize: '1.8rem' }}>{plan.code}</h4>
        </div>
        <i className="bi bi-gem fs-3" style={{ color: 'var(--gold-light)' }} />
      </div>
      <div className="row g-2 my-3 position-relative">
        <div className="col-6">
          <div className="plan-stat"><b>{plan.daysLeft}</b><small>days left</small></div>
        </div>
        <div className="col-6">
          <div className="plan-stat"><b>{plan.contactsLeft}</b><small>contacts left</small></div>
        </div>
      </div>
      <div className="small text-white-50 position-relative">
        Valid until {new Date(plan.endsAt).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' })}
      </div>
      <Link href="/matrimoney/package" className="btn btn-glass btn-sm w-100 mt-3 position-relative">{plan.daysLeft <= 15 ? 'Renew now' : 'Manage plan'}</Link>
    </div>
  );
}

/* ---------- Rotating safety tips ---------- */
const TIPS = [
  { icon: 'bi-shield-lock', text: 'Never share your OTP, password or bank details with anyone.' },
  { icon: 'bi-cash-coin', text: 'A genuine match will never ask you for money. Report such requests.' },
  { icon: 'bi-camera-video', text: 'Talk on a video call before meeting in person.' },
  { icon: 'bi-people', text: 'Involve your family early and meet first in a public place.' },
];
export function SafetyTips() {
  const [i, setI] = useState(0);
  useEffect(() => {
    const t = setInterval(() => setI((x) => (x + 1) % TIPS.length), 6000);
    return () => clearInterval(t);
  }, []);
  const tip = TIPS[i];
  return (
    <div className="luxe-card p-4 h-100">
      <div className="d-flex justify-content-between align-items-center mb-2">
        <span className="eyebrow" style={{ fontSize: '0.6rem' }}>Safety Tip</span>
        <div className="d-flex gap-1">
          {TIPS.map((_, k) => (
            <button key={k} type="button" className={`story-dot ${k === i ? 'active' : ''}`} style={{ width: k === i ? 18 : 7, height: 7 }} onClick={() => setI(k)} aria-label={`Tip ${k + 1}`} />
          ))}
        </div>
      </div>
      <AnimatePresence mode="wait" initial={false}>
        <motion.div key={i} initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -8 }} transition={{ duration: 0.3 }}
          className="d-flex gap-3 align-items-start" style={{ minHeight: 48 }}>
          <span className="check-icon flex-shrink-0" style={{ background: 'var(--royal)', color: 'var(--gold-light)' }}><i className={`bi ${tip.icon}`} /></span>
          <p className="small mb-0" style={{ color: 'var(--ink)' }}>{tip.text}</p>
        </motion.div>
      </AnimatePresence>
      <Link href="/matrimoney/safety" className="small fw-semibold text-danger d-inline-block mt-2">Safety Centre →</Link>

      <div className="help-box mt-4">
        <div className="d-flex align-items-center gap-3 mb-3">
          <span className="check-icon flex-shrink-0" style={{ background: 'var(--foil)', color: 'var(--maroon-900)' }}><i className="bi bi-headset" /></span>
          <div>
            <div className="fw-semibold" style={{ color: 'var(--maroon-900)' }}>Need a helping hand?</div>
            <small className="text-muted">Our relationship team is here for you.</small>
          </div>
        </div>
        <div className="d-flex gap-2">
          <Link href="/matrimoney/contactus" className="btn btn-sm btn-primary flex-grow-1"><i className="bi bi-chat-dots me-1" />Contact us</Link>
          <a href="tel:+916370103299" className="btn btn-sm btn-outline-danger flex-grow-1"><i className="bi bi-telephone me-1" />Call</a>
        </div>
      </div>
    </div>
  );
}

/* ---------- Interests I sent, awaiting reply ---------- */
export function SentInterestsCard({ pending = 0, connections = 0, shortlist = 0 }) {
  const rows = [
    { label: 'Awaiting their reply', value: pending, icon: 'bi-hourglass-split', href: '/matrimoney/interests?filter=sent' },
    { label: 'Connected with you', value: connections, icon: 'bi-hearts', href: '/matrimoney/interests?filter=accepted' },
    { label: 'In your shortlist', value: shortlist, icon: 'bi-bookmark-heart', href: '/matrimoney/shortlist' },
  ];
  return (
    <div className="luxe-card p-4 h-100">
      <span className="eyebrow" style={{ fontSize: '0.6rem' }}>Your Journey</span>
      <h5 className="mb-3 mt-1">Interests &amp; Shortlist</h5>
      <div className="d-flex flex-column gap-2">
        {rows.map((r) => (
          <Link key={r.label} href={r.href} className="check-row">
            <span className="check-icon"><i className={`bi ${r.icon}`} /></span>
            <span className="flex-grow-1 check-label" style={{ fontWeight: 500 }}>{r.label}</span>
            <span className="stat-num" style={{ fontSize: '1.4rem' }}>{r.value}</span>
          </Link>
        ))}
      </div>
      {pending > 0 && (
        <small className="text-muted d-block mt-3">
          <i className="bi bi-lightbulb text-gold me-1" />No reply yet? A complete profile with a clear photo improves acceptance.
        </small>
      )}
    </div>
  );
}
