'use client';

import Link from 'next/link';
import { useCallback, useEffect, useState } from 'react';

const inr = (paise) => `₹${Math.round(Number(paise || 0) / 100).toLocaleString('en-IN')}`;
const blank = { code: '', description: '', kind: 'percent', value: '', max_discount_inr: '', max_uses: '', valid_until: '', plan_codes: [] };

export default function CouponsPage() {
  const [d, setD] = useState(null);
  const [form, setForm] = useState(blank);
  const [msg, setMsg] = useState(null);
  const [busy, setBusy] = useState(false);

  const load = useCallback(() => {
    fetch('/api/admin/coupons', { cache: 'no-store' })
      .then(async (r) => { const j = await r.json(); if (!r.ok) throw new Error(j.error); setD(j); })
      .catch((e) => setMsg({ type: 'error', text: e.message }));
  }, []);
  useEffect(load, [load]);

  const create = async (e) => {
    e.preventDefault();
    setBusy(true); setMsg(null);
    const r = await fetch('/api/admin/coupons', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(form) });
    const j = await r.json().catch(() => ({}));
    setBusy(false);
    if (!r.ok) return setMsg({ type: 'error', text: j.error || 'Could not create coupon' });
    setMsg({ type: 'ok', text: `Coupon ${j.coupon.code} created.` });
    setForm(blank);
    load();
  };

  const toggle = async (c) => {
    await fetch('/api/admin/coupons', { method: 'PATCH', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ id: c.id, active: !c.active }) });
    load();
  };

  const set = (k) => (e) => setForm((f) => ({ ...f, [k]: e.target.value }));
  const status = (c) => {
    if (!c.active) return ['Disabled', 'bg-secondary'];
    if (c.valid_until && new Date(c.valid_until) < new Date()) return ['Expired', 'bg-secondary'];
    if (c.max_uses && c.used_count >= c.max_uses) return ['Used up', 'bg-warning text-dark'];
    return ['Live', 'bg-success'];
  };

  return (
    <div className="container-fluid p-0">
      <p className="text-muted small mb-4">Festival offers, partner codes and member referrals.</p>
      {msg && <div className={`alert ${msg.type === 'error' ? 'alert-danger' : 'alert-success'}`}>{msg.text}</div>}

      <div className="row g-4">
        <div className="col-xl-4">
          <form className="admin-card p-4" onSubmit={create}>
            <h5 className="mb-3">New coupon</h5>
            <label className="form-label small fw-semibold">Code</label>
            <input className="form-control mb-2 text-uppercase font-monospace" placeholder="DIWALI25" value={form.code} onChange={set('code')} required maxLength={30} />
            <label className="form-label small fw-semibold">Description (optional)</label>
            <input className="form-control mb-2" placeholder="Diwali offer" value={form.description} onChange={set('description')} maxLength={120} />
            <div className="row g-2 mb-2">
              <div className="col-6">
                <label className="form-label small fw-semibold">Type</label>
                <select className="form-select" value={form.kind} onChange={set('kind')}>
                  <option value="percent">% off</option>
                  <option value="flat">₹ off</option>
                </select>
              </div>
              <div className="col-6">
                <label className="form-label small fw-semibold">{form.kind === 'percent' ? 'Percent' : 'Amount (₹)'}</label>
                <input className="form-control" type="number" min="1" max={form.kind === 'percent' ? 100 : undefined} value={form.value} onChange={set('value')} required />
              </div>
            </div>
            {form.kind === 'percent' && (
              <>
                <label className="form-label small fw-semibold">Max discount ₹ (optional)</label>
                <input className="form-control mb-2" type="number" min="1" value={form.max_discount_inr} onChange={set('max_discount_inr')} />
              </>
            )}
            <div className="row g-2 mb-2">
              <div className="col-6">
                <label className="form-label small fw-semibold">Total uses (optional)</label>
                <input className="form-control" type="number" min="1" value={form.max_uses} onChange={set('max_uses')} />
              </div>
              <div className="col-6">
                <label className="form-label small fw-semibold">Valid until (optional)</label>
                <input className="form-control" type="date" value={form.valid_until} onChange={set('valid_until')} />
              </div>
            </div>
            <label className="form-label small fw-semibold">Only for plans (leave empty for all)</label>
            <div className="d-flex flex-wrap gap-2 mb-3">
              {(d?.plans || []).map((p) => {
                const on = form.plan_codes.includes(p.code);
                return (
                  <button key={p.code} type="button" className={`btn btn-sm rounded-pill ${on ? 'btn-primary' : 'btn-outline-secondary'}`}
                    onClick={() => setForm((f) => ({ ...f, plan_codes: on ? f.plan_codes.filter((x) => x !== p.code) : [...f.plan_codes, p.code] }))}>
                    {p.name}
                  </button>
                );
              })}
            </div>
            <p className="small text-muted">Each member can use a coupon once. GST is charged on the discounted price.</p>
            <button className="btn btn-primary w-100" disabled={busy}>{busy ? 'Creating…' : 'Create coupon'}</button>
          </form>
        </div>

        <div className="col-xl-8">
          <div className="admin-card p-0 overflow-hidden mb-4">
            <table className="table align-middle mb-0">
              <thead><tr><th>Code</th><th>Offer</th><th>Used</th><th>Discount given</th><th>Status</th><th /></tr></thead>
              <tbody>
                {!d && <tr><td colSpan={6}><div className="loading-skeleton" style={{ height: 60 }} /></td></tr>}
                {d?.coupons.length === 0 && <tr><td colSpan={6} className="text-center text-muted py-4">No coupons yet — create your first offer.</td></tr>}
                {d?.coupons.map((c) => {
                  const [label, cls] = status(c);
                  return (
                    <tr key={c.id}>
                      <td><span className="font-monospace fw-bold">{c.code}</span>{c.description && <div className="small text-muted">{c.description}</div>}</td>
                      <td className="small">
                        {c.kind === 'percent' ? `${Number(c.value)}% off` : `₹${Number(c.value)} off`}
                        {c.max_discount_inr ? ` (max ₹${Number(c.max_discount_inr)})` : ''}
                        {c.plan_codes?.length ? <div className="text-muted">{c.plan_codes.join(', ')}</div> : null}
                        {c.valid_until && <div className="text-muted">until {new Date(c.valid_until).toLocaleDateString('en-IN')}</div>}
                      </td>
                      <td>{c.used_count}{c.max_uses ? ` / ${c.max_uses}` : ''}</td>
                      <td>{inr(c.discount_given)}</td>
                      <td><span className={`badge ${cls}`}>{label}</span></td>
                      <td className="text-end"><button className="btn btn-sm btn-outline-secondary" onClick={() => toggle(c)}>{c.active ? 'Disable' : 'Enable'}</button></td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>

          <div className="admin-card p-4">
            <h5 className="mb-1">Referrals</h5>
            <p className="small text-muted">Members earn 15 premium days when a friend they invited buys a first plan.</p>
            <div className="row g-3 mb-3">
              <div className="col-6"><div className="ix-fact"><i className="bi bi-person-plus" /><div><small>Joined via invite</small><span>{d?.referrals.joined ?? '—'}</span></div></div></div>
              <div className="col-6"><div className="ix-fact"><i className="bi bi-gem" /><div><small>Upgraded</small><span>{d?.referrals.upgraded ?? '—'}</span></div></div></div>
            </div>
            {d?.referrals.top?.length > 0 && (
              <table className="table table-sm small mb-0">
                <thead><tr><th>Top referrers</th><th className="text-end">Joined</th><th className="text-end">Upgraded</th></tr></thead>
                <tbody>{d.referrals.top.map((t) => (
                  <tr key={t.matri_id || t.name}><td>{t.matri_id ? <Link href={`/matrimoney/profile-details/${t.matri_id}`} target="_blank">{t.name}</Link> : t.name}</td><td className="text-end">{t.joined}</td><td className="text-end">{t.upgraded}</td></tr>
                ))}</tbody>
              </table>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
