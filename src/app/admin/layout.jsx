'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import 'bootstrap-icons/font/bootstrap-icons.css';

const NAV_GROUPS = [
  {
    title: 'Management',
    items: [
      { label: 'Overview', href: '/admin', icon: 'bi-grid-1x2' },
      { label: 'Insights', href: '/admin/insights', icon: 'bi-graph-up-arrow' },
      { label: 'Members', href: '/admin/users', icon: 'bi-people' },
      { label: 'Verifications', href: '/admin/verifications', icon: 'bi-patch-check', badge: 'pending_verifications' },
      { label: 'Sign-up OTP Help', href: '/admin/otp', icon: 'bi-key', badge: 'otp_help' },
      { label: 'Subscriptions', href: '/admin/subscriptions', icon: 'bi-gem' },
      { label: 'Coupons & Referrals', href: '/admin/coupons', icon: 'bi-ticket-perforated' },
      { label: 'Reports & Enquiries', href: '/admin/reports', icon: 'bi-flag', badge: ['open_reports', 'new_messages'] },
      { label: 'Moderation', href: '/admin/moderation', icon: 'bi-shield-exclamation', badge: 'flagged_items' },
    ],
  },
  {
    title: 'Website Content',
    items: [
      { label: 'Site Images', href: '/admin/media', icon: 'bi-images' },
      { label: 'Success Stories', href: '/admin/stories', icon: 'bi-hearts', badge: 'pending_stories' },
      { label: 'Site Settings', href: '/admin/settings', icon: 'bi-sliders' },
    ],
  },
];
const NAV = NAV_GROUPS.flatMap((g) => g.items);

const SUBTITLES = {
  '/admin': 'A royal view of your matrimony community',
  '/admin/users': 'Search, review and manage every member profile',
  '/admin/verifications': 'Approve genuine profiles to keep the community trusted',
  '/admin/subscriptions': 'Membership plans, subscribers and revenue',
  '/admin/reports': 'Member safety reports and contact-form enquiries',
  '/admin/media': 'Replace the pictures shown across the public website',
  '/admin/stories': 'Publish, edit and moderate couples’ success stories',
  '/admin/settings': 'Announcement bar and other site-wide settings',
};

export default function AdminLayout({ children }) {
  const pathname = usePathname();
  const [admin, setAdmin] = useState(null);
  const [state, setState] = useState('loading'); // loading | ok | denied
  const [collapsed, setCollapsed] = useState(false);
  const [mobileOpen, setMobileOpen] = useState(false);

  useEffect(() => {
    let cancelled = false;
    fetch('/api/me', { credentials: 'include', cache: 'no-store' })
      .then((res) => (res.ok ? res.json() : Promise.reject(res.status)))
      .then((data) => {
        if (cancelled) return;
        if (data.role === 'admin') {
          setAdmin(data);
          setState('ok');
        } else {
          setState('denied');
        }
      })
      .catch(() => {
        if (!cancelled) window.location.href = '/matrimoney/login';
      });
    return () => {
      cancelled = true;
    };
  }, []);

  useEffect(() => setMobileOpen(false), [pathname]);

  // "needs attention" counts for sidebar badges (refreshed on navigation)
  const [attention, setAttention] = useState({});
  useEffect(() => {
    if (state !== 'ok') return;
    fetch('/api/admin/overview', { cache: 'no-store' })
      .then((r) => (r.ok ? r.json() : null))
      .then((j) => j?.attention && setAttention(j.attention))
      .catch(() => {});
  }, [state, pathname]);
  const badgeFor = (item) => {
    if (!item.badge) return 0;
    const keys = Array.isArray(item.badge) ? item.badge : [item.badge];
    return keys.reduce((n, k) => n + (Number(attention[k]) || 0), 0);
  };

  const handleLogout = async () => {
    try {
      await fetch('/api/logout', { method: 'POST', credentials: 'include' });
    } catch {}
    window.location.href = '/matrimoney/login';
  };

  if (state === 'loading') {
    return (
      <div className="admin-shell d-flex align-items-center justify-content-center min-vh-100">
        <div className="text-center">
          <span className="brand-mark d-inline-block mb-3 animate-float" style={{ width: 64, height: 64 }} />
          <div className="text-muted small">Opening the control room…</div>
        </div>
      </div>
    );
  }

  if (state === 'denied') {
    return (
      <div className="admin-shell d-flex align-items-center justify-content-center min-vh-100 p-4">
        <div className="luxe-card p-5 text-center" style={{ maxWidth: 460 }}>
          <div className="why-icon"><i className="bi bi-shield-lock" /></div>
          <h2 className="mb-2" style={{ fontSize: '2rem' }}>Restricted Area</h2>
          <p className="text-muted">The admin console is available to administrators only.</p>
          <div className="d-flex gap-2 justify-content-center mt-4">
            <Link href="/dashboard/myhome" className="btn btn-primary">Go to My Dashboard</Link>
            <Link href="/" className="btn btn-outline-danger">Home</Link>
          </div>
        </div>
      </div>
    );
  }

  const current = NAV.find((n) => n.href === pathname) || NAV.find((n) => pathname.startsWith(n.href) && n.href !== '/admin');
  const initials = (admin?.name || 'A').split(' ').map((w) => w[0]).slice(0, 2).join('').toUpperCase();
  const today = new Date().toLocaleDateString('en-IN', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' });

  return (
    <div className={`admin-shell d-flex min-vh-100 ${collapsed ? 'is-collapsed' : ''}`}>
      {mobileOpen && <div className="admin-backdrop d-lg-none" onClick={() => setMobileOpen(false)} />}

      <aside className={`admin-sidebar d-flex flex-column ${mobileOpen ? 'open' : ''}`}>
        <div className="mandala-deco light" style={{ width: 420, height: 420, left: -210, bottom: -160 }} aria-hidden="true" />

        <div className="admin-brand d-flex align-items-center justify-content-between">
          <Link href="/admin" className="brand-logo">
            <span className="brand-mark" aria-hidden="true" />
            {!collapsed && (
              <span>
                <span className="brand-word" style={{ fontSize: '1.5rem' }}>
                  <span className="text-white">Matri</span>
                  <span className="gold-text">Money</span>
                </span>
                <span className="brand-tagline" style={{ color: 'var(--gold-light)' }}>Admin Console</span>
              </span>
            )}
          </Link>
          <button
            onClick={() => setCollapsed(!collapsed)}
            className="admin-collapse d-none d-lg-inline-flex"
            title={collapsed ? 'Expand sidebar' : 'Collapse sidebar'}
            aria-label="Toggle sidebar"
          >
            <i className={`bi ${collapsed ? 'bi-chevron-right' : 'bi-chevron-left'}`} />
          </button>
        </div>

        <div className="flex-grow-1 overflow-auto px-3 py-4 position-relative">
          {NAV_GROUPS.map((group, gi) => (
            <div key={group.title} className={gi ? 'mt-4' : ''}>
              {!collapsed && <div className="admin-section-label">{group.title}</div>}
              <nav className="d-flex flex-column gap-1">
                {group.items.map((item) => {
                  const active = pathname === item.href;
                  const count = badgeFor(item);
                  return (
                    <Link key={item.href} href={item.href} className={`admin-link ${active ? 'active' : ''}`} title={item.label}>
                      <span className="position-relative d-inline-flex">
                        <i className={`bi ${item.icon}${active && !item.icon.endsWith('images') && !item.icon.endsWith('sliders') ? '-fill' : ''}`} />
                        {collapsed && count > 0 && <span className="admin-dot" />}
                      </span>
                      {!collapsed && <span className="flex-grow-1">{item.label}</span>}
                      {!collapsed && count > 0 && <span className="admin-badge">{count > 99 ? '99+' : count}</span>}
                    </Link>
                  );
                })}
              </nav>
            </div>
          ))}

          {!collapsed && <div className="admin-section-label mt-4">Shortcuts</div>}
          <nav className="d-flex flex-column gap-1">
            <Link href="/" className="admin-link" title="Public website">
              <i className="bi bi-globe2" />
              {!collapsed && <span>Public Website</span>}
            </Link>
            <Link href="/dashboard/myhome" className="admin-link" title="Member dashboard">
              <i className="bi bi-person-badge" />
              {!collapsed && <span>Member View</span>}
            </Link>
          </nav>
        </div>

        <div className="admin-user d-flex align-items-center gap-2 position-relative">
          <div className="admin-avatar">{initials}</div>
          {!collapsed && (
            <div className="text-truncate flex-grow-1">
              <div className="fw-semibold text-white small text-truncate">{admin?.name || 'Administrator'}</div>
              <div className="text-white-50 text-truncate" style={{ fontSize: '0.7rem' }}>{admin?.email}</div>
            </div>
          )}
          <button onClick={handleLogout} className="admin-collapse" title="Sign out" aria-label="Sign out">
            <i className="bi bi-box-arrow-right" />
          </button>
        </div>
      </aside>

      <div className="admin-content flex-grow-1 d-flex flex-column" style={{ minWidth: 0 }}>
        <header className="admin-topbar d-flex align-items-center justify-content-between gap-3">
          <div className="d-flex align-items-center gap-3">
            <button onClick={() => setMobileOpen(true)} className="btn btn-light d-lg-none px-2 py-1" aria-label="Open menu">
              <i className="bi bi-list fs-4" />
            </button>
            <div>
              <div className="eyebrow" style={{ fontSize: '0.62rem' }}>{today}</div>
              <h1 className="mb-0" style={{ fontSize: '1.9rem' }}>{current?.label || 'Admin Console'}</h1>
              <small className="text-muted d-none d-md-block">{SUBTITLES[pathname] || 'Manage your matrimony community'}</small>
            </div>
          </div>

          <div className="d-flex align-items-center gap-2">
            <span className="admin-status d-none d-md-inline-flex">
              <span className="dot" /> Live
            </span>
            <Link href="/" className="btn btn-outline-danger btn-sm px-3 d-none d-sm-inline-flex align-items-center gap-2">
              <i className="bi bi-globe2" /> Website
            </Link>
            <button onClick={handleLogout} className="btn btn-primary btn-sm px-3 d-flex align-items-center gap-2">
              <i className="bi bi-power" /> <span className="d-none d-sm-inline">Sign Out</span>
            </button>
          </div>
        </header>

        <main className="admin-main flex-grow-1 p-3 p-md-4">{children}</main>
      </div>

      <style jsx global>{`
        .admin-shell {
          background:
            url('/images/paisley.svg') repeat,
            linear-gradient(180deg, #fbf7f0 0%, #f5ecdd 100%);
        }
        .admin-sidebar {
          position: fixed;
          left: 0;
          top: 0;
          height: 100vh;
          width: 272px;
          min-width: 272px;
          overflow: hidden;
          color: #fff;
          background:
            url('/images/paisley-light.svg') repeat,
            linear-gradient(180deg, #5a0f22 0%, #3b0a16 55%, #1c030b 100%);
          border-right: 1px solid rgba(232, 207, 142, 0.25);
          box-shadow: 12px 0 40px -20px rgba(28, 3, 11, 0.6);
          transition: width 0.35s cubic-bezier(0.16, 1, 0.3, 1), min-width 0.35s cubic-bezier(0.16, 1, 0.3, 1), transform 0.35s ease;
          z-index: 1050;
        }
        .is-collapsed .admin-sidebar { width: 84px; min-width: 84px; }
        /* Sidebar is fixed, so the content column reserves its width */
        .admin-content { margin-left: 272px; transition: margin-left 0.35s cubic-bezier(0.16, 1, 0.3, 1); }
        .is-collapsed .admin-content { margin-left: 84px; }
        .is-collapsed .admin-brand { justify-content: center !important; flex-direction: column; gap: 10px; }
        .admin-brand { padding: 22px 18px; border-bottom: 1px solid rgba(232, 207, 142, 0.18); position: relative; }
        .admin-collapse {
          width: 34px; height: 34px;
          border-radius: 10px;
          border: 1px solid rgba(232, 207, 142, 0.3);
          background: rgba(255, 255, 255, 0.05);
          color: var(--gold-light);
          display: inline-flex; align-items: center; justify-content: center;
          transition: all 0.25s ease;
          flex-shrink: 0;
        }
        .admin-collapse:hover { background: var(--foil); color: var(--maroon-900); }
        .admin-section-label {
          font-size: 0.62rem;
          letter-spacing: 0.26em;
          text-transform: uppercase;
          color: rgba(232, 207, 142, 0.7);
          padding: 0 14px;
          margin-bottom: 8px;
        }
        .admin-link {
          display: flex; align-items: center; gap: 14px;
          padding: 11px 14px;
          border-radius: 14px;
          color: rgba(255, 255, 255, 0.72);
          font-family: var(--font-poppins), sans-serif;
          font-size: 0.9rem;
          position: relative;
          transition: all 0.25s ease;
        }
        .is-collapsed .admin-link { justify-content: center; }
        .admin-link i { font-size: 1.15rem; }
        .admin-link:hover { background: rgba(255, 255, 255, 0.07); color: #fff; }
        .admin-badge {
          min-width: 22px; padding: 1px 7px; border-radius: 20px;
          font-size: 0.7rem; font-weight: 700; text-align: center;
          color: #fff; background: var(--ruby); border: 1px solid rgba(255,255,255,.25);
        }
        .admin-link.active .admin-badge { background: var(--maroon-900); }
        .admin-dot { position: absolute; top: -2px; right: -4px; width: 8px; height: 8px; border-radius: 50%; background: var(--ruby); border: 1px solid #fff; }
        .admin-link.active {
          color: var(--maroon-900);
          background: var(--foil);
          font-weight: 600;
          box-shadow: 0 10px 24px -12px rgba(201, 162, 74, 0.9);
        }
        .admin-user { padding: 16px 18px; border-top: 1px solid rgba(232, 207, 142, 0.18); background: rgba(0, 0, 0, 0.2); }
        .is-collapsed .admin-user { flex-direction: column; }
        .admin-avatar {
          width: 38px; height: 38px; min-width: 38px;
          border-radius: 50%;
          display: flex; align-items: center; justify-content: center;
          font-weight: 700; font-size: 0.85rem;
          color: var(--maroon-900);
          background: var(--foil);
        }
        .admin-topbar {
          position: sticky; top: 0; z-index: 1000;
          padding: 16px 28px;
          background: rgba(251, 247, 240, 0.85);
          backdrop-filter: blur(16px);
          border-bottom: 1px solid rgba(201, 162, 74, 0.25);
        }
        .admin-status {
          align-items: center; gap: 8px;
          padding: 6px 14px;
          border-radius: 50px;
          font-size: 0.78rem; font-weight: 600;
          color: #1f7a4a;
          background: #e8f6ee;
          border: 1px solid #c4ead5;
        }
        .admin-status .dot { width: 8px; height: 8px; border-radius: 50%; background: #22a565; animation: pulse 1.8s infinite; }
        .admin-card {
          border-radius: 20px !important;
          border: 1px solid rgba(201, 162, 74, 0.25) !important;
          background: #fff;
          box-shadow: var(--shadow-sm);
          transition: transform 0.3s ease, box-shadow 0.3s ease;
        }
        .admin-card:hover { box-shadow: var(--shadow-md); }
        .admin-backdrop { position: fixed; inset: 0; background: rgba(28, 3, 11, 0.5); z-index: 1040; }
        @media (max-width: 991.98px) {
          .admin-sidebar { position: fixed; left: 0; top: 0; transform: translateX(-100%); }
          .admin-content, .is-collapsed .admin-content { margin-left: 0; }
          .admin-sidebar.open { transform: translateX(0); }
          .is-collapsed .admin-sidebar { width: 272px; min-width: 272px; }
        }
      `}</style>
    </div>
  );
}
