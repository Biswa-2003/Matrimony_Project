'use client';

import { useEffect, useState } from 'react';

export default function ReferPage() {
  const [d, setD] = useState(null);
  const [err, setErr] = useState('');
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    fetch('/api/referrals', { cache: 'no-store' })
      .then(async (r) => { const j = await r.json(); if (!r.ok) throw new Error(j.error); setD(j); })
      .catch((e) => setErr(e.message || 'Could not load your invite link.'));
  }, []);

  const text = d ? `I'm using MatriMoney to find a life partner — it's family-friendly and private. Join free with my link: ${d.link}` : '';
  const copy = async () => { try { await navigator.clipboard.writeText(d.link); setCopied(true); setTimeout(() => setCopied(false), 2000); } catch {} };

  return (
    <div className="ph-page">
      <div className="container" style={{ maxWidth: 880 }}>
        <div className="ref-hero">
          <div className="ref-gift"><i className="bi bi-gift" /></div>
          <span className="eyebrow light">Invite &amp; earn</span>
          <h1>Give a friend a head start — get {d?.rewardDays || 15} free days</h1>
          <p>Share your link. When a friend who joins with it buys their first plan, we add <strong>{d?.rewardDays || 15} premium days</strong> to your account.</p>
        </div>

        {err && <div className="rp-alert error mt-4">{err}</div>}

        {d && (
          <>
            <div className="ref-card">
              <label className="small fw-semibold text-muted text-uppercase" style={{ letterSpacing: '.05em' }}>Your invite link</label>
              <div className="input-group input-group-lg mt-1 mb-3">
                <input className="form-control" value={d.link} readOnly onFocus={(e) => e.target.select()} aria-label="Invite link" />
                <button className="btn btn-primary px-4" onClick={copy}>{copied ? <><i className="bi bi-check2" /> Copied</> : 'Copy'}</button>
              </div>
              <div className="d-flex flex-wrap gap-2">
                <a className="btn rounded-pill px-4 text-white" style={{ background: '#25D366' }} href={`https://wa.me/?text=${encodeURIComponent(text)}`} target="_blank" rel="noopener noreferrer">
                  <i className="bi bi-whatsapp me-1" /> Share on WhatsApp
                </a>
                <a className="btn btn-outline-secondary rounded-pill px-4" href={`mailto:?subject=${encodeURIComponent('Join me on MatriMoney')}&body=${encodeURIComponent(text)}`}>
                  <i className="bi bi-envelope me-1" /> Email
                </a>
                <span className="ms-auto small text-muted align-self-center">Code: <strong className="font-monospace">{d.code}</strong></span>
              </div>
            </div>

            <div className="row g-3 mt-1">
              {[
                ['bi-person-plus', 'Friends joined', d.joined],
                ['bi-gem', 'Friends upgraded', d.upgraded],
                ['bi-calendar-plus', 'Days earned', d.days],
              ].map(([i, k, v]) => (
                <div key={k} className="col-md-4"><div className="ix-fact"><i className={`bi ${i}`} /><div><small>{k}</small><span>{v}</span></div></div></div>
              ))}
            </div>
            {d.banked > 0 && (
              <p className="small text-success mt-3"><i className="bi bi-piggy-bank me-1" />{d.banked} bonus days are saved and will be added automatically to your next plan.</p>
            )}

            <div className="ref-steps">
              <h2>How it works</h2>
              <ol>
                <li><strong>Share</strong> your link with friends or relatives who are looking for a match.</li>
                <li>They <strong>register free</strong> using your link (it&apos;s remembered for 30 days).</li>
                <li>When they <strong>buy their first plan</strong>, you get {d.rewardDays} premium days — added to your current plan, or saved for your next one.</li>
              </ol>
              <p className="small text-muted mb-0">Rewards are for genuine invitations. Self-referrals and fake accounts are not rewarded.</p>
            </div>
          </>
        )}
      </div>
    </div>
  );
}
