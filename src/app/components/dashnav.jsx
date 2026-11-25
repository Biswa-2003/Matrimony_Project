'use client';

import React, { useCallback, useEffect, useState } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { Navbar, Nav, Container, Dropdown } from 'react-bootstrap';

import GuestNav from './guestnav';
import { getSession, clearSession } from '@/lib/session-client';

import { useI18n } from "@/lib/i18n/LanguageProvider";
import LanguageSwitcher from "@/app/components/LanguageSwitcher";
/* ---------------- helpers ---------------- */
const photoUrl = (p, gender) => {
  if (!p || /default\.jpg$/.test(p)) return String(gender).toLowerCase() === 'male' ? '/images/avatar-male.svg' : '/images/avatar-female.svg';
  if (/^(https?:|data:|\/)/.test(p)) return p;
  return p.startsWith('uploads/') ? `/${p}` : `/uploads/${p}`;
};

const timeAgo = (ts) => {
  const s = Math.max(1, Math.floor((Date.now() - new Date(ts).getTime()) / 1000));
  if (s < 60) return 'just now';
  const m = Math.floor(s / 60);
  if (m < 60) return `${m}m ago`;
  const h = Math.floor(m / 60);
  if (h < 24) return `${h}h ago`;
  const d = Math.floor(h / 24);
  if (d < 7) return `${d}d ago`;
  return new Date(ts).toLocaleDateString('en-IN', { day: 'numeric', month: 'short' });
};

const NOTIF_META = {
  interest: { icon: 'bi-heart-fill', tone: 'ruby', text: 'sent you an interest', href: '/matrimoney/interests?filter=received' },
  accepted: { icon: 'bi-hearts', tone: 'green', text: 'accepted your interest 💛', href: null },
  declined: { icon: 'bi-x-circle', tone: 'muted', text: 'declined your interest', href: null },
  view: { icon: 'bi-eye-fill', tone: 'gold', text: 'viewed your profile', href: null },
  photo_request: { icon: 'bi-camera-fill', tone: 'gold', text: 'would like to see your photo', href: '/dashboard/upload-photo' },
};

const MATCH_GROUPS = [
  {
    title: 'Discover',
    items: [
      { key: 'overall', href: '/matrimoney/matches/overall', label: 'All Matches', desc: 'Everyone suited to you', icon: 'bi-people' },
      { key: 'newmatches', href: '/matrimoney/matches/newmatches', label: 'New Matches', desc: 'Joined recently', icon: 'bi-stars' },
      { key: 'premium', href: '/matrimoney/matches/premium_matches', label: 'Premium Matches', desc: 'Premium members', icon: 'bi-gem' },
      { key: 'mutual', href: '/matrimoney/matches/mutual_matches', label: 'Mutual Matches', desc: 'You match each other', icon: 'bi-arrow-left-right' },
    ],
  },
  {
    title: 'Activity',
    items: [
      { key: 'viewedMe', href: '/matrimoney/matches/who-viewed-myprofile', label: 'Who Viewed Me', desc: 'Visitors to your profile', icon: 'bi-eye' },
      { key: 'viewed', href: '/matrimoney/matches/already-viewed', label: 'Viewed by Me', desc: 'Profiles you opened', icon: 'bi-clock-history' },
      { key: 'yetToView', href: '/matrimoney/matches/yet-to-viewed-myprofile', label: 'Yet to View', desc: 'Not opened yet', icon: 'bi-search-heart' },
    ],
  },
];

/* Toggles rendered as plain anchors so react-bootstrap handles keyboard + aria */
const PlainToggle = React.forwardRef(({ children, onClick, className, ...rest }, ref) => (
  <a
    href="#"
    ref={ref}
    onClick={(e) => {
      e.preventDefault();
      onClick(e);
    }}
    className={className}
    {...rest}
  >
    {children}
  </a>
));
PlainToggle.displayName = 'PlainToggle';

export default function DashNav() {
  const { t } = useI18n();
  const pathname = usePathname();
  const [isScrolled, setIsScrolled] = useState(false);
  const [user, setUser] = useState(null);
  const [isCheckingAuth, setIsCheckingAuth] = useState(true);
  const [isLoggingOut, setIsLoggingOut] = useState(false);
  const [plan, setPlan] = useState(null);
  const [counts, setCounts] = useState({ overall: 0, newmatches: 0, premium: 0, mutual: 0, viewed: 0, viewedMe: 0, yetToView: 0 });
  const [notifications, setNotifications] = useState({ count: 0, list: [] });
  const [msgUnread, setMsgUnread] = useState(0);

  /* scroll state */
  useEffect(() => {
    const onScroll = () => setIsScrolled(window.scrollY > 30);
    onScroll();
    window.addEventListener('scroll', onScroll, { passive: true });
    return () => window.removeEventListener('scroll', onScroll);
  }, []);

  /* session (shared + cached) */
  useEffect(() => {
    let cancelled = false;
    getSession().then((u) => {
      if (cancelled) return;
      setUser(u ? { id: u.id, name: u.name || '', role: u.role || 'user', photo: u.photo_url || null, matriId: u.matri_id || null, email: u.email, gender: u.gender || null } : null);
      setIsCheckingAuth(false);
    });
    return () => {
      cancelled = true;
    };
  }, [pathname]);

  /* active plan (once per login) */
  useEffect(() => {
    if (!user?.id) return;
    fetch('/api/me/active-subscription', { cache: 'no-store' })
      .then((r) => (r.ok ? r.json() : null))
      .then((j) => setPlan(j?.active || null))
      .catch(() => {});
  }, [user?.id]);

  /* match counts: one request, throttled */
  useEffect(() => {
    if (!user?.id || isLoggingOut) return;
    let aborted = false;
    let last = 0;
    const refresh = async (force = false) => {
      if (!force && Date.now() - last < 10000) return;
      last = Date.now();
      try {
        const r = await fetch('/api/matches/counts', { credentials: 'include', cache: 'no-store' });
        if (!r.ok) return;
        const j = await r.json();
        if (!aborted && j?.counts) setCounts((p) => ({ ...p, ...j.counts }));
      } catch {}
    };
    refresh(true);
    const onViewed = () => refresh(true);
    const onVisible = () => !document.hidden && refresh();
    window.addEventListener('du:profile-view-logged', onViewed);
    document.addEventListener('visibilitychange', onVisible);
    return () => {
      aborted = true;
      window.removeEventListener('du:profile-view-logged', onViewed);
      document.removeEventListener('visibilitychange', onVisible);
    };
  }, [user?.id, isLoggingOut, pathname]);

  /* notifications: poll every 60s while the tab is visible */
  const loadNotifications = useCallback(async () => {
    try {
      const res = await fetch('/api/notifications', { cache: 'no-store', credentials: 'include' });
      if (!res.ok) return;
      const data = await res.json();
      setNotifications({ count: data.count || 0, list: data.notifications || [] });
      setMsgUnread(data.messages || 0);
    } catch {}
  }, []);

  useEffect(() => {
    if (!user?.id || isLoggingOut) return;
    loadNotifications();
    const id = setInterval(() => !document.hidden && loadNotifications(), 60000);
    const onVisible = () => !document.hidden && loadNotifications();
    document.addEventListener('visibilitychange', onVisible);
    return () => {
      clearInterval(id);
      document.removeEventListener('visibilitychange', onVisible);
    };
  }, [user?.id, isLoggingOut, loadNotifications]);

  // the chat page reports its unread total as it reads/receives messages
  useEffect(() => {
    const onMsgs = (e) => setMsgUnread(Number(e.detail) || 0);
    window.addEventListener('mm:messages-unread', onMsgs);
    return () => window.removeEventListener('mm:messages-unread', onMsgs);
  }, []);

  const markAllRead = async () => {
    setNotifications((n) => ({ count: 0, list: n.list.map((x) => ({ ...x, unread: false })) }));
    fetch('/api/notifications', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ action: 'seen' }),
    }).catch(() => {});
  };

  const handleLogout = async () => {
    setIsLoggingOut(true);
    clearSession();
    try {
      await fetch('/api/logout', { method: 'POST', credentials: 'include' });
    } catch {}
    window.location.href = '/matrimoney/login';
  };

  if (pathname?.startsWith('/admin')) return null;
  if (isCheckingAuth) return <div className="nav-glass w-100" aria-hidden="true" />;
  if (!user?.id) return <GuestNav />;

  const firstName = (user.name || 'Member').split(' ')[0];
  const avatar = photoUrl(user.photo, user.gender);
  const avatarFallback = String(user.gender).toLowerCase() === 'male' ? '/images/avatar-male.svg' : '/images/avatar-female.svg';
  const navLink = (href, label) => (
    <Nav.Item>
      <Link className={`nav-link px-3 ${pathname === href ? 'nav-active' : ''}`} href={href}>
        {label}
      </Link>
    </Nav.Item>
  );

  return (
    <Navbar expand="lg" className={`navbar-light w-100 nav-glass ${isScrolled ? 'nav-scrolled' : ''}`}>
      <Container>
        <Navbar.Brand as={Link} href="/dashboard/myhome" className="d-flex align-items-center gap-2 brand-logo">
          <span className="brand-mark" aria-hidden="true" />
          <span>
            <span className="brand-word">
              <span className="brand-matri">Matri</span>
              <span className="brand-money">Money</span>
            </span>
            <span className="brand-tagline">Sacred Unions</span>
          </span>
        </Navbar.Brand>

        <Navbar.Toggle aria-controls="navContent" className="border-0 shadow-none" />

        <Navbar.Collapse id="navContent" className="justify-content-end">
          <Nav className="align-items-lg-center gap-1 gap-lg-2 mt-3 mt-lg-0">
            {navLink('/dashboard/myhome', t('nav.myHome'))}
            {navLink('/matrimoney/preference-search', t('nav.search'))}
            {navLink('/matrimoney/interests', t('nav.interests'))}
            <Nav.Item>
              <Link className={`nav-link px-3 position-relative ${pathname?.startsWith('/dashboard/messages') ? 'nav-active' : ''}`} href="/dashboard/messages">
                {t('nav.messages')}
                {msgUnread > 0 && <span className="nav-msg-badge" aria-label={`${msgUnread} unread`}>{msgUnread > 9 ? '9+' : msgUnread}</span>}
              </Link>
            </Nav.Item>
            {navLink('/matrimoney/package', t('nav.plans'))}
            <Nav.Item className="d-flex align-items-center"><LanguageSwitcher /></Nav.Item>

            {/* ---------- Matches ---------- */}
            <Dropdown as={Nav.Item} align="end">
              <Dropdown.Toggle as={PlainToggle} className={`nav-link px-3 d-flex align-items-center gap-2 ${pathname.includes('/matches/') ? 'nav-active' : ''}`}>
                <i className="bi bi-people" />
                <span>{t('nav.matches')}</span>
                {counts.overall > 0 && <span className="badge rounded-pill badge-gold">{counts.overall}</span>}
                <i className="bi bi-chevron-down small" />
              </Dropdown.Toggle>
              <Dropdown.Menu className="nav-menu nav-menu-wide p-0">
                <div className="nav-menu-head">
                  <span className="eyebrow light" style={{ fontSize: '0.6rem' }}>Your Matches</span>
                  <div className="d-flex align-items-end justify-content-between">
                    <h4 className="mb-0 text-white" style={{ fontSize: '1.6rem' }}>Find the one</h4>
                    <Link href="/matrimoney/preference-search" className="btn btn-gold btn-sm px-3">
                      <i className="bi bi-search me-1" /> Search
                    </Link>
                  </div>
                </div>
                <div className="row g-0 p-2">
                  {MATCH_GROUPS.map((g) => (
                    <div key={g.title} className="col-12 col-md-6 p-1">
                      <div className="nav-menu-label">{g.title}</div>
                      {g.items.map((it) => (
                        <Dropdown.Item key={it.key} as={Link} href={it.href} className={`nav-tile ${pathname === it.href ? 'active' : ''}`}>
                          <span className="nav-tile-icon"><i className={`bi ${it.icon}`} /></span>
                          <span className="flex-grow-1 overflow-hidden">
                            <span className="nav-tile-title">{it.label}</span>
                            <span className="nav-tile-desc">{it.desc}</span>
                          </span>
                          <span className={`nav-count ${counts[it.key] ? 'has' : ''}`}>{counts[it.key] || 0}</span>
                        </Dropdown.Item>
                      ))}
                    </div>
                  ))}
                </div>
              </Dropdown.Menu>
            </Dropdown>

            {/* ---------- Notifications ---------- */}
            <Dropdown as={Nav.Item} align="end" onToggle={(open) => open && notifications.count > 0 && setTimeout(markAllRead, 2500)}>
              <Dropdown.Toggle as={PlainToggle} className="nav-link px-2 position-relative nav-bell" aria-label={`Notifications${notifications.count ? `, ${notifications.count} unread` : ''}`}>
                <i className="bi bi-bell fs-5" />
                {notifications.count > 0 && <span className="nav-bell-dot">{notifications.count > 9 ? '9+' : notifications.count}</span>}
              </Dropdown.Toggle>
              <Dropdown.Menu className="nav-menu nav-menu-notif p-0">
                <div className="d-flex align-items-center justify-content-between px-3 pt-3 pb-2">
                  <div>
                    <h5 className="mb-0">Notifications</h5>
                    <small className="text-muted">{notifications.count ? `${notifications.count} new` : 'You’re all caught up'}</small>
                  </div>
                  {notifications.count > 0 && (
                    <button type="button" className="btn btn-sm btn-link text-danger text-decoration-none p-0" onClick={markAllRead}>
                      Mark all read
                    </button>
                  )}
                </div>
                <div className="nav-notif-list">
                  {notifications.list.length === 0 ? (
                    <div className="text-center px-4 py-5">
                      <span className="why-icon" style={{ width: 60, height: 60, fontSize: '1.4rem' }}><i className="bi bi-bell" /></span>
                      <div className="fw-semibold" style={{ color: 'var(--maroon-900)' }}>No notifications yet</div>
                      <small className="text-muted">Interests, acceptances and profile visits will appear here.</small>
                    </div>
                  ) : (
                    notifications.list.map((n) => {
                      const meta = NOTIF_META[n.type] || NOTIF_META.view;
                      return (
                        <Dropdown.Item
                          key={`${n.type}-${n.id}`}
                          as={Link}
                          href={meta.href || `/matrimoney/profile-details/${n.matri_id}`}
                          className={`nav-notif ${n.unread ? 'unread' : ''}`}
                        >
                          <span className="position-relative flex-shrink-0">
                            <img
                              src={photoUrl(n.photo_path, n.gender)}
                              alt=""
                              width={44}
                              height={44}
                              className="rounded-circle object-fit-cover"
                              onError={(e) => { e.currentTarget.onerror = null; e.currentTarget.src = photoUrl(null, n.gender); }}
                            />
                            <span className={`nav-notif-type tone-${meta.tone}`}><i className={`bi ${meta.icon}`} /></span>
                          </span>
                          <span className="flex-grow-1 text-wrap">
                            <span className="d-block small lh-sm">
                              <b style={{ color: 'var(--maroon-900)' }}>{n.name}</b> <span className="text-muted">{meta.text}</span>
                            </span>
                            <span className="nav-notif-time">{timeAgo(n.timestamp)}</span>
                          </span>
                          {n.unread && <span className="nav-unread-dot" aria-label="unread" />}
                        </Dropdown.Item>
                      );
                    })
                  )}
                </div>
                <div className="nav-menu-foot">
                  <Link href="/matrimoney/interests?filter=received" className="small fw-semibold text-danger">View all interests →</Link>
                </div>
              </Dropdown.Menu>
            </Dropdown>

            {/* ---------- Account ---------- */}
            <Dropdown as={Nav.Item} align="end" className="ms-lg-1">
              <Dropdown.Toggle as={PlainToggle} className="nav-user">
                <img src={avatar} alt="" width={36} height={36} className="rounded-circle object-fit-cover"
                  onError={(e) => { e.currentTarget.onerror = null; e.currentTarget.src = avatarFallback; }} />
                <span className="d-none d-xl-inline text-truncate" style={{ maxWidth: 110 }}>{firstName}</span>
                <i className="bi bi-chevron-down small" />
              </Dropdown.Toggle>
              <Dropdown.Menu className="nav-menu nav-menu-user p-0">
                <div className="nav-menu-head d-flex align-items-center gap-3">
                  <img src={avatar} alt="" width={56} height={56} className="rounded-circle object-fit-cover"
                    style={{ border: '2px solid var(--gold)' }}
                    onError={(e) => { e.currentTarget.onerror = null; e.currentTarget.src = avatarFallback; }} />
                  <div className="overflow-hidden">
                    <div className="text-white fw-semibold text-truncate">{user.name || 'Member'}</div>
                    <small className="text-white-50 d-block text-truncate">{user.matriId || user.email}</small>
                    {plan ? (
                      <span className="badge badge-gold mt-1"><i className="bi bi-gem me-1" />{plan.code || plan.name} member</span>
                    ) : (
                      <Link href="/matrimoney/package" className="badge bg-light text-dark mt-1">Free · Upgrade</Link>
                    )}
                  </div>
                </div>

                <div className="p-2">
                  {user.role === 'admin' && (
                    <Dropdown.Item as={Link} href="/admin" className="nav-row admin">
                      <i className="bi bi-shield-lock" /> Admin Console
                    </Dropdown.Item>
                  )}
                  <div className="nav-menu-label">My Profile</div>
                  {user.matriId && (
                    <Dropdown.Item as={Link} href={`/matrimoney/profile-details/${user.matriId}`} className="nav-row">
                      <i className="bi bi-person-badge" /> View My Profile
                    </Dropdown.Item>
                  )}
                  <Dropdown.Item as={Link} href="/dashboard/profile-edit" className="nav-row"><i className="bi bi-pencil-square" /> Edit Profile</Dropdown.Item>
                  <Dropdown.Item as={Link} href="/dashboard/upload-photo" className="nav-row"><i className="bi bi-images" /> Manage Photos</Dropdown.Item>
                  <Dropdown.Item as={Link} href="/matrimoney/shortlist" className="nav-row"><i className="bi bi-bookmark-heart" /> My Shortlist</Dropdown.Item>
                  <Dropdown.Item as={Link} href="/dashboard/messages" className="nav-row"><i className="bi bi-chat-heart" /> Messages</Dropdown.Item>
                  <Dropdown.Item as={Link} href="/dashboard/refer" className="nav-row"><i className="bi bi-gift" /> Invite friends · earn days</Dropdown.Item>
                  <Dropdown.Item as={Link} href="/dashboard/profile-setting" className="nav-row"><i className="bi bi-gear" /> Settings &amp; Privacy</Dropdown.Item>
                  <Dropdown.Item as={Link} href="/dashboard/profile-setting?tab=security" className="nav-row"><i className="bi bi-shield-lock" /> Login &amp; Security</Dropdown.Item>

                  <div className="nav-menu-label">Help</div>
                  <Dropdown.Item as={Link} href="/matrimoney/safety" className="nav-row"><i className="bi bi-shield-check" /> Safety Centre</Dropdown.Item>
                  <Dropdown.Item as={Link} href="/matrimoney/contactus" className="nav-row"><i className="bi bi-headset" /> Contact Support</Dropdown.Item>
                  <Dropdown.Item as={Link} href="/matrimoney/feedback" className="nav-row"><i className="bi bi-chat-square-heart" /> Feedback</Dropdown.Item>
                </div>
                <div className="nav-menu-foot d-flex gap-2">
                  {!plan && (
                    <Link href="/matrimoney/package" className="btn btn-gold btn-sm flex-grow-1">
                      <i className="bi bi-gem me-1" /> Upgrade
                    </Link>
                  )}
                  <button type="button" onClick={handleLogout} className="btn btn-outline-danger btn-sm flex-grow-1" disabled={isLoggingOut}>
                    <i className="bi bi-box-arrow-right me-1" /> {isLoggingOut ? 'Signing out…' : 'Logout'}
                  </button>
                </div>
              </Dropdown.Menu>
            </Dropdown>
          </Nav>
        </Navbar.Collapse>
      </Container>
    </Navbar>
  );
}
