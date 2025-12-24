'use client';

import 'bootstrap/dist/css/bootstrap.min.css';
import React, { useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import { usePathname } from 'next/navigation';
import { BsBellFill, BsPersonHeart, BsPersonCircle } from "react-icons/bs";
import { Navbar, Nav, Container, Dropdown } from 'react-bootstrap';

import GuestNav from './guestnav'; // Import GuestNav

export default function DashNav() {
  const [isScrolled, setIsScrolled] = useState(false);
  const [user, setUser] = useState(null);
  const [isCheckingAuth, setIsCheckingAuth] = useState(true); // ✅ NEW: Track if we're checking auth
  const [isLoggingOut, setIsLoggingOut] = useState(false);
  const [counts, setCounts] = useState({
    overall: 0,
    newmatches: 0,
    premium: 0,
    mutual: 0,
    viewed: 0,
    viewedMe: 0,
    yetToView: 0,
  });

  const pathname = usePathname();

  // ✅ NEW: Check for auth token immediately from cookies
  useEffect(() => {
    // Quick check: if we have auth cookies, assume logged in until API confirms
    const cookies = document.cookie;
    const hasAuthToken = cookies.includes('token=') || cookies.includes('auth_token=') || cookies.includes('auth=');

    if (hasAuthToken) {
      // Don't show guest nav, wait for user data
      setIsCheckingAuth(true);
    } else {
      // No token, definitely not logged in
      setIsCheckingAuth(false);
    }
  }, []);

  useEffect(() => {
    // Removed direct bootstrap.js import to avoid conflict with react-bootstrap
    const onScroll = () => setIsScrolled(window.scrollY > 50);
    window.addEventListener('scroll', onScroll);
    return () => window.removeEventListener('scroll', onScroll);
  }, []);

  // load current user
  useEffect(() => {
    const ac = new AbortController();

    const fetchUser = async (retries = 3) => {
      try {
        const r = await fetch('/api/me', {
          credentials: 'include',
          cache: 'no-store',
          signal: ac.signal,
        });
        if (!r.ok) {
          setIsCheckingAuth(false); // ✅ Done checking
          if (retries > 0) setTimeout(() => fetchUser(retries - 1), 500);
          return;
        }
        const j = await r.json().catch(() => null);
        const u = j?.user ?? j;
        if (u?.id) {
          setUser({ id: u.id, name: u.name || '' });
          setIsCheckingAuth(false); // ✅ Done checking
        } else {
          setIsCheckingAuth(false); // ✅ Done checking
          if (retries > 0) {
            setTimeout(() => fetchUser(retries - 1), 500);
          }
        }
      } catch {
        setIsCheckingAuth(false); // ✅ Done checking
      }
    };

    fetchUser();

    return () => ac.abort();
  }, [pathname]);

  // robust extractor
  const extractCount = (json) => {
    if (!json || typeof json !== 'object') return 0;
    const toNum = (v) => {
      const n = Number(v);
      return Number.isFinite(n) ? n : 0;
    };

    if (json.count != null) return toNum(json.count);
    if (json.total != null) return toNum(json.total);

    const d = json.data;
    if (d != null) {
      if (typeof d === 'number' || typeof d === 'string') return toNum(d);
      if (Array.isArray(d)) return d.length;
      if (typeof d === 'object') {
        if (d.count != null) return toNum(d.count);
        if (d.total != null) return toNum(d.total);
        if (Array.isArray(d.results)) return d.results.length;
        if (Array.isArray(d.rows)) return d.rows.length;
        if (Array.isArray(d.items)) return d.items.length;
        if (Array.isArray(d.list)) return d.list.length;
      }
    }

    if (json.meta?.count != null) return toNum(json.meta.count);
    if (Array.isArray(json.results)) return json.results.length;
    if (Array.isArray(json.rows)) return json.rows.length;
    if (Array.isArray(json.items)) return json.items.length;
    if (Array.isArray(json.list)) return json.list.length;

    const stack = [json];
    while (stack.length) {
      const cur = stack.pop();
      if (!cur || typeof cur !== 'object') continue;
      for (const [k, v] of Object.entries(cur)) {
        if (k === 'count' || k === 'total') {
          const n = toNum(v);
          if (n) return n;
        }
        if (Array.isArray(v)) {
          if (v.length) return v.length;
        } else if (typeof v === 'object') {
          stack.push(v);
        }
      }
    }
    return 0;
  };

  const countEndpoints = useMemo(
    () => [
      ['/api/matches/overall', 'overall'],
      ['/api/matches/newmatches', 'newmatches'],
      ['/api/matches/premium_matches', 'premium'],
      ['/api/matches/mutual_matches', 'mutual'],
      ['/api/matches/already-viewed', 'viewed'],
      ['/api/matches/who-viewed-myprofile', 'viewedMe'],
      ['/api/matches/yet-to-viewed-myprofile', 'yetToView'],
    ],
    []
  );

  useEffect(() => {
    if (!user?.id || isLoggingOut) return;
    let aborted = false;

    const fetchJson = async (url, timeout = 8000) => {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), timeout);

      try {
        const r = await fetch(url, {
          cache: 'no-store',
          credentials: 'include',
          signal: controller.signal
        });
        clearTimeout(timeoutId);

        if (r.status === 401) return { abort: true, data: {} };
        if (!r.ok) return { abort: false, data: {} };
        const data = await r.json().catch(() => ({}));
        return { abort: false, data };
      } catch (error) {
        clearTimeout(timeoutId);
        if (error.name === 'AbortError') {
          console.warn(`Request to ${url} timed out`);
        }
        return { abort: false, data: {} };
      }
    };

    const refreshCounts = async () => {
      // ⚡ OPTIMIZATION: Fetch ALL counts in PARALLEL instead of sequential
      const fetchPromises = countEndpoints.map(async ([baseUrl, key]) => {
        if (aborted) return null;

        try {
          const { abort, data } = await fetchJson(`${baseUrl}?count=1`);
          if (abort || aborted) return { key, abort: true };

          let value = extractCount(data);
          if (!value) {
            const res2 = await fetchJson(baseUrl);
            if (res2.abort || aborted) return { key, abort: true };
            const fallbackVal = extractCount(res2.data);
            if (fallbackVal) value = fallbackVal;
          }
          return { key, value: Number(value) || 0, abort: false };
        } catch {
          return { key, value: 0, abort: false };
        }
      });

      const results = await Promise.all(fetchPromises);

      // Update all counts at once
      if (!aborted) {
        const newCounts = {};
        let shouldAbort = false;

        for (const result of results) {
          if (!result) continue;
          if (result.abort) {
            shouldAbort = true;
            break;
          }
          newCounts[result.key] = result.value;
        }

        if (!shouldAbort && Object.keys(newCounts).length > 0) {
          setCounts((p) => ({ ...p, ...newCounts }));
        }
      }
    };

    refreshCounts();
    const onProfileViewed = () => refreshCounts();
    window.addEventListener('du:profile-view-logged', onProfileViewed);
    const onVisible = () => { if (!document.hidden) refreshCounts(); };
    document.addEventListener('visibilitychange', onVisible);

    return () => {
      aborted = true;
      window.removeEventListener('du:profile-view-logged', onProfileViewed);
      document.removeEventListener('visibilitychange', onVisible);
    };
  }, [user?.id, isLoggingOut, countEndpoints, extractCount]);

  // Notifications logic
  const [notifications, setNotifications] = useState({ count: 0, list: [] });
  useEffect(() => {
    // Don't fetch notifications if user is not logged in or is logging out
    if (!user?.id || isLoggingOut) {
      setNotifications({ count: 0, list: [] });
      return;
    }

    const abortController = new AbortController();
    let intervalId = null;

    const fetchNotifs = async () => {
      // Double-check user is still logged in before each fetch
      if (!user?.id || isLoggingOut) {
        return;
      }

      try {
        const res = await fetch('/api/notifications', {
          cache: 'no-store',
          credentials: 'include',
          signal: abortController.signal
        });

        if (res.ok) {
          const data = await res.json();
          setNotifications({
            count: data.count || 0,
            list: data.notifications || []
          });
        } else if (res.status === 401) {
          // Unauthorized - user might be logged out, reset notifications
          setNotifications({ count: 0, list: [] });
        } else {
          console.warn('Notifications fetch failed with status:', res.status);
        }
      } catch (e) {
        // Only log if not an abort error
        if (e.name !== 'AbortError') {
          console.error('Notifications fetch error:', e);
          console.error('Error details:', {
            name: e.name,
            message: e.message,
            stack: e.stack
          });
        }
        // Silently fail - keep existing notifications on error
        // Don't throw or show errors to user for notification polling
      }
    };

    // Initial fetch wrapped in try-catch
    fetchNotifs().catch((err) => {
      console.error('Initial notification fetch failed:', err);
    });

    // Poll every 30 seconds
    intervalId = setInterval(() => {
      fetchNotifs().catch((err) => {
        console.error('Polling notification fetch failed:', err);
      });
    }, 30000);

    return () => {
      abortController.abort();
      if (intervalId) clearInterval(intervalId);
    };
  }, [user?.id, isLoggingOut]);

  const handleLogout = async () => {
    try {
      setIsLoggingOut(true);

      // ✅ Call logout API with both methods for compatibility
      Promise.all([
        fetch('/api/logout', { method: 'GET', credentials: 'include' }).catch(() => { }),
        fetch('/api/logout', { method: 'POST', credentials: 'include' }).catch(() => { })
      ]);

      // ✅ Force redirect using multiple methods to ensure it works
      setTimeout(() => {
        window.location.href = '/matrimoney/login';
      }, 100);

      // Immediate redirect as well
      window.location.href = '/matrimoney/login';

      // These won't execute because page will redirect, but good to have
      setCounts({
        overall: 0,
        newmatches: 0,
        premium: 0,
        mutual: 0,
        viewed: 0,
        viewedMe: 0,
        yetToView: 0,
      });
      setUser(null);
    } catch (err) {
      console.error('Logout error:', err);
      // Force redirect even on error
      window.location.href = '/matrimoney/login';
    }
  };

  const displayName = (user?.name || 'My Dashboard').toUpperCase();

  const isActive = (path) => pathname === path ? 'active-nav-link' : '';

  const Badge = ({ value }) => (
    <span className="badge rounded-pill bg-danger-subtle text-danger ms-2 fw-bold" style={{ fontSize: '0.75rem' }}>
      {Number(value) || 0}
    </span>
  );

  const totalMatches =
    counts.overall +
    counts.newmatches +
    counts.premium +
    counts.mutual +
    counts.viewed +
    counts.viewedMe +
    counts.yetToView;

  // Custom Toggle components to match the design EXACTLY
  const NotificationToggle = React.forwardRef(({ children, onClick }, ref) => (
    <a
      href="#"
      ref={ref}
      onClick={(e) => {
        e.preventDefault();
        onClick(e);
      }}
      className="nav-link position-relative px-3"
    >
      {children}
    </a>
  ));
  NotificationToggle.displayName = 'NotificationToggle';

  const MatchesToggle = React.forwardRef(({ children, onClick, className }, ref) => (
    <a
      href="#"
      ref={ref}
      onClick={(e) => {
        e.preventDefault();
        onClick(e);
      }}
      className={className}
    >
      {children}
    </a>
  ));
  MatchesToggle.displayName = 'MatchesToggle';

  const UserToggle = React.forwardRef(({ children, onClick }, ref) => (
    <a
      href="#"
      ref={ref}
      onClick={(e) => {
        e.preventDefault();
        onClick(e);
      }}
      className="nav-link d-flex align-items-center gap-2 border rounded-pill pe-3 ps-2 py-1 shadow-sm bg-white hover-shadow transition-all"
    >
      {children}
    </a>
  ));
  UserToggle.displayName = 'UserToggle';


  // Global Navigation Logic

  // ✅ If still checking auth, show nothing (prevents flash)
  if (isCheckingAuth) {
    return null; // or return a minimal loading navbar if you prefer
  }

  // If user is NOT logged in, show GuestNav (Guest Mode)
  if (!user?.id) {
    return <GuestNav />;
  }

  // If user IS logged in, show Main Dashboard Navbar
  return (
    <>
      <Navbar
        expand="lg"
        className="navbar-light shadow-sm w-100"
        style={{
          position: 'fixed',
          top: 0,
          zIndex: 1030,
          backgroundColor: '#fff',
          transition: 'all 0.3s ease',
          borderBottom: '1px solid rgba(0,0,0,0.05)',
          height: '85px',
          padding: 0
        }}
      >
        <Container>
          <Navbar.Brand as={Link} href="/" className="d-flex align-items-center">
            <div className="d-flex align-items-center gap-1">
              <span className="fw-bold" style={{ fontSize: '1.75rem', fontFamily: 'serif', color: 'var(--brand-maroon)' }}>Matri</span>
              <span className="fw-bold" style={{ fontSize: '1.75rem', fontFamily: 'serif', color: 'var(--brand-primary)' }}>Money</span>
            </div>
          </Navbar.Brand>

          <Navbar.Toggle aria-controls="navContent" className="border-0 shadow-none" />

          <Navbar.Collapse id="navContent" className="justify-content-end">
            <Nav className="align-items-center gap-1 gap-lg-3 mt-3 mt-lg-0">
              <Nav.Item>
                <Link className={`nav-link fw-semibold px-3 rounded-pill transition-all ${pathname === '/dashboard/myhome' ? 'bg-primary-subtle text-primary' : 'text-secondary hover-maroon'}`} href="/dashboard/myhome">
                  My Home
                </Link>
              </Nav.Item>
              <Nav.Item>
                <Link className={`nav-link fw-semibold px-3 rounded-pill transition-all ${pathname === '/matrimoney/package' ? 'bg-primary-subtle text-primary' : 'text-secondary hover-maroon'}`} href="/matrimoney/package">
                  Plans
                </Link>
              </Nav.Item>
              <Nav.Item>
                <Link className={`nav-link fw-semibold px-3 rounded-pill transition-all ${pathname === '/matrimoney/preference-search' ? 'bg-primary-subtle text-primary' : 'text-secondary hover-maroon'}`} href="/matrimoney/preference-search">
                  Search
                </Link>
              </Nav.Item>

              {/* Notifications */}
              <Dropdown as={Nav.Item} align="end">
                <Dropdown.Toggle as={NotificationToggle}>
                  <BsBellFill size="1.25rem" className="text-secondary hover-primary" />
                  {notifications.count > 0 && (
                    <span
                      className="position-absolute translate-middle badge rounded-circle bg-danger border border-white"
                      style={{ top: "10px", right: "5px", width: 18, height: 18, padding: 0, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '0.65rem' }}
                    >
                      {notifications.count}
                    </span>
                  )}
                </Dropdown.Toggle>
                <Dropdown.Menu className="shadow border-0 rounded-4 p-0 mt-2" style={{ width: "320px", maxHeight: "400px", overflowY: "auto" }}>
                  <div className="p-3 border-bottom bg-light rounded-top-4">
                    <h6 className="mb-0 fw-bold text-maroon">Notifications</h6>
                  </div>
                  {notifications.list.length === 0 ? (
                    <div className="p-4 text-center text-muted small">No new notifications</div>
                  ) : (
                    notifications.list.map((n, i) => (
                      <Dropdown.Item
                        key={i}
                        as={Link}
                        href={n.type === 'interest' ? '/matrimoney/matches/newmatches' : '/matrimoney/matches/who-viewed-myprofile'}
                        className="d-flex align-items-center p-3 border-bottom text-wrap"
                      >
                        <div className="flex-shrink-0 me-3">
                          <Image
                            src={n.photo_path ? (n.photo_path.startsWith('/') ? n.photo_path : `/uploads/${n.photo_path}`) : "/uploads/default.jpg"}
                            alt="User"
                            width={40}
                            height={40}
                            className="rounded-circle object-fit-cover shadow-sm"
                            unoptimized
                          />
                        </div>
                        <div className="flex-grow-1">
                          <p className="mb-1 small fw-semibold text-dark lh-sm text-wrap">
                            {n.name} <span className="fw-normal text-secondary">
                              {n.type === 'interest' ? 'sent you an interest' :
                                n.type === 'accepted' ? 'accepted your interest' : 'viewed your profile'}
                            </span>
                          </p>
                          <small className="text-muted" style={{ fontSize: "0.7rem" }}>
                            {new Date(n.timestamp).toLocaleDateString()} • {new Date(n.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                          </small>
                        </div>
                      </Dropdown.Item>
                    ))
                  )}
                </Dropdown.Menu>
              </Dropdown>

              {/* Matches Dropdown */}
              <Dropdown as={Nav.Item} align="end">
                <Dropdown.Toggle
                  as={MatchesToggle}
                  className={`nav-link fw-semibold px-3 rounded-pill d-flex align-items-center gap-2 ${pathname.includes('/matches/') ? 'bg-primary-subtle text-primary' : 'text-secondary hover-maroon'}`}
                >
                  <BsPersonHeart size="1.2rem" />
                  <span>Matches</span>
                  <span className="badge rounded-pill bg-maroon">{totalMatches}</span>
                </Dropdown.Toggle>
                <Dropdown.Menu className="shadow border-0 rounded-4 mt-2 p-2" style={{ minWidth: 280 }}>
                  {[
                    { href: '/matrimoney/matches/overall', label: 'All Matches', count: counts.overall },
                    { href: '/matrimoney/matches/newmatches', label: 'New Matches', count: counts.newmatches },
                    { href: '/matrimoney/matches/premium_matches', label: 'Premium Matches', count: counts.premium },
                    { href: '/matrimoney/matches/mutual_matches', label: 'Mutual Matches', count: counts.mutual },
                    { href: '/matrimoney/matches/already-viewed', label: 'Viewed Profiles', count: counts.viewed },
                    { href: '/matrimoney/matches/who-viewed-myprofile', label: 'Who Viewed Me', count: counts.viewedMe },
                    { href: '/matrimoney/matches/yet-to-viewed-myprofile', label: 'Yet to View', count: counts.yetToView },
                  ].map((item, idx) => (
                    <Dropdown.Item key={idx} as={Link} href={item.href} className="d-flex justify-content-between align-items-center py-2 rounded-3 mb-1">
                      <span className="small fw-semibold">{item.label}</span>
                      <Badge value={item.count} />
                    </Dropdown.Item>
                  ))}
                </Dropdown.Menu>
              </Dropdown>

              {/* User Dropdown */}
              <Dropdown as={Nav.Item} align="end" className="ms-2">
                <Dropdown.Toggle as={UserToggle}>
                  <div className="bg-light rounded-circle d-flex align-items-center justify-content-center text-secondary" style={{ width: 32, height: 32 }}>
                    <BsPersonCircle size="1.2rem" />
                  </div>
                  <span className="small fw-bold text-dark mw-100 text-truncate" style={{ maxWidth: 100 }}>{displayName}</span>
                  <i className="bi bi-chevron-down small text-muted"></i>
                </Dropdown.Toggle>
                <Dropdown.Menu className="shadow border-0 rounded-4 mt-2 p-2">
                  <Dropdown.Header className="text-uppercase small fw-bold text-muted">Account</Dropdown.Header>
                  <Dropdown.Item as={Link} href="/dashboard/profile-edit" className="rounded-2 py-2">
                    <i className="bi bi-person me-2 text-primary"></i> Edit Profile
                  </Dropdown.Item>
                  <Dropdown.Item as={Link} href="/dashboard/profile-setting" className="rounded-2 py-2">
                    <i className="bi bi-gear me-2 text-primary"></i> Settings
                  </Dropdown.Item>
                  <Dropdown.Item as={Link} href="/matrimoney/shortlist" className="rounded-2 py-2">
                    <i className="bi bi-heart me-2 text-primary"></i> Shortlist
                  </Dropdown.Item>
                  <Dropdown.Divider />
                  <Dropdown.Header className="text-uppercase small fw-bold text-muted">Support</Dropdown.Header>
                  <Dropdown.Item as={Link} href="/matrimoney/aboutus" className="rounded-2 py-2">About Us</Dropdown.Item>
                  <Dropdown.Item as={Link} href="/matrimoney/contactus" className="rounded-2 py-2">Contact Us</Dropdown.Item>
                  <Dropdown.Item as={Link} href="/matrimoney/feedback" className="rounded-2 py-2">Feedback</Dropdown.Item>
                  <Dropdown.Divider />
                  <Dropdown.Item as="button" onClick={handleLogout} className="rounded-2 py-2 text-danger fw-semibold">
                    <i className="bi bi-box-arrow-right me-2"></i> Logout
                  </Dropdown.Item>
                </Dropdown.Menu>
              </Dropdown>
            </Nav>
          </Navbar.Collapse>
        </Container>
      </Navbar>

      <style jsx global>{`
        .bg-primary-subtle { background-color: #fff1f7 !important; }
        .text-primary { color: var(--brand-primary, #E33183) !important; }
        .text-maroon { color: var(--brand-maroon, #800020) !important; }
        .bg-maroon { background-color: var(--brand-maroon, #800020) !important; }
        .hover-maroon:hover { color: var(--brand-maroon, #800020) !important; }
        .hover-primary:hover { color: var(--brand-primary, #E33183) !important; }
        .hover-shadow:hover { box-shadow: 0 .5rem 1rem rgba(0,0,0,.15)!important; }
        .transition-all { transition: all 0.2s ease; }
        .dropdown-item:active, .dropdown-item.active { background-color: #fff1f7; color: var(--brand-maroon); }
        .dropdown-item:hover { background-color: #f8f9fa; }
        .navbar-toggler:focus { box-shadow: none; }
      `}</style>
    </>
  );
}
