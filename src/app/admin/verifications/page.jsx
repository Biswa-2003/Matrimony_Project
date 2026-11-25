'use client';

import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import Link from 'next/link';
import { Modal } from 'react-bootstrap';

const avatarFor = (g) => (String(g).toLowerCase() === 'male' ? '/images/avatar-male.svg' : '/images/avatar-female.svg');
const fmt = (d) => (d ? new Date(d).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' }) : '—');
const ago = (d) => {
  if (!d) return 'never';
  const days = Math.floor((Date.now() - new Date(d).getTime()) / 864e5);
  return days <= 0 ? 'today' : days === 1 ? 'yesterday' : days < 30 ? `${days} days ago` : fmt(d);
};
const nameOf = (u) => [u.first_name, u.last_name].filter(Boolean).join(' ').trim() || (u.email || '').split('@')[0] || 'Member';
const cmToFt = (cm) => {
  const n = Number(cm);
  if (!n) return null;
  const t = Math.round(n / 2.54);
  return `${Math.floor(t / 12)}ft ${t % 12}in`;
};

/** How complete a profile looks to a reviewer (0–100). */
const completeness = (u) => {
  const checks = [u.photo_url, u.phone, u.religion_name, u.caste_name, u.city_name, u.height_cm, u.gender];
  return Math.round((checks.filter(Boolean).length / checks.length) * 100);
};

const TABS = [
  ['pending', 'Pending review', 'bi-hourglass-split'],
  ['verified', 'Verified', 'bi-patch-check-fill'],
  ['all', 'All profiles', 'bi-people'],
];

export default function AdminVerificationsPage() {
  const [tab, setTab] = useState('pending');
  const [search, setSearch] = useState('');
  const [q, setQ] = useState('');
  const [gender, setGender] = useState('');
  const [photoOnly, setPhotoOnly] = useState(false);
  const [sort, setSort] = useState('newest');
  const [rows, setRows] = useState([]);
  const [totals, setTotals] = useState({ pending: 0, verified: 0 });
  const [loading, setLoading] = useState(true);
  const [selectedId, setSelectedId] = useState(null);
  const [checked, setChecked] = useState(new Set());
  const [busy, setBusy] = useState(false);
  const [zoom, setZoom] = useState(false);
  const [review, setReview] = useState({});
  const [toast, setToast] = useState('');
  const [approvedToday, setApprovedToday] = useState(0);
  const listRef = useRef(null);

  // debounce search
  useEffect(() => {
    const t = setTimeout(() => setQ(search.trim()), 300);
    return () => clearTimeout(t);
  }, [search]);

  const loadTotals = useCallback(async () => {
    const get = (v) => fetch(`/api/admin/users?verified=${v}&limit=1`, { cache: 'no-store' }).then((r) => r.json()).then((j) => j.total || 0).catch(() => 0);
    const [pending, verified] = await Promise.all([get('false'), get('true')]);
    setTotals({ pending, verified });
  }, []);

  const load = useCallback(async () => {
    setLoading(true);
    const p = new URLSearchParams({ limit: '100' });
    if (tab !== 'all') p.set('verified', tab === 'pending' ? 'false' : 'true');
    if (q) p.set('search', q);
    if (gender) p.set('gender', gender);
    try {
      const r = await fetch(`/api/admin/users?${p}`, { cache: 'no-store' });
      const j = await r.json();
      setRows(r.ok ? j.users || [] : []);
    } catch {
      setRows([]);
    } finally {
      setLoading(false);
    }
  }, [tab, q, gender]);

  useEffect(() => { load(); }, [load]);
  useEffect(() => { loadTotals(); }, [loadTotals]);
  useEffect(() => { setChecked(new Set()); }, [tab, q, gender]);
  useEffect(() => {
    if (!toast) return;
    const t = setTimeout(() => setToast(''), 2600);
    return () => clearTimeout(t);
  }, [toast]);

  const list = useMemo(() => {
    let l = rows.filter((u) => u.role !== 'admin');
    if (photoOnly) l = l.filter((u) => u.photo_url);
    l = [...l].sort((a, b) =>
      sort === 'oldest' ? new Date(a.created_at) - new Date(b.created_at)
      : sort === 'complete' ? completeness(b) - completeness(a)
      : new Date(b.created_at) - new Date(a.created_at)
    );
    return l;
  }, [rows, photoOnly, sort]);

  useEffect(() => {
    if (!list.find((u) => u.id === selectedId)) setSelectedId(list[0]?.id || null);
  }, [list, selectedId]);
  useEffect(() => setReview({}), [selectedId]);

  const current = list.find((u) => u.id === selectedId) || null;
  const idx = list.findIndex((u) => u.id === selectedId);

  const setVerified = useCallback(async (ids, value) => {
    setBusy(true);
    try {
      const results = await Promise.all(ids.map((id) =>
        fetch(`/api/admin/users/${id}`, { method: 'PATCH', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ is_verified: value }) }).then((r) => r.ok)
      ));
      const ok = results.filter(Boolean).length;
      if (value) setApprovedToday((n) => n + ok);
      setToast(value ? `${ok} profile${ok === 1 ? '' : 's'} verified ✓` : `Verification revoked for ${ok} profile${ok === 1 ? '' : 's'}`);
      // move to the next item in the queue
      if (ids.length === 1 && tab !== 'all') setSelectedId(list[idx + 1]?.id || list[idx - 1]?.id || null);
      setChecked(new Set());
      await Promise.all([load(), loadTotals()]);
    } finally {
      setBusy(false);
    }
  }, [list, idx, tab, load, loadTotals]);

  const deactivate = async (u) => {
    if (!window.confirm(`Deactivate ${nameOf(u)}'s profile? It will be hidden from all members until reactivated.`)) return;
    setBusy(true);
    const r = await fetch(`/api/admin/users/${u.id}`, { method: 'PATCH', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ is_active: false }) });
    setBusy(false);
    setToast(r.ok ? 'Profile deactivated' : 'Could not deactivate');
    load();
  };

  // keyboard: J/K or ↓/↑ to move, A to approve
  useEffect(() => {
    const onKey = (e) => {
      if (e.target.closest('input, textarea, select') || e.metaKey || e.ctrlKey || zoom) return;
      if ((e.key === 'j' || e.key === 'ArrowDown') && idx < list.length - 1) { e.preventDefault(); setSelectedId(list[idx + 1].id); }
      if ((e.key === 'k' || e.key === 'ArrowUp') && idx > 0) { e.preventDefault(); setSelectedId(list[idx - 1].id); }
      if (e.key === 'a' && current && !current.is_verified && !busy) setVerified([current.id], true);
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [idx, list, current, busy, zoom, setVerified]);

  useEffect(() => {
    listRef.current?.querySelector('.vq-item.active')?.scrollIntoView({ block: 'nearest' });
  }, [selectedId]);

  const toggleCheck = (id) => setChecked((s) => {
    const n = new Set(s);
    n.has(id) ? n.delete(id) : n.add(id);
    return n;
  });
  const allPendingChecked = list.length > 0 && list.filter((u) => !u.is_verified).every((u) => checked.has(u.id));

  const totalProfiles = totals.pending + totals.verified;
  const rate = totalProfiles ? Math.round((totals.verified / totalProfiles) * 100) : 0;
  const R = 26, C = 2 * Math.PI * R;

  const REVIEW_ITEMS = [
    ['photo', 'Photo shows a real person, clearly'],
    ['name', 'Name looks genuine and matches the photo'],
    ['contact', 'Mobile number is present and valid'],
    ['details', 'Community, location and basics filled'],
  ];
  const reviewedAll = REVIEW_ITEMS.every(([k]) => review[k]);

  return (
    <div className="container-fluid p-0 verify-page">
      {/* Summary strip */}
      <div className="row g-3 mb-4">
        {[
          ['Awaiting review', totals.pending, 'bi-hourglass-split', 'ruby'],
          ['Verified members', totals.verified, 'bi-patch-check-fill', 'gold'],
          ['Approved this session', approvedToday, 'bi-lightning-charge-fill', 'maroon'],
        ].map(([l, v, icon, tone]) => (
          <div key={l} className="col-sm-6 col-xl-3">
            <div className={`dash-stat tone-${tone}`} style={{ cursor: 'default' }}>
              <span className="dash-stat-icon"><i className={`bi ${icon}`} /></span>
              <span className="dash-stat-num">{v}</span>
              <span className="dash-stat-label">{l}</span>
            </div>
          </div>
        ))}
        <div className="col-sm-6 col-xl-3">
          <div className="dash-stat d-flex flex-row align-items-center gap-3" style={{ cursor: 'default' }}>
            <div className="position-relative flex-shrink-0" style={{ width: 66, height: 66 }}>
              <svg width="66" height="66" viewBox="0 0 66 66" style={{ transform: 'rotate(-90deg)' }}>
                <circle cx="33" cy="33" r={R} fill="none" stroke="#f3e8d6" strokeWidth="7" />
                <circle cx="33" cy="33" r={R} fill="none" stroke="#1f8a55" strokeWidth="7" strokeLinecap="round" strokeDasharray={`${(rate / 100) * C} ${C}`} style={{ transition: 'stroke-dasharray 1s ease' }} />
              </svg>
              <span className="position-absolute top-50 start-50 translate-middle fw-bold small" style={{ color: 'var(--maroon-900)' }}>{rate}%</span>
            </div>
            <div>
              <div className="fw-semibold" style={{ color: 'var(--maroon-900)' }}>Trust rate</div>
              <small className="text-muted">of profiles are verified</small>
            </div>
          </div>
        </div>
      </div>

      {/* Toolbar */}
      <div className="admin-card p-3 mb-4">
        <div className="d-flex flex-wrap gap-2 align-items-center">
          <div className="match-tabs me-auto" style={{ display: 'inline-flex', boxShadow: 'none' }}>
            {TABS.map(([k, l, icon]) => (
              <button key={k} className={`match-tab border-0 ${tab === k ? 'active' : 'bg-transparent'}`} onClick={() => setTab(k)}>
                <i className={`bi ${icon} me-1`} />{l}
                {k !== 'all' && <span className="badge rounded-pill bg-light text-dark ms-2">{k === 'pending' ? totals.pending : totals.verified}</span>}
              </button>
            ))}
          </div>
          <div className="input-group" style={{ maxWidth: 280 }}>
            <span className="input-group-text"><i className="bi bi-search" /></span>
            <input className="form-control" placeholder="Name, email, phone or ID" value={search} onChange={(e) => setSearch(e.target.value)} aria-label="Search profiles" />
          </div>
          <select className="form-select" style={{ width: 150 }} value={gender} onChange={(e) => setGender(e.target.value)} aria-label="Gender">
            <option value="">All genders</option>
            <option value="Male">Grooms</option>
            <option value="Female">Brides</option>
          </select>
          <select className="form-select" style={{ width: 170 }} value={sort} onChange={(e) => setSort(e.target.value)} aria-label="Sort">
            <option value="newest">Newest first</option>
            <option value="oldest">Oldest first</option>
            <option value="complete">Most complete</option>
          </select>
          <div className="form-check form-switch m-0 ms-1">
            <input className="form-check-input" type="checkbox" id="photo-only" checked={photoOnly} onChange={(e) => setPhotoOnly(e.target.checked)} />
            <label className="form-check-label small" htmlFor="photo-only">With photo</label>
          </div>
        </div>
      </div>

      <div className="row g-4">
        {/* Queue */}
        <div className="col-lg-5 col-xl-4">
          <div className="admin-card vq">
            <div className="vq-head">
              {tab !== 'verified' && list.some((u) => !u.is_verified) ? (
                <label className="d-flex align-items-center gap-2 small m-0" style={{ cursor: 'pointer' }}>
                  <input type="checkbox" className="form-check-input m-0" checked={allPendingChecked}
                    onChange={() => setChecked(allPendingChecked ? new Set() : new Set(list.filter((u) => !u.is_verified).map((u) => u.id)))} />
                  Select all pending
                </label>
              ) : <span className="small text-muted">{list.length} profiles</span>}
              <span className="small text-muted">{list.length} shown</span>
            </div>

            {checked.size > 0 && (
              <div className="vq-bulk">
                <span className="small fw-semibold">{checked.size} selected</span>
                <button className="btn btn-sm btn-primary px-3" disabled={busy} onClick={() => setVerified([...checked], true)}>
                  <i className="bi bi-patch-check me-1" />Verify selected
                </button>
              </div>
            )}

            <div className="vq-list" ref={listRef}>
              {loading ? (
                [0, 1, 2, 3, 4].map((k) => <div key={k} className="vq-item loading-skeleton" style={{ height: 76 }} />)
              ) : list.length === 0 ? (
                <div className="text-center p-5">
                  <div className="why-icon"><i className={`bi ${tab === 'pending' ? 'bi-emoji-smile' : 'bi-search'}`} /></div>
                  <div className="fw-semibold" style={{ color: 'var(--maroon-900)' }}>{tab === 'pending' && !q ? 'All caught up!' : 'No profiles found'}</div>
                  <small className="text-muted">{tab === 'pending' && !q ? 'Every profile has been reviewed.' : 'Try a different search or filter.'}</small>
                </div>
              ) : (
                list.map((u) => {
                  const pct = completeness(u);
                  return (
                    <div key={u.id} className={`vq-item ${u.id === selectedId ? 'active' : ''}`} onClick={() => setSelectedId(u.id)} role="button" tabIndex={0}
                      onKeyDown={(e) => e.key === 'Enter' && setSelectedId(u.id)}>
                      {!u.is_verified && (
                        <input type="checkbox" className="form-check-input m-0 flex-shrink-0" checked={checked.has(u.id)}
                          onClick={(e) => e.stopPropagation()} onChange={() => toggleCheck(u.id)} aria-label={`Select ${nameOf(u)}`} />
                      )}
                      <img src={u.photo_url || avatarFor(u.gender)} alt="" className="vq-avatar"
                        onError={(e) => { e.currentTarget.onerror = null; e.currentTarget.src = avatarFor(u.gender); }} />
                      <div className="flex-grow-1 overflow-hidden">
                        <div className="d-flex align-items-center gap-2">
                          <span className="vq-name text-truncate">{nameOf(u)}</span>
                          {u.is_verified && <i className="bi bi-patch-check-fill text-success" title="Verified" />}
                        </div>
                        <small className="text-muted d-block text-truncate">{u.matri_id || 'No ID'} · joined {ago(u.created_at)}</small>
                        <div className="vq-meter" title={`${pct}% complete`}><span style={{ width: `${pct}%` }} className={pct >= 70 ? 'good' : pct >= 40 ? 'mid' : 'low'} /></div>
                      </div>
                      {!u.photo_url && <i className="bi bi-camera text-muted opacity-50" title="No photo uploaded" />}
                    </div>
                  );
                })
              )}
            </div>
            <div className="vq-foot small text-muted">
              <kbd>J</kbd>/<kbd>K</kbd> move · <kbd>A</kbd> approve
            </div>
          </div>
        </div>

        {/* Review panel */}
        <div className="col-lg-7 col-xl-8">
          {!current ? (
            <div className="admin-card p-5 text-center h-100 d-flex flex-column align-items-center justify-content-center">
              <div className="why-icon"><i className="bi bi-person-check" /></div>
              <div className="fw-semibold" style={{ color: 'var(--maroon-900)' }}>Select a profile to review</div>
            </div>
          ) : (
            <div className="admin-card review-panel">
              <div className="vr-hero">
                <div className="mandala-deco light" style={{ width: 300, height: 300, right: -90, top: -110 }} aria-hidden="true" />
                <button type="button" className="vr-photo" onClick={() => current.photo_url && setZoom(true)} title={current.photo_url ? 'Click to enlarge' : 'No photo uploaded'}>
                  <img src={current.photo_url || avatarFor(current.gender)} alt={nameOf(current)}
                    style={current.photo_url ? undefined : { objectFit: 'contain', padding: '16%' }}
                    onError={(e) => { e.currentTarget.onerror = null; e.currentTarget.src = avatarFor(current.gender); }} />
                  {current.photo_url && <span className="vr-zoom"><i className="bi bi-arrows-fullscreen" /></span>}
                </button>
                <div className="position-relative flex-grow-1">
                  <span className={`badge rounded-pill mb-2 ${current.is_verified ? 'badge-gold' : 'bg-warning-subtle text-dark'}`}>
                    <i className={`bi ${current.is_verified ? 'bi-patch-check-fill' : 'bi-hourglass-split'} me-1`} />
                    {current.is_verified ? 'Verified' : 'Awaiting verification'}
                  </span>
                  <h2 className="text-white mb-1" style={{ fontSize: '2.2rem' }}>{nameOf(current)}</h2>
                  <div className="text-white-50 small mb-3">
                    {current.matri_id || 'No Matri ID'} · {current.gender === 'Male' ? 'Groom' : current.gender === 'Female' ? 'Bride' : 'Gender not set'}
                    {current.is_active === false && <span className="badge bg-secondary ms-2">Deactivated</span>}
                  </div>
                  <div className="d-flex flex-wrap gap-2">
                    {[current.age_years && `${current.age_years} yrs`, cmToFt(current.height_cm), current.religion_name, current.caste_name, current.city_name].filter(Boolean).map((c) => (
                      <span key={c} className="spot-fact">{c}</span>
                    ))}
                  </div>
                </div>
              </div>

              <div className="p-4">
                <div className="row g-3 mb-4">
                  {[
                    ['bi-envelope', 'Email', current.email],
                    ['bi-telephone', 'Mobile', current.phone || 'Not provided'],
                    ['bi-calendar-plus', 'Joined', fmt(current.created_at)],
                    ['bi-box-arrow-in-right', 'Last login', ago(current.last_login_at)],
                    ['bi-gem', 'Plan', current.plan_name ? `${current.plan_name} · till ${fmt(current.sub_ends_at)}` : 'Free member'],
                    ['bi-bar-chart', 'Profile completeness', `${completeness(current)}%`],
                  ].map(([icon, l, v]) => (
                    <div key={l} className="col-sm-6">
                      <div className="vr-fact">
                        <i className={`bi ${icon}`} />
                        <div className="overflow-hidden">
                          <small>{l}</small>
                          <div className="text-truncate" title={String(v)}>{v}</div>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>

                {!current.is_verified && (
                  <div className="vr-checklist mb-4">
                    <div className="small fw-semibold mb-2" style={{ color: 'var(--maroon-900)' }}>
                      <i className="bi bi-list-check me-1 text-gold" />Reviewer checklist
                    </div>
                    {REVIEW_ITEMS.map(([k, l]) => (
                      <label key={k} className={`vr-check ${review[k] ? 'on' : ''}`}>
                        <input type="checkbox" className="form-check-input m-0" checked={Boolean(review[k])} onChange={(e) => setReview((r) => ({ ...r, [k]: e.target.checked }))} />
                        {l}
                      </label>
                    ))}
                  </div>
                )}

                <div className="d-flex flex-wrap gap-2">
                  {current.is_verified ? (
                    <button className="btn btn-outline-secondary px-4" disabled={busy} onClick={() => setVerified([current.id], false)}>
                      <i className="bi bi-x-circle me-1" />Revoke verification
                    </button>
                  ) : (
                    <button className={`btn px-4 ${reviewedAll ? 'btn-gold' : 'btn-primary'}`} disabled={busy} onClick={() => setVerified([current.id], true)}>
                      {busy ? <span className="spinner-border spinner-border-sm me-2" /> : <i className="bi bi-patch-check me-1" />}
                      Approve &amp; verify
                    </button>
                  )}
                  {current.matri_id && (
                    <Link href={`/matrimoney/profile-details/${current.matri_id}`} target="_blank" className="btn btn-outline-danger px-3">
                      <i className="bi bi-box-arrow-up-right me-1" />Full profile
                    </Link>
                  )}
                  {current.is_active !== false && (
                    <button className="btn btn-outline-secondary px-3 ms-auto" disabled={busy} onClick={() => deactivate(current)} title="Hide a fake or abusive profile">
                      <i className="bi bi-slash-circle me-1" />Deactivate
                    </button>
                  )}
                </div>
                <div className="d-flex justify-content-between mt-4 pt-3" style={{ borderTop: '1px solid #f1e6d4' }}>
                  <button className="btn btn-sm btn-light" disabled={idx <= 0} onClick={() => setSelectedId(list[idx - 1]?.id)}><i className="bi bi-arrow-up me-1" />Previous</button>
                  <small className="text-muted align-self-center">{idx + 1} of {list.length}</small>
                  <button className="btn btn-sm btn-light" disabled={idx >= list.length - 1} onClick={() => setSelectedId(list[idx + 1]?.id)}>Next<i className="bi bi-arrow-down ms-1" /></button>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>

      <Modal show={zoom} onHide={() => setZoom(false)} centered size="lg">
        <Modal.Body className="p-0 bg-dark text-center">
          {current?.photo_url && <img src={current.photo_url} alt={current ? nameOf(current) : ''} style={{ maxWidth: '100%', maxHeight: '80vh' }} />}
        </Modal.Body>
      </Modal>

      {toast && <div className="mm-toast" role="status"><i className="bi bi-check-circle me-2" />{toast}</div>}

      <style jsx global>{`
        .verify-page .dash-stat { min-height: 100%; }
        .vq { display: flex; flex-direction: column; height: calc(100vh - 330px); min-height: 520px; overflow: hidden; }
        .vq-head { display: flex; justify-content: space-between; align-items: center; padding: 14px 16px; border-bottom: 1px solid #f1e6d4; }
        .vq-bulk { display: flex; justify-content: space-between; align-items: center; padding: 10px 16px; background: var(--gold-pale); border-bottom: 1px solid rgba(201,162,74,.35); animation: menuIn .2s ease; }
        .vq-list { flex-grow: 1; overflow-y: auto; padding: 8px; }
        .vq-item { display: flex; align-items: center; gap: 12px; padding: 10px 12px; margin-bottom: 4px; border-radius: 14px; border: 1px solid transparent; cursor: pointer; transition: background .15s ease, border-color .15s ease; }
        .vq-item:hover { background: #fbf4e8; }
        .vq-item.active { background: #fff; border-color: var(--gold); box-shadow: 0 8px 20px -12px rgba(59,10,22,.4); }
        .vq-avatar { width: 46px; height: 46px; border-radius: 50%; object-fit: cover; border: 2px solid var(--gold-light); background: #f6ead0; flex-shrink: 0; }
        .vq-name { font-weight: 600; color: var(--maroon-900); }
        .vq-meter { height: 4px; border-radius: 4px; background: #f1e6d4; margin-top: 6px; overflow: hidden; }
        .vq-meter span { display: block; height: 100%; border-radius: 4px; }
        .vq-meter .good { background: #1f8a55; } .vq-meter .mid { background: var(--gold); } .vq-meter .low { background: var(--ruby); }
        .vq-foot { padding: 10px 16px; border-top: 1px solid #f1e6d4; background: #fffdf9; }
        .vq-foot kbd { background: #fff; color: var(--maroon-800); border: 1px solid #e6d7bf; box-shadow: none; font-size: .72rem; }
        .review-panel { overflow: hidden; }
        .vr-hero { position: relative; overflow: hidden; display: flex; gap: 24px; align-items: center; padding: 24px; color: #fff;
          background: url('/images/paisley-light.svg') repeat, radial-gradient(120% 140% at 0% 0%, #7a1530 0%, #3b0a16 70%); }
        .vr-photo { position: relative; flex-shrink: 0; width: 150px; height: 180px; padding: 4px; border: 0; border-radius: 20px; background: var(--foil); box-shadow: 0 20px 36px -14px rgba(0,0,0,.6); }
        .vr-photo img { width: 100%; height: 100%; object-fit: cover; border-radius: 16px; background: #f6ead0; }
        .vr-zoom { position: absolute; right: 10px; bottom: 10px; width: 30px; height: 30px; border-radius: 50%; display: flex; align-items: center; justify-content: center; font-size: .8rem; color: var(--maroon-900); background: rgba(255,253,249,.92); }
        .vr-fact { display: flex; gap: 12px; align-items: center; padding: 12px 14px; border-radius: 14px; border: 1px solid #f1e6d4; background: #fffdf9; height: 100%; }
        .vr-fact > i { width: 34px; height: 34px; border-radius: 10px; display: inline-flex; align-items: center; justify-content: center; color: var(--maroon-800); background: var(--gold-pale); flex-shrink: 0; }
        .vr-fact small { display: block; font-size: .66rem; letter-spacing: .12em; text-transform: uppercase; color: var(--muted); }
        .vr-fact div div { font-weight: 600; color: var(--ink); font-size: .9rem; }
        .vr-checklist { padding: 14px 16px; border-radius: 16px; background: #fbf4e8; border: 1px dashed var(--gold); }
        .vr-check { display: flex; align-items: center; gap: 10px; padding: 6px 0; font-size: .88rem; cursor: pointer; color: var(--ink); }
        .vr-check.on { color: #1f7a4a; }
        @media (max-width: 991.98px) { .vq { height: auto; max-height: 460px; } .vr-hero { flex-direction: column; text-align: center; } }
      `}</style>
    </div>
  );
}
