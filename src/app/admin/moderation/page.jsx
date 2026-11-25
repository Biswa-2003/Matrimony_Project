'use client';

import Link from 'next/link';
import { useCallback, useEffect, useState } from 'react';

const TABS = [
  { key: 'messages', label: 'Flagged messages', icon: 'bi-chat-square-dots' },
  { key: 'profiles', label: 'Profile text', icon: 'bi-person-lines-fill' },
  { key: 'accounts', label: 'Suspended & banned', icon: 'bi-person-slash' },
  { key: 'audit', label: 'Admin log', icon: 'bi-journal-text' },
];
const QUICK_REASONS = ['Sharing contact details to avoid plans', 'Asking for money / scam behaviour', 'Abusive or disrespectful language', 'Fake or misleading profile'];
const fmt = (t) => new Date(t).toLocaleString('en-IN', { day: 'numeric', month: 'short', hour: 'numeric', minute: '2-digit' });
const ACTION_LABEL = {
  'moderation.dismiss': 'Dismissed flag', 'member.warn': 'Warned member', 'member.suspend': 'Suspended member', 'member.ban': 'Banned member',
  'member.restore': 'Restored account', 'otp.reveal': 'Viewed sign-up code', 'otp.issue': 'Issued sign-up code', 'otp.cancel': 'Cancelled sign-up code',
  'coupon.create': 'Created coupon', 'coupon.enable': 'Enabled coupon', 'coupon.disable': 'Disabled coupon', 'member.update': 'Edited member', 'member.delete': 'Deleted member', 'report.update': 'Updated report',
};

export default function ModerationPage() {
  const [tab, setTab] = useState('messages');
  const [data, setData] = useState(null);
  const [error, setError] = useState('');
  const [busy, setBusy] = useState('');
  const [toast, setToast] = useState(null);
  const [dialog, setDialog] = useState(null); // { action, item, kind }

  const load = useCallback(async (t = tab) => {
    setData(null);
    try {
      const r = await fetch(`/api/admin/moderation?tab=${t}`, { cache: 'no-store' });
      const j = await r.json();
      if (!r.ok) throw new Error(j.error);
      setData(j);
      setError('');
    } catch (e) {
      setError(e.message || 'Could not load the queue.');
    }
  }, [tab]);
  useEffect(() => { load(tab); }, [tab, load]);

  useEffect(() => {
    if (!toast) return;
    const id = setTimeout(() => setToast(null), 3500);
    return () => clearTimeout(id);
  }, [toast]);

  const run = async (body) => {
    setBusy(body.id || body.userId);
    try {
      const r = await fetch('/api/admin/moderation', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) });
      const j = await r.json().catch(() => ({}));
      if (!r.ok) throw new Error(j.error || 'Action failed');
      setToast({ type: 'ok', text: j.message || 'Done.' });
      setDialog(null);
      load(tab);
    } catch (e) {
      setToast({ type: 'error', text: e.message });
    } finally {
      setBusy('');
    }
  };

  const kindFor = tab === 'messages' ? 'message' : 'profile';
  const count = (k) => data?.counts?.[k] || 0;

  const ItemActions = ({ item }) => (
    <div className="d-flex flex-wrap gap-2 align-items-start align-self-start">
      <button className="btn btn-sm btn-outline-secondary" disabled={busy === item.id} onClick={() => run({ action: 'dismiss', kind: kindFor, id: item.id, userId: item.user_id })}>
        <i className="bi bi-check2 me-1" />Looks fine
      </button>
      <button className="btn btn-sm btn-outline-warning" onClick={() => setDialog({ action: 'warn', item, kind: kindFor })}><i className="bi bi-exclamation-triangle me-1" />Warn</button>
      <button className="btn btn-sm btn-outline-danger" onClick={() => setDialog({ action: 'suspend', item, kind: kindFor })}><i className="bi bi-pause-circle me-1" />Suspend</button>
      <button className="btn btn-sm btn-danger" onClick={() => setDialog({ action: 'ban', item, kind: kindFor })}><i className="bi bi-slash-circle me-1" />Ban</button>
    </div>
  );

  const Who = ({ item }) => (
    <div className="d-flex flex-wrap align-items-center gap-2 mb-2">
      {item.matri_id ? (
        <Link href={`/matrimoney/profile-details/${item.matri_id}`} target="_blank" className="fw-semibold text-danger">{item.name}</Link>
      ) : <span className="fw-semibold">{item.name}</span>}
      {item.matri_id && <small className="text-muted font-monospace">{item.matri_id}</small>}
      {item.warnings > 0 && <span className="badge rounded-pill bg-warning-subtle text-dark"><i className="bi bi-exclamation-triangle me-1" />{item.warnings} warning{item.warnings > 1 ? 's' : ''}</span>}
      {item.sender_flags > 1 && <span className="badge rounded-pill bg-danger-subtle text-danger">{item.sender_flags} flagged messages</span>}
    </div>
  );

  return (
    <div className="container-fluid p-0">
      <p className="text-muted small mb-4">Automatic filters flag phone numbers, links and money requests. Admins only ever see flagged items — never whole private chats.</p>

      <div className="match-tabs mb-4" style={{ display: 'inline-flex', flexWrap: 'wrap' }}>
        {TABS.map((t) => (
          <button key={t.key} className={`match-tab border-0 ${tab === t.key ? 'active' : 'bg-transparent'}`} onClick={() => setTab(t.key)}>
            <i className={`bi ${t.icon} me-2`} />{t.label}
            {t.key !== 'audit' && count(t.key) > 0 && <span className="ms-2 badge rounded-pill bg-danger">{count(t.key)}</span>}
          </button>
        ))}
      </div>

      {error && <div className="alert alert-danger">{error}</div>}
      {!data && !error && <div className="admin-card loading-skeleton" style={{ height: 240 }} />}

      {data && data.items.length === 0 && (
        <div className="admin-card p-5 text-center">
          <div className="why-icon"><i className="bi bi-shield-check" /></div>
          <h3 style={{ fontSize: '1.8rem' }}>All clear</h3>
          <p className="text-muted mb-0">Nothing needs review here right now.</p>
        </div>
      )}

      {data && tab === 'messages' && data.items.map((m) => (
        <div key={m.id} className="admin-card p-4 mb-3">
          <div className="d-flex flex-wrap justify-content-between gap-3">
            <div style={{ flex: '1 1 420px', minWidth: 0 }}>
              <Who item={m} />
              <blockquote className="mod-quote">{m.body}</blockquote>
              <small className="text-muted"><i className="bi bi-robot me-1" />{m.flag_reason?.split('.')[0]} · {fmt(m.created_at)}</small>
            </div>
            <ItemActions item={m} />
          </div>
        </div>
      ))}

      {data && tab === 'profiles' && data.items.map((f) => (
        <div key={f.id} className="admin-card p-4 mb-3">
          <div className="d-flex flex-wrap justify-content-between gap-3">
            <div style={{ flex: '1 1 420px', minWidth: 0 }}>
              <Who item={f} />
              <div className="small text-muted mb-1">{f.field === 'about_me' ? 'About me' : 'About family'} · contains {(f.reasons || []).join(', ')}</div>
              <blockquote className="mod-quote">{f.excerpt}</blockquote>
              <small className="text-muted">{fmt(f.created_at)}</small>
            </div>
            <ItemActions item={f} />
          </div>
        </div>
      ))}

      {data && tab === 'accounts' && data.items.length > 0 && (
        <div className="admin-card p-0 overflow-hidden">
          <table className="table align-middle mb-0">
            <thead><tr><th>Member</th><th>Status</th><th>Reason</th><th /></tr></thead>
            <tbody>
              {data.items.map((a) => (
                <tr key={a.user_id}>
                  <td><Who item={a} /></td>
                  <td>{a.banned_at ? <span className="badge bg-danger">Banned {fmt(a.banned_at)}</span> : <span className="badge bg-warning text-dark">Suspended until {fmt(a.suspended_until)}</span>}</td>
                  <td className="small">{a.moderation_reason}</td>
                  <td className="text-end">
                    <button className="btn btn-sm btn-outline-success" disabled={busy === a.user_id} onClick={() => run({ action: 'unban', userId: a.user_id })}>
                      <i className="bi bi-arrow-counterclockwise me-1" />Restore
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {data && tab === 'audit' && data.items.length > 0 && (
        <div className="admin-card p-0 overflow-hidden">
          <table className="table align-middle mb-0 small">
            <thead><tr><th>When</th><th>Admin</th><th>Action</th><th>Member</th><th>Details</th></tr></thead>
            <tbody>
              {data.items.map((a) => (
                <tr key={a.id}>
                  <td className="text-nowrap">{fmt(a.created_at)}</td>
                  <td>{a.admin_name}</td>
                  <td><span className="badge rounded-pill badge-gold">{ACTION_LABEL[a.action] || a.action}</span></td>
                  <td>{a.target_matri ? <Link href={`/matrimoney/profile-details/${a.target_matri}`} target="_blank">{a.target_name}</Link> : (a.target_name || '—')}</td>
                  <td className="text-muted">{a.details?.reason || a.details?.email || a.details?.code || (a.details?.days ? `${a.details.days} days` : '') || (a.details ? Object.keys(a.details).filter((k) => k !== 'id').join(', ') : '')}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {dialog && <ActionDialog dialog={dialog} busy={!!busy} onCancel={() => setDialog(null)}
        onConfirm={(reason, days) => run({ action: dialog.action, kind: dialog.kind, id: dialog.item.id, userId: dialog.item.user_id, reason, days })} />}

      {toast && (
        <div className={`ix-toast ${toast.type === 'error' ? 'error' : ''}`} role="status">
          <i className={`bi ${toast.type === 'error' ? 'bi-exclamation-circle-fill' : 'bi-check-circle-fill'}`} /> <span>{toast.text}</span>
        </div>
      )}
    </div>
  );
}

function ActionDialog({ dialog, busy, onCancel, onConfirm }) {
  const [reason, setReason] = useState(QUICK_REASONS[0]);
  const [days, setDays] = useState(7);
  const title = { warn: 'Warn member', suspend: 'Suspend member', ban: 'Ban member' }[dialog.action];
  const help = {
    warn: 'They get an email with the reason. Nothing else changes.',
    suspend: 'They are signed out everywhere and cannot log in until the suspension ends.',
    ban: 'The account is closed, hidden from everyone, and signed out everywhere. You can restore it later.',
  }[dialog.action];
  return (
    <div className="mx-modal-backdrop" onClick={onCancel}>
      <div className="mx-modal" role="dialog" aria-modal="true" onClick={(e) => e.stopPropagation()}>
        <h3>{title}: {dialog.item.name}</h3>
        <p>{help}</p>
        <label className="form-label small fw-semibold">Reason (shown in the audit log{dialog.action === 'warn' ? ' and the email' : ''})</label>
        <div className="d-flex flex-wrap gap-2 mb-2">
          {QUICK_REASONS.map((r) => (
            <button key={r} type="button" className={`btn btn-sm rounded-pill ${reason === r ? 'btn-primary' : 'btn-outline-secondary'}`} onClick={() => setReason(r)}>{r}</button>
          ))}
        </div>
        <textarea className="form-control mb-3" rows={2} maxLength={300} value={reason} onChange={(e) => setReason(e.target.value)} />
        {dialog.action === 'suspend' && (
          <div className="mb-3">
            <label className="form-label small fw-semibold">Length</label>
            <select className="form-select" value={days} onChange={(e) => setDays(Number(e.target.value))}>
              {[1, 3, 7, 14, 30, 90].map((d) => <option key={d} value={d}>{d} day{d > 1 ? 's' : ''}</option>)}
            </select>
          </div>
        )}
        <div className="d-flex justify-content-end gap-2">
          <button className="btn btn-outline-secondary rounded-pill px-3" onClick={onCancel}>Cancel</button>
          <button className={`btn rounded-pill px-3 ${dialog.action === 'warn' ? 'btn-warning' : 'btn-danger'}`} disabled={busy || !reason.trim()} onClick={() => onConfirm(reason.trim(), days)}>
            {title}
          </button>
        </div>
      </div>
    </div>
  );
}
