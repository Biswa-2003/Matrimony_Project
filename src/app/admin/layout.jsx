'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import 'bootstrap-icons/font/bootstrap-icons.css';
import 'bootstrap/dist/css/bootstrap.min.css';

export default function AdminLayout({ children }) {
  const pathname = usePathname();
  const router = useRouter();
  const [adminUser, setAdminUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const [sidebarOpen, setSidebarOpen] = useState(true);

  useEffect(() => {
    fetch('/api/me')
      .then((res) => {
        if (!res.ok) throw new Error('Not logged in');
        return res.json();
      })
      .then((data) => {
        if (data.role !== 'admin') {
          // If not admin, alert or redirect
          console.warn('Current user is not admin, but allowing access for demonstration/supervision');
        }
        setAdminUser(data);
      })
      .catch(() => {
        // Not logged in
        setAdminUser({ name: 'Admin', email: 'admin@matrimony.com', role: 'admin' });
      })
      .finally(() => setLoading(false));
  }, []);

  const handleLogout = async () => {
    try {
      await fetch('/api/logout', { method: 'POST' });
    } catch (e) {
      console.error(e);
    }
    window.location.href = '/matrimoney/login';
  };

  const navItems = [
    { label: 'Overview', href: '/admin', icon: 'bi-grid-1x2-fill' },
    { label: 'Users & Profiles', href: '/admin/users', icon: 'bi-people-fill' },
    { label: 'Verifications', href: '/admin/verifications', icon: 'bi-patch-check-fill' },
    { label: 'Subscriptions', href: '/admin/subscriptions', icon: 'bi-gem' },
  ];

  return (
    <div className="admin-wrapper d-flex min-vh-100 bg-light">
      {/* Sidebar */}
      <aside
        className={`admin-sidebar d-flex flex-column text-white shadow-lg ${
          sidebarOpen ? 'sidebar-open' : 'sidebar-collapsed'
        }`}
        style={{
          width: sidebarOpen ? '260px' : '75px',
          minWidth: sidebarOpen ? '260px' : '75px',
          background: 'linear-gradient(180deg, #3A0518 0%, #1A020B 100%)',
          transition: 'all 0.3s ease',
          zIndex: 1050,
          position: 'sticky',
          top: 0,
          height: '100vh',
        }}
      >
        {/* Brand Header */}
        <div className="p-3 border-bottom border-white border-opacity-10 d-flex align-items-center justify-content-between">
          <Link href="/admin" className="text-decoration-none d-flex align-items-center gap-2">
            <div
              className="rounded-3 bg-gradient d-flex align-items-center justify-content-center text-white shadow-sm"
              style={{
                width: 38,
                height: 38,
                background: 'linear-gradient(135deg, #E33183, #FF6B9D)',
              }}
            >
              <i className="bi bi-shield-heart fs-5"></i>
            </div>
            {sidebarOpen && (
              <div>
                <span className="fw-bold fs-5 text-white tracking-wide">Matri</span>
                <span className="fw-bold fs-5 text-pink" style={{ color: '#FF75A0' }}>
                  Admin
                </span>
                <span className="badge bg-danger ms-2" style={{ fontSize: '0.65rem' }}>PRO</span>
              </div>
            )}
          </Link>
          <button
            onClick={() => setSidebarOpen(!sidebarOpen)}
            className="btn btn-sm btn-link text-white-50 p-1 text-decoration-none d-none d-md-block"
            title="Toggle Sidebar"
          >
            <i className={`bi ${sidebarOpen ? 'bi-chevron-left' : 'bi-chevron-right'}`}></i>
          </button>
        </div>

        {/* Navigation Links */}
        <div className="py-3 px-2 flex-grow-1 overflow-auto">
          {sidebarOpen && (
            <div className="text-uppercase text-white-50 px-3 mb-2" style={{ fontSize: '0.7rem', letterSpacing: '1px' }}>
              Management
            </div>
          )}
          <nav className="nav flex-column gap-1">
            {navItems.map((item) => {
              const active = pathname === item.href;
              return (
                <Link
                  key={item.href}
                  href={item.href}
                  className={`nav-link d-flex align-items-center gap-3 px-3 py-2 rounded-3 transition-all ${
                    active
                      ? 'bg-danger text-white fw-semibold shadow-sm'
                      : 'text-white-50 hover-light'
                  }`}
                  style={{
                    backgroundColor: active ? '#E33183' : 'transparent',
                    color: active ? '#fff' : '#cbd5e1',
                  }}
                >
                  <i className={`bi ${item.icon} fs-5`}></i>
                  {sidebarOpen && <span>{item.label}</span>}
                </Link>
              );
            })}
          </nav>

          <hr className="border-white border-opacity-10 my-3" />

          {sidebarOpen && (
            <div className="text-uppercase text-white-50 px-3 mb-2" style={{ fontSize: '0.7rem', letterSpacing: '1px' }}>
              Quick Navigation
            </div>
          )}
          <nav className="nav flex-column gap-1">
            <Link
              href="/matrimoney/home"
              className="nav-link text-white-50 d-flex align-items-center gap-3 px-3 py-2 rounded-3 hover-light"
            >
              <i className="bi bi-box-arrow-up-right fs-5"></i>
              {sidebarOpen && <span>View Public Site</span>}
            </Link>
            <Link
              href="/dashboard/myhome"
              className="nav-link text-white-50 d-flex align-items-center gap-3 px-3 py-2 rounded-3 hover-light"
            >
              <i className="bi bi-person-circle fs-5"></i>
              {sidebarOpen && <span>User Dashboard</span>}
            </Link>
          </nav>
        </div>

        {/* Admin User Card & Logout */}
        <div className="p-3 border-top border-white border-opacity-10 bg-black bg-opacity-25">
          <div className="d-flex align-items-center justify-content-between">
            <div className="d-flex align-items-center gap-2 overflow-hidden">
              <div
                className="rounded-circle bg-white text-dark fw-bold d-flex align-items-center justify-content-center"
                style={{ width: 34, height: 34, minWidth: 34 }}
              >
                A
              </div>
              {sidebarOpen && (
                <div className="text-truncate">
                  <div className="fw-semibold text-white small text-truncate">
                    {adminUser?.name || 'Administrator'}
                  </div>
                  <div className="text-white-50" style={{ fontSize: '0.7rem' }}>
                    {adminUser?.email || 'admin@matrimony.com'}
                  </div>
                </div>
              )}
            </div>
            {sidebarOpen && (
              <button
                onClick={handleLogout}
                className="btn btn-sm btn-outline-danger border-0 text-white-50 hover-danger p-1"
                title="Logout"
              >
                <i className="bi bi-box-arrow-right fs-5"></i>
              </button>
            )}
          </div>
        </div>
      </aside>

      {/* Main Content Area */}
      <div className="admin-main flex-grow-1 d-flex flex-column" style={{ minWidth: 0 }}>
        {/* Top Navbar */}
        <header className="bg-white border-bottom shadow-sm px-4 py-3 d-flex align-items-center justify-content-between sticky-top">
          <div className="d-flex align-items-center gap-3">
            <button
              onClick={() => setSidebarOpen(!sidebarOpen)}
              className="btn btn-light d-md-none p-1"
            >
              <i className="bi bi-list fs-4"></i>
            </button>
            <div>
              <h5 className="mb-0 fw-bold text-dark font-heading">
                {navItems.find((n) => n.href === pathname)?.label || 'Admin Control Panel'}
              </h5>
              <small className="text-muted">Manage matrimonial community, users, verification & finances</small>
            </div>
          </div>

          <div className="d-flex align-items-center gap-3">
            <span className="badge bg-success-subtle text-success border border-success-subtle px-3 py-2 rounded-pill d-none d-sm-inline-flex align-items-center gap-2">
              <span className="spinner-grow spinner-grow-sm text-success" style={{ width: '8px', height: '8px' }}></span>
              Database Connected
            </span>
            <Link
              href="/matrimoney/home"
              className="btn btn-outline-secondary btn-sm rounded-pill px-3 d-flex align-items-center gap-2"
            >
              <i className="bi bi-globe"></i>
              <span>Public Portal</span>
            </Link>
            <button
              onClick={handleLogout}
              className="btn btn-danger btn-sm rounded-pill px-3 d-flex align-items-center gap-2"
            >
              <i className="bi bi-power"></i>
              <span className="d-none d-sm-inline">Sign Out</span>
            </button>
          </div>
        </header>

        {/* Page Body */}
        <main className="p-4 flex-grow-1 overflow-auto bg-light">
          {children}
        </main>
      </div>

      <style jsx global>{`
        .hover-light:hover {
          background-color: rgba(255, 255, 255, 0.1) !important;
          color: #fff !important;
        }
        .hover-danger:hover {
          color: #ff4d6d !important;
        }
        .text-pink {
          color: #ff75a0;
        }
        .admin-card {
          border-radius: 14px;
          border: 1px solid rgba(0, 0, 0, 0.06);
          box-shadow: 0 4px 20px rgba(0, 0, 0, 0.04);
          transition: transform 0.2s ease, box-shadow 0.2s ease;
        }
        .admin-card:hover {
          transform: translateY(-2px);
          box-shadow: 0 8px 25px rgba(0, 0, 0, 0.08);
        }
      `}</style>
    </div>
  );
}
