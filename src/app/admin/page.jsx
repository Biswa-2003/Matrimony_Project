'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { Reveal, AnimatedCounter } from '@/app/components/motion';

/** Simple SVG ring chart. segments: [{ value, color, label }] */
function Ring({ segments, size = 150, stroke = 16, center }) {
  const r = (size - stroke) / 2;
  const c = 2 * Math.PI * r;
  const total = segments.reduce((a, s) => a + s.value, 0) || 1;
  let offset = 0;
  return (
    <div className="position-relative d-inline-block" style={{ width: size, height: size }}>
      <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`} style={{ transform: 'rotate(-90deg)' }}>
        <circle cx={size / 2} cy={size / 2} r={r} fill="none" stroke="#f3e8d6" strokeWidth={stroke} />
        {segments.map((s) => {
          const len = (s.value / total) * c;
          const el = (
            <circle
              key={s.label}
              cx={size / 2}
              cy={size / 2}
              r={r}
              fill="none"
              stroke={s.color}
              strokeWidth={stroke}
              strokeDasharray={`${len} ${c - len}`}
              strokeDashoffset={-offset}
              strokeLinecap={segments.length === 1 ? 'round' : 'butt'}
              style={{ transition: 'stroke-dasharray 1s ease' }}
            />
          );
          offset += len;
          return el;
        })}
      </svg>
      <div className="position-absolute top-50 start-50 translate-middle text-center">{center}</div>
    </div>
  );
}

function SignupChart({ data }) {
  const max = Math.max(1, ...data.map((d) => d.count));
  return (
    <div className="signup-chart" role="img" aria-label={`Sign-ups per day: ${data.map((d) => d.count).join(', ')}`}>
      {data.map((d, i) => {
        const date = new Date(`${d.day}T00:00:00`);
        return (
          <div key={d.day} className="signup-col" title={`${d.count} sign-up${d.count === 1 ? '' : 's'} on ${date.toLocaleDateString('en-IN', { day: 'numeric', month: 'short' })}`}>
            <span className="signup-val">{d.count || ''}</span>
            <span className={`signup-bar ${i === data.length - 1 ? 'today' : ''} ${d.count ? '' : 'zero'}`} style={{ height: `${Math.max(4, (d.count / max) * 100)}%`, animationDelay: `${i * 0.04}s` }} />
            <span className="signup-day">{i % 2 === 1 || i === data.length - 1 ? date.getDate() : ''}</span>
          </div>
        );
      })}
    </div>
  );
}

const KPI = [
  { key: 'totalUsers', label: 'Total Members', icon: 'bi-people', note: (s) => 'Registered accounts' },
  { key: 'totalProfiles', label: 'Matrimony Profiles', icon: 'bi-person-hearts', note: (s) => `${s.activeProfiles} active right now` },
  { key: 'verifiedProfiles', label: 'Verified Profiles', icon: 'bi-patch-check', note: (s) => `${s.pendingVerifications} awaiting review` },
  { key: 'activeSubscriptions', label: 'Premium Members', icon: 'bi-gem', note: (s) => `₹${Number(s.estimatedRevenue || 0).toLocaleString('en-IN')} revenue` },
];

const PLAN_COLORS = { PLAT: '#3b0a16', GOLD: '#c9a24a', SILVER: '#9ca3af' };

export default function AdminDashboardPage() {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [busyId, setBusyId] = useState(null);
  const [overview, setOverview] = useState(null);

  useEffect(() => {
    fetch('/api/admin/overview', { cache: 'no-store' })
      .then((r) => (r.ok ? r.json() : null))
      .then((j) => j && setOverview(j))
      .catch(() => {});
  }, []);

  const fetchStats = async () => {
    try {
      const res = await fetch('/api/admin/stats', { cache: 'no-store' });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error || 'Failed to load stats');
      setData(json);
      setError('');
    } catch (e) {
      setError(e.message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchStats();
  }, []);

  const handleQuickVerify = async (userId, currentStatus) => {
    setBusyId(userId);
    try {
      const res = await fetch(`/api/admin/users/${userId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ is_verified: !currentStatus }),
      });
      if (res.ok) await fetchStats();
    } finally {
      setBusyId(null);
    }
  };

  if (loading) {
    return (
      <div className="row g-3">
        {[...Array(4)].map((_, i) => (
          <div key={i} className="col-12 col-sm-6 col-xl-3">
            <div className="admin-card p-4 loading-skeleton" style={{ height: 140 }} />
          </div>
        ))}
        <div className="col-12"><div className="admin-card loading-skeleton" style={{ height: 320 }} /></div>
      </div>
    );
  }

  const stats = {
    totalUsers: 0, totalProfiles: 0, activeProfiles: 0, verifiedProfiles: 0, pendingVerifications: 0,
    maleProfiles: 0, femaleProfiles: 0, activeSubscriptions: 0, estimatedRevenue: 0,
    ...(data?.stats || {}),
  };
  const verifiedPct = stats.totalProfiles ? Math.round((stats.verifiedProfiles / stats.totalProfiles) * 100) : 0;
  const maxSubs = Math.max(1, ...(data?.plans || []).map((p) => Number(p.subscribers) || 0));

  return (
    <div className="container-fluid p-0">
      {error && <div className="alert alert-danger">{error}</div>}

      {/* Welcome banner */}
      <Reveal>
        <div className="section-maroon position-relative overflow-hidden mb-4 p-4 p-lg-5" style={{ borderRadius: 26, border: '1px solid rgba(232,207,142,.35)' }}>
          <div className="mandala-deco light" style={{ width: 460, height: 460, right: -120, top: -160 }} aria-hidden="true" />
          <div className="d-flex flex-column flex-lg-row align-items-lg-center justify-content-between gap-4 position-relative">
            <div>
              <span className="eyebrow light mb-2">Namaste, Administrator</span>
              <h2 className="text-white mb-2" style={{ fontSize: '2.4rem' }}>Your community at a glance</h2>
              <p className="mb-0 text-white-50" style={{ maxWidth: 520 }}>
                Review new members, approve verifications and keep an eye on premium memberships — all in one place.
              </p>
            </div>
            <div className="d-flex gap-2 flex-wrap">
              <Link href="/admin/verifications" className="btn btn-gold px-4">
                <i className="bi bi-patch-check me-1" /> Review {stats.pendingVerifications} Pending
              </Link>
              <Link href="/admin/users" className="btn btn-glass px-4">
                <i className="bi bi-people me-1" /> All Members
              </Link>
            </div>
          </div>
        </div>
      </Reveal>

      {/* KPI cards */}
      <div className="row g-3 mb-4">
        {KPI.map((k, i) => (
          <div key={k.key} className="col-12 col-sm-6 col-xl-3">
            <Reveal delay={i * 0.06} className="h-100">
              <div className="admin-card kpi-card p-4 h-100">
                <div className="d-flex justify-content-between align-items-start mb-3">
                  <span className="kpi-label">{k.label}</span>
                  <span className="kpi-icon"><i className={`bi ${k.icon}`} /></span>
                </div>
                <div className="stat-num mb-1" style={{ fontSize: '2.6rem' }}>
                  <AnimatedCounter to={Number(stats[k.key]) || 0} duration={1.4} />
                </div>
                <small className="text-muted">{k.note(stats)}</small>
              </div>
            </Reveal>
          </div>
        ))}
      </div>

      {/* Growth + attention */}
      <div className="row g-3 mb-4">
        <div className="col-12 col-lg-8">
          <Reveal className="h-100">
            <div className="admin-card p-4 h-100">
              <div className="d-flex flex-wrap justify-content-between align-items-start gap-3 mb-3">
                <div>
                  <h5 className="mb-1">New Sign-ups</h5>
                  <small className="text-muted">Registrations over the last 14 days</small>
                </div>
                <div className="d-flex gap-4">
                  {[
                    ['new_week', 'this week'],
                    ['active_today', 'active today'],
                    ['interests_week', 'interests / wk'],
                  ].map(([k, l]) => (
                    <div key={k} className="text-end">
                      <div className="stat-num" style={{ fontSize: '1.7rem' }}>{overview?.activity?.[k] ?? '–'}</div>
                      <small className="text-muted">{l}</small>
                    </div>
                  ))}
                </div>
              </div>
              <SignupChart data={overview?.signups14d || []} />
            </div>
          </Reveal>
        </div>
        <div className="col-12 col-lg-4">
          <Reveal delay={0.05} className="h-100">
            <div className="admin-card p-4 h-100">
              <h5 className="mb-1">Needs your attention</h5>
              <small className="text-muted d-block mb-3">Queues waiting for an admin</small>
              <div className="d-flex flex-column gap-2">
                {[
                  ['pending_verifications', 'Profiles to verify', 'bi-patch-check', '/admin/verifications'],
                  ['open_reports', 'Open safety reports', 'bi-flag', '/admin/reports'],
                  ['new_messages', 'New enquiries', 'bi-envelope', '/admin/reports'],
                  ['pending_stories', 'Stories to approve', 'bi-hearts', '/admin/stories'],
                ].map(([k, l, icon, href]) => {
                  const n = Number(overview?.attention?.[k]) || 0;
                  return (
                    <Link key={k} href={href} className={`attn-row ${n ? 'hot' : ''}`}>
                      <span className="attn-icon"><i className={`bi ${icon}`} /></span>
                      <span className="flex-grow-1">{l}</span>
                      <span className="attn-count">{overview ? n : '–'}</span>
                    </Link>
                  );
                })}
              </div>
              <div className="nav-menu-label p-0 mt-4 mb-2">Website</div>
              <div className="d-flex flex-wrap gap-2">
                <Link href="/admin/media" className="btn btn-sm btn-outline-danger"><i className="bi bi-images me-1" />Images</Link>
                <Link href="/admin/stories" className="btn btn-sm btn-outline-danger"><i className="bi bi-plus-lg me-1" />Story</Link>
                <Link href="/admin/settings" className="btn btn-sm btn-outline-danger"><i className="bi bi-megaphone me-1" />Announce</Link>
              </div>
            </div>
          </Reveal>
        </div>
      </div>

      {/* Analytics */}
      <div className="row g-3 mb-4">
        <div className="col-12 col-lg-4">
          <Reveal className="h-100">
            <div className="admin-card p-4 h-100 text-center">
              <h5 className="mb-1 text-start">Brides &amp; Grooms</h5>
              <small className="text-muted d-block text-start mb-4">Gender balance across profiles</small>
              <Ring
                segments={[
                  { label: 'Grooms', value: stats.maleProfiles, color: '#3b0a16' },
                  { label: 'Brides', value: stats.femaleProfiles, color: '#c9a24a' },
                ]}
                center={<><div className="stat-num" style={{ fontSize: '2rem' }}>{stats.totalProfiles}</div><small className="text-muted">profiles</small></>}
              />
              <div className="d-flex justify-content-center gap-4 mt-4 small">
                <span><span className="legend-dot" style={{ background: '#3b0a16' }} /> Grooms {stats.maleProfiles}</span>
                <span><span className="legend-dot" style={{ background: '#c9a24a' }} /> Brides {stats.femaleProfiles}</span>
              </div>
            </div>
          </Reveal>
        </div>

        <div className="col-12 col-lg-4">
          <Reveal delay={0.05} className="h-100">
            <div className="admin-card p-4 h-100 text-center">
              <h5 className="mb-1 text-start">Trust Score</h5>
              <small className="text-muted d-block text-start mb-4">Share of verified profiles</small>
              <Ring
                segments={[
                  { label: 'Verified', value: stats.verifiedProfiles, color: '#1f8a55' },
                  { label: 'Pending', value: stats.pendingVerifications, color: '#ead9bd' },
                ]}
                center={<><div className="stat-num" style={{ fontSize: '2rem' }}>{verifiedPct}%</div><small className="text-muted">verified</small></>}
              />
              <Link href="/admin/verifications" className="btn btn-outline-danger btn-sm mt-4 px-4">Open verification queue</Link>
            </div>
          </Reveal>
        </div>

        <div className="col-12 col-lg-4">
          <Reveal delay={0.1} className="h-100">
            <div className="admin-card p-4 h-100">
              <div className="d-flex justify-content-between align-items-center mb-1">
                <h5 className="mb-0">Membership Plans</h5>
                <Link href="/admin/subscriptions" className="small text-danger fw-semibold">Manage →</Link>
              </div>
              <small className="text-muted d-block mb-4">Active subscribers by plan</small>
              <div className="d-flex flex-column gap-3">
                {(data?.plans || []).map((plan) => (
                  <div key={plan.code}>
                    <div className="d-flex justify-content-between small mb-1">
                      <span className="fw-semibold" style={{ color: 'var(--maroon-900)' }}>
                        <i className="bi bi-gem me-1" style={{ color: PLAN_COLORS[plan.code] || '#7a1530' }} />
                        {plan.name} <span className="text-muted fw-normal">· ₹{Number(plan.price_inr).toLocaleString('en-IN')}</span>
                      </span>
                      <span className="fw-semibold">{plan.subscribers}</span>
                    </div>
                    <div className="progress" style={{ height: 8 }}>
                      <div className="progress-bar" style={{ width: `${(Number(plan.subscribers) / maxSubs) * 100}%`, background: PLAN_COLORS[plan.code] || 'var(--royal)' }} />
                    </div>
                  </div>
                ))}
                {!data?.plans?.length && <div className="text-muted small">No plans configured yet.</div>}
              </div>
            </div>
          </Reveal>
        </div>
      </div>

      {/* Recent registrations */}
      <Reveal>
        <div className="admin-card p-0 overflow-hidden">
          <div className="d-flex flex-column flex-md-row justify-content-between align-items-md-center gap-2 p-4 pb-3">
            <div>
              <h5 className="mb-1">Recent Registrations</h5>
              <small className="text-muted">The newest members of your community</small>
            </div>
            <Link href="/admin/users" className="btn btn-outline-danger btn-sm px-3">
              View all {stats.totalUsers} members <i className="bi bi-arrow-right ms-1" />
            </Link>
          </div>
          <div className="table-responsive">
            <table className="table table-hover align-middle mb-0">
              <thead>
                <tr>
                  <th className="ps-4">Member</th>
                  <th>Matri ID</th>
                  <th>Contact</th>
                  <th>Gender</th>
                  <th>Status</th>
                  <th>Verification</th>
                  <th className="text-end pe-4">Action</th>
                </tr>
              </thead>
              <tbody>
                {(data?.recentUsers || []).map((u) => {
                  const fullName = [u.first_name, u.last_name].filter(Boolean).join(' ') || (u.email || '').split('@')[0];
                  const fallback = u.gender === 'Male' ? '/images/avatar-male.svg' : '/images/avatar-female.svg';
                  return (
                    <tr key={u.id}>
                      <td className="ps-4">
                        <div className="d-flex align-items-center gap-3">
                          <img
                            src={u.photo_url || fallback}
                            alt=""
                            className="rounded-circle object-fit-cover"
                            style={{ width: 40, height: 40, border: '2px solid var(--gold-light)' }}
                            onError={(e) => { e.currentTarget.onerror = null; e.currentTarget.src = fallback; }}
                          />
                          <div>
                            <div className="fw-semibold" style={{ color: 'var(--maroon-900)' }}>{fullName}</div>
                            <small className="text-muted text-capitalize">{u.role}</small>
                          </div>
                        </div>
                      </td>
                      <td><span className="badge bg-light text-dark border font-monospace">{u.matri_id || '—'}</span></td>
                      <td>
                        <div className="small">{u.email}</div>
                        <small className="text-muted">{u.phone || 'No phone'}</small>
                      </td>
                      <td>{u.gender === 'Male' ? 'Groom' : u.gender === 'Female' ? 'Bride' : '—'}</td>
                      <td>
                        <span className={`badge rounded-pill ${u.profile_active !== false ? 'bg-success-subtle text-success' : 'bg-secondary-subtle text-secondary'}`}>
                          {u.profile_active !== false ? 'Active' : 'Deactivated'}
                        </span>
                      </td>
                      <td>
                        <span className={`badge rounded-pill ${u.is_verified ? 'badge-gold' : 'bg-warning-subtle text-dark'}`}>
                          <i className={`bi ${u.is_verified ? 'bi-patch-check-fill' : 'bi-hourglass-split'} me-1`} />
                          {u.is_verified ? 'Verified' : 'Pending'}
                        </span>
                      </td>
                      <td className="text-end pe-4">
                        <button
                          onClick={() => handleQuickVerify(u.id, u.is_verified)}
                          disabled={busyId === u.id}
                          className={`btn btn-sm px-3 ${u.is_verified ? 'btn-outline-secondary' : 'btn-primary'}`}
                        >
                          {busyId === u.id ? <span className="spinner-border spinner-border-sm" /> : u.is_verified ? 'Revoke' : 'Verify'}
                        </button>
                      </td>
                    </tr>
                  );
                })}
                {!data?.recentUsers?.length && (
                  <tr><td colSpan={7} className="text-center text-muted py-5">No registrations yet.</td></tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      </Reveal>

      <style jsx>{`
        .kpi-label { font-size: 0.72rem; letter-spacing: 0.14em; text-transform: uppercase; color: var(--muted); font-weight: 600; }
        .kpi-icon {
          width: 44px; height: 44px; border-radius: 50%;
          display: inline-flex; align-items: center; justify-content: center;
          font-size: 1.15rem; color: var(--gold-light); background: var(--royal);
          box-shadow: 0 0 0 3px #fff, 0 0 0 4px var(--gold);
        }
        .kpi-card { position: relative; overflow: hidden; }
        .kpi-card::after {
          content: ''; position: absolute; right: -40px; bottom: -40px; width: 130px; height: 130px;
          background: url('/images/mandala-gold.svg') center / contain no-repeat; opacity: 0.12;
        }
        .legend-dot { display: inline-block; width: 10px; height: 10px; border-radius: 50%; margin-right: 6px; vertical-align: middle; }
      `}</style>
    </div>
  );
}
