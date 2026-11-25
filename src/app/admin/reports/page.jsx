'use client';

import { useCallback, useEffect, useState } from 'react';
import Link from 'next/link';

const REPORT_FILTERS = ['open', 'resolved', 'dismissed', 'all'];
const MESSAGE_FILTERS = ['new', 'handled', 'all'];

const fmt = (d) =>
  d ? new Date(d).toLocaleString('en-IN', { day: 'numeric', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' }) : '—';

export default function AdminReportsPage() {
  const [type, setType] = useState('reports');
  const [status, setStatus] = useState('open');
  const [data, setData] = useState({ results: [], counts: [] });
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(null);
  const [error, setError] = useState('');

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const r = await fetch(`/api/admin/reports?type=${type}&status=${status}`, { cache: 'no-store' });
      const j = await r.json();
      if (!r.ok) throw new Error(j.error || 'Failed to load');
      setData(j);
      setError('');
    } catch (e) {
      setError(e.message);
    } finally {
      setLoading(false);
    }
  }, [type, status]);

  useEffect(() => {
    load();
  }, [load]);

  const switchType = (t) => {
    setType(t);
    setStatus(t === 'reports' ? 'open' : 'new');
  };

  const update = async (payload) => {
    setBusy(payload.id);
    try {
      const r = await fetch('/api/admin/reports', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ type, ...payload }),
      });
      const j = await r.json().catch(() => ({}));
      if (!r.ok) throw new Error(j.error || 'Update failed');
      await load();
    } catch (e) {
      setError(e.message);
    } finally {
      setBusy(null);
    }
  };

  const countOf = (s) => data.counts?.find((c) => c.status === s)?.n || 0;
  const filters = type === 'reports' ? REPORT_FILTERS : MESSAGE_FILTERS;

  return (
    <div className="container-fluid p-0">
      <div className="d-flex flex-wrap gap-2 align-items-center justify-content-between mb-4">
        <div className="match-tabs" style={{ display: 'inline-flex' }}>
          <button className={`match-tab border-0 ${type === 'reports' ? 'active' : 'bg-transparent'}`} onClick={() => switchType('reports')}>
            <i className="bi bi-flag me-2" /> Safety Reports
          </button>
          <button className={`match-tab border-0 ${type === 'messages' ? 'active' : 'bg-transparent'}`} onClick={() => switchType('messages')}>
            <i className="bi bi-envelope me-2" /> Contact Enquiries
          </button>
        </div>
        <div className="d-flex gap-2">
          {filters.map((f) => (
            <button key={f} className={`btn btn-sm px-3 ${status === f ? 'btn-primary' : 'btn-outline-secondary'}`} onClick={() => setStatus(f)}>
              <span className="text-capitalize">{f}</span>
              {f !== 'all' && <span className="ms-2 badge rounded-pill bg-light text-dark">{countOf(f)}</span>}
            </button>
          ))}
        </div>
      </div>

      {error && <div className="alert alert-danger">{error}</div>}

      {loading ? (
        <div className="admin-card loading-skeleton" style={{ height: 260 }} />
      ) : data.results.length === 0 ? (
        <div className="admin-card p-5 text-center">
          <div className="why-icon"><i className={`bi ${type === 'reports' ? 'bi-shield-check' : 'bi-inbox'}`} /></div>
          <h3 style={{ fontSize: '1.8rem' }}>{type === 'reports' ? 'No reports here' : 'No enquiries here'}</h3>
          <p className="text-muted mb-0">Nothing needs your attention in this view.</p>
        </div>
      ) : type === 'reports' ? (
        <div className="d-flex flex-column gap-3">
          {data.results.map((r) => (
            <div key={r.id} className="admin-card p-4">
              <div className="d-flex flex-wrap justify-content-between gap-3">
                <div>
                  <span className={`badge rounded-pill me-2 ${r.status === 'open' ? 'bg-danger' : r.status === 'resolved' ? 'bg-success' : 'bg-secondary'}`}>{r.status}</span>
                  <span className="badge rounded-pill badge-gold">{r.reason}</span>
                  {r.total_reports_against > 1 && (
                    <span className="badge rounded-pill bg-warning-subtle text-dark ms-2">
                      <i className="bi bi-exclamation-triangle me-1" />{r.total_reports_against} reports against this member
                    </span>
                  )}
                  <h5 className="mt-3 mb-1">
                    Reported:{' '}
                    <Link href={`/matrimoney/profile-details/${r.reported_matri_id}`} className="text-danger" target="_blank">
                      {r.reported_name || r.reported_matri_id}
                    </Link>{' '}
                    <small className="text-muted font-monospace">{r.reported_matri_id}</small>
                    {!r.reported_active && <span className="badge bg-secondary ms-2">Deactivated</span>}
                  </h5>
                  <small className="text-muted">
                    by {r.reporter_name || r.reporter_matri_id || 'member'} · {fmt(r.created_at)}
                  </small>
                  {r.details && <p className="mt-3 mb-0 p-3 rounded-3" style={{ background: '#fffdf9', border: '1px solid #f1e6d4' }}>{r.details}</p>}
                  {r.admin_note && <p className="mt-2 mb-0 small text-muted"><b>Note:</b> {r.admin_note}</p>}
                </div>
                <div className="d-flex flex-column gap-2" style={{ minWidth: 190 }}>
                  {r.status === 'open' ? (
                    <>
                      <button className="btn btn-primary btn-sm" disabled={busy === r.id} onClick={() => update({ id: r.id, status: 'resolved', deactivate: true, note: 'Profile deactivated after review' })}>
                        <i className="bi bi-person-x me-1" /> Deactivate member
                      </button>
                      <button className="btn btn-outline-danger btn-sm" disabled={busy === r.id} onClick={() => update({ id: r.id, status: 'resolved', note: 'Reviewed — warning issued' })}>
                        <i className="bi bi-check2 me-1" /> Mark resolved
                      </button>
                      <button className="btn btn-outline-secondary btn-sm" disabled={busy === r.id} onClick={() => update({ id: r.id, status: 'dismissed', note: 'No violation found' })}>
                        Dismiss
                      </button>
                    </>
                  ) : (
                    <button className="btn btn-outline-secondary btn-sm" disabled={busy === r.id} onClick={() => update({ id: r.id, status: 'open' })}>
                      Reopen
                    </button>
                  )}
                </div>
              </div>
            </div>
          ))}
        </div>
      ) : (
        <div className="d-flex flex-column gap-3">
          {data.results.map((m) => (
            <div key={m.id} className="admin-card p-4">
              <div className="d-flex flex-wrap justify-content-between gap-3">
                <div className="flex-grow-1">
                  <span className={`badge rounded-pill me-2 ${m.status === 'new' ? 'bg-danger' : 'bg-success'}`}>{m.status}</span>
                  <h5 className="d-inline">{m.subject || 'General enquiry'}</h5>
                  <div className="small text-muted mt-1">
                    {m.name} · <a href={`mailto:${m.email}`} className="text-danger">{m.email}</a> · {m.mobile} · {fmt(m.created_at)}
                  </div>
                  <p className="mt-3 mb-0" style={{ whiteSpace: 'pre-wrap' }}>{m.message}</p>
                </div>
                <div className="d-flex flex-column gap-2" style={{ minWidth: 160 }}>
                  <a className="btn btn-primary btn-sm" href={`mailto:${m.email}?subject=${encodeURIComponent('Re: ' + (m.subject || 'Your enquiry'))}`}>
                    <i className="bi bi-reply me-1" /> Reply
                  </a>
                  <button
                    className="btn btn-outline-secondary btn-sm"
                    disabled={busy === m.id}
                    onClick={() => update({ id: m.id, status: m.status === 'new' ? 'handled' : 'new' })}
                  >
                    {m.status === 'new' ? 'Mark handled' : 'Mark as new'}
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
