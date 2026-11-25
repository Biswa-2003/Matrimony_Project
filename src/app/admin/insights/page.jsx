'use client';

import Link from 'next/link';
import { useEffect, useState } from 'react';

const inr = (paise) => `₹${Math.round(Number(paise || 0) / 100).toLocaleString('en-IN')}`;
const pct = (a, b) => (b ? Math.round((a / b) * 100) : 0);
const fmtDate = (t) => new Date(t).toLocaleString('en-IN', { day: 'numeric', month: 'short', hour: 'numeric', minute: '2-digit' });

function Kpi({ icon, label, value, sub, tone }) {
  return (
    <div className="admin-card p-4 h-100">
      <div className="d-flex align-items-center gap-3">
        <span className={`ins-icon ${tone || ''}`}><i className={`bi ${icon}`} /></span>
        <div>
          <div className="small text-muted fw-semibold text-uppercase" style={{ letterSpacing: '.05em', fontSize: '.7rem' }}>{label}</div>
          <div className="ins-value">{value}</div>
          {sub && <div className="small text-muted">{sub}</div>}
        </div>
      </div>
    </div>
  );
}

export default function InsightsPage() {
  const [d, setD] = useState(null);
  const [error, setError] = useState('');

  useEffect(() => {
    fetch('/api/admin/insights', { cache: 'no-store' })
      .then(async (r) => { const j = await r.json(); if (!r.ok) throw new Error(j.error); setD(j); })
      .catch((e) => setError(e.message || 'Could not load insights.'));
  }, []);

  if (error) return <div className="alert alert-danger">{error}</div>;
  if (!d) return <div className="row g-4">{[0, 1, 2, 3].map((i) => <div key={i} className="col-md-3"><div className="admin-card loading-skeleton" style={{ height: 120 }} /></div>)}</div>;

  const { revenue: r, members: m, funnel: f, engagement: e } = d;
  const last30 = Number(r.last30 || 0), prev30 = Number(r.prev30 || 0);
  const growth = prev30 > 0 ? Math.round(((last30 - prev30) / prev30) * 100) : null;
  const maxMonth = Math.max(1, ...d.monthly.map((x) => Number(x.paise)));
  const steps = [
    ['Profiles created', f.profiles],
    ['Added a photo', f.with_photo],
    ['Sent an interest', f.sent_interest],
    ['Got connected', f.connected],
    ['Bought a plan', f.ever_paid],
  ];

  return (
    <div className="container-fluid p-0">
      <p className="text-muted small mb-4">Revenue, conversion and engagement — updated live from your database.</p>

      <div className="row g-4 mb-4">
        <div className="col-md-6 col-xl-3">
          <Kpi icon="bi-currency-rupee" label="Revenue · 30 days" value={inr(r.last30)}
            sub={growth === null ? `${inr(r.total)} all time` : `${growth >= 0 ? '▲' : '▼'} ${Math.abs(growth)}% vs previous 30 days`} tone="gold" />
        </div>
        <div className="col-md-6 col-xl-3">
          <Kpi icon="bi-gem" label="Paying members" value={m.paying || 0} sub={`${pct(m.paying, m.total)}% of ${m.total || 0} members`} />
        </div>
        <div className="col-md-6 col-xl-3">
          <Kpi icon="bi-activity" label="Active · 7 days" value={m.active7 || 0} sub={`${m.new30 || 0} joined in 30 days`} tone="green" />
        </div>
        <div className="col-md-6 col-xl-3">
          <Kpi icon="bi-bug" label="Errors · 24 hours" value={d.errors24h} sub={d.errors24h ? 'See Health below' : 'All systems normal'} tone={d.errors24h ? 'red' : 'green'} />
        </div>
      </div>

      <div className="row g-4 mb-4">
        <div className="col-lg-7">
          <div className="admin-card p-4 h-100">
            <h5 className="mb-3">Revenue by month</h5>
            <div className="ins-bars">
              {d.monthly.map((x) => (
                <div key={x.label} className="ins-bar-col" title={`${x.label}: ${inr(x.paise)}`}>
                  <span className="ins-bar-val">{Number(x.paise) ? inr(x.paise) : ''}</span>
                  <div className="ins-bar" style={{ height: `${Math.max(3, (Number(x.paise) / maxMonth) * 100)}%` }} />
                  <span className="ins-bar-label">{x.label}</span>
                </div>
              ))}
            </div>
            {!Number(r.total) && <p className="small text-muted mt-3 mb-0"><i className="bi bi-info-circle me-1" />No paid orders yet — revenue appears here once online payments go live.</p>}
          </div>
        </div>
        <div className="col-lg-5">
          <div className="admin-card p-4 h-100">
            <h5 className="mb-3">Plans</h5>
            <table className="table table-sm align-middle mb-0">
              <thead><tr><th>Plan</th><th className="text-end">Active</th><th className="text-end">Orders</th><th className="text-end">Revenue</th></tr></thead>
              <tbody>
                {d.byPlan.map((p) => (
                  <tr key={p.name}><td>{p.name}</td><td className="text-end">{p.active}</td><td className="text-end">{p.orders}</td><td className="text-end">{inr(p.paise)}</td></tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </div>

      <div className="row g-4 mb-4">
        <div className="col-lg-6">
          <div className="admin-card p-4 h-100">
            <h5 className="mb-1">Member journey</h5>
            <p className="small text-muted">Where members drop off — improve the biggest gap first.</p>
            {steps.map(([label, n], i) => (
              <div key={label} className="mb-3">
                <div className="d-flex justify-content-between small">
                  <span className="fw-semibold">{label}</span>
                  <span>{n || 0}{i > 0 && <span className="text-muted"> · {pct(n, steps[0][1])}%</span>}</span>
                </div>
                <div className="horo-bar" style={{ height: 10 }}><span style={{ width: `${Math.max(2, pct(n, steps[0][1]))}%` }} /></div>
              </div>
            ))}
          </div>
        </div>
        <div className="col-lg-6">
          <div className="admin-card p-4 h-100">
            <h5 className="mb-3">Engagement · last 30 days</h5>
            <div className="row g-3">
              {[
                ['bi-heart', 'Interests sent', e.interests],
                ['bi-check2-circle', 'Acceptance rate', `${pct(e.accepted, e.answered)}%`],
                ['bi-chat-heart', 'Messages', e.messages],
                ['bi-chat-dots', 'New chats', e.chats],
                ['bi-telephone', 'Contacts viewed', e.unlocks],
                ['bi-camera', 'Photo requests', e.photo_requests],
              ].map(([i, k, v]) => (
                <div key={k} className="col-6">
                  <div className="ix-fact"><i className={`bi ${i}`} /><div><small>{k}</small><span>{v ?? 0}</span></div></div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>

      <div className="row g-4">
        <div className="col-lg-6">
          <div className="admin-card p-4 h-100">
            <h5 className="mb-1">Renewals due in 7 days</h5>
            <p className="small text-muted">A friendly reminder call or email here keeps members on board.</p>
            {d.renewals.length === 0 ? <p className="text-muted small mb-0">No plans expire this week.</p> : (
              <table className="table table-sm align-middle mb-0 small">
                <tbody>
                  {d.renewals.map((x) => (
                    <tr key={`${x.matri_id}-${x.ends_at}`}>
                      <td>{x.matri_id ? <Link href={`/matrimoney/profile-details/${x.matri_id}`} target="_blank">{x.name}</Link> : x.name}</td>
                      <td>{x.plan}</td>
                      <td className="text-end text-nowrap">{new Date(x.ends_at).toLocaleDateString('en-IN', { day: 'numeric', month: 'short' })}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>
        </div>
        <div className="col-lg-6">
          <div className="admin-card p-4 h-100">
            <h5 className="mb-1">Health · errors this week</h5>
            <p className="small text-muted">Server and browser errors, grouped. Personal data is removed before saving.</p>
            {d.errors.length === 0 ? (
              <p className="text-success small mb-0"><i className="bi bi-check-circle me-1" />No errors recorded in the last 7 days.</p>
            ) : (
              <div className="d-flex flex-column gap-2">
                {d.errors.map((x, i) => (
                  <div key={i} className="ins-err">
                    <div className="d-flex justify-content-between gap-2 small">
                      <span className="badge rounded-pill bg-light text-dark">{x.source}</span>
                      <span className="text-muted">{x.n}× · last {fmtDate(x.last)}</span>
                    </div>
                    <div className="small fw-semibold mt-1 text-break">{x.message}</div>
                    {x.path && <div className="small text-muted font-monospace">{x.path}</div>}
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
