'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';

export default function AdminDashboardPage() {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState(false);

  const fetchStats = async () => {
    try {
      setLoading(true);
      const res = await fetch('/api/admin/stats');
      const json = await res.json();
      if (res.ok) {
        setData(json);
      }
    } catch (e) {
      console.error('Failed to load admin stats', e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchStats();
  }, []);

  const handleQuickVerify = async (userId, currentStatus) => {
    try {
      setActionLoading(true);
      const res = await fetch(`/api/admin/users/${userId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ is_verified: !currentStatus }),
      });
      if (res.ok) {
        fetchStats();
      }
    } catch (e) {
      console.error(e);
    } finally {
      setActionLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="d-flex flex-column align-items-center justify-content-center py-5">
        <div className="spinner-border text-danger" role="status" style={{ width: '3rem', height: '3rem' }}>
          <span className="visually-hidden">Loading...</span>
        </div>
        <p className="mt-3 text-muted fw-semibold">Loading live matrimonial metrics...</p>
      </div>
    );
  }

  const stats = data?.stats || {
    totalUsers: 0,
    totalProfiles: 0,
    activeProfiles: 0,
    verifiedProfiles: 0,
    pendingVerifications: 0,
    maleProfiles: 0,
    femaleProfiles: 0,
    activeSubscriptions: 0,
    estimatedRevenue: 0,
  };

  const malePercent = stats.totalProfiles > 0 ? Math.round((stats.maleProfiles / stats.totalProfiles) * 100) : 50;
  const femalePercent = stats.totalProfiles > 0 ? Math.round((stats.femaleProfiles / stats.totalProfiles) * 100) : 50;
  const verifiedPercent = stats.totalProfiles > 0 ? Math.round((stats.verifiedProfiles / stats.totalProfiles) * 100) : 0;

  return (
    <div className="container-fluid p-0">
      {/* Welcome Banner */}
      <div
        className="card border-0 text-white p-4 mb-4 shadow-sm"
        style={{
          background: 'linear-gradient(135deg, #490B22 0%, #C2185B 50%, #E33183 100%)',
          borderRadius: '16px',
        }}
      >
        <div className="d-flex flex-column flex-md-row align-items-md-center justify-content-between gap-3">
          <div>
            <span className="badge bg-white bg-opacity-25 text-white mb-2 px-3 py-1 rounded-pill">
              ✨ Admin Control Dashboard
            </span>
            <h2 className="fw-bold mb-1 font-heading text-white">Welcome back, Administrator</h2>
            <p className="mb-0 text-white-50">
              Here is what is happening across MatriMoney today. Review new members, verifications, and subscriptions.
            </p>
          </div>
          <div className="d-flex gap-2">
            <Link href="/admin/verifications" className="btn btn-light fw-bold px-3 py-2 rounded-pill shadow-sm">
              <i className="bi bi-patch-check-fill text-danger me-1"></i> Verify Profiles ({stats.pendingVerifications})
            </Link>
            <Link href="/admin/users" className="btn btn-outline-light fw-bold px-3 py-2 rounded-pill">
              <i className="bi bi-person-plus-fill me-1"></i> Manage Members
            </Link>
          </div>
        </div>
      </div>

      {/* KPI Stat Cards */}
      <div className="row g-3 mb-4">
        {/* Total Users */}
        <div className="col-12 col-sm-6 col-xl-3">
          <div className="card admin-card bg-white p-3 h-100">
            <div className="d-flex justify-content-between align-items-center mb-2">
              <span className="text-muted small fw-semibold">TOTAL USERS</span>
              <div
                className="rounded-3 d-flex align-items-center justify-content-center text-white"
                style={{ width: 40, height: 40, background: '#4F46E5' }}
              >
                <i className="bi bi-people-fill fs-5"></i>
              </div>
            </div>
            <h3 className="fw-bold text-dark mb-1">{stats.totalUsers}</h3>
            <div className="d-flex align-items-center text-success small">
              <i className="bi bi-arrow-up-right me-1"></i>
              <span>Registered accounts</span>
            </div>
          </div>
        </div>

        {/* Total Matrimony Profiles */}
        <div className="col-12 col-sm-6 col-xl-3">
          <div className="card admin-card bg-white p-3 h-100">
            <div className="d-flex justify-content-between align-items-center mb-2">
              <span className="text-muted small fw-semibold">ACTIVE PROFILES</span>
              <div
                className="rounded-3 d-flex align-items-center justify-content-center text-white"
                style={{ width: 40, height: 40, background: '#E33183' }}
              >
                <i className="bi bi-person-hearts fs-5"></i>
              </div>
            </div>
            <h3 className="fw-bold text-dark mb-1">{stats.totalProfiles}</h3>
            <div className="d-flex align-items-center text-success small">
              <i className="bi bi-check-circle-fill me-1 text-primary"></i>
              <span>{stats.activeProfiles} currently active</span>
            </div>
          </div>
        </div>

        {/* Verification Status */}
        <div className="col-12 col-sm-6 col-xl-3">
          <div className="card admin-card bg-white p-3 h-100">
            <div className="d-flex justify-content-between align-items-center mb-2">
              <span className="text-muted small fw-semibold">VERIFICATION</span>
              <div
                className="rounded-3 d-flex align-items-center justify-content-center text-white"
                style={{ width: 40, height: 40, background: '#10B981' }}
              >
                <i className="bi bi-patch-check-fill fs-5"></i>
              </div>
            </div>
            <h3 className="fw-bold text-dark mb-1">{stats.verifiedProfiles}</h3>
            <div className="d-flex align-items-center text-warning small">
              <i className="bi bi-clock-history me-1"></i>
              <span>{stats.pendingVerifications} awaiting review</span>
            </div>
          </div>
        </div>

        {/* Estimated Revenue & Subscriptions */}
        <div className="col-12 col-sm-6 col-xl-3">
          <div className="card admin-card bg-white p-3 h-100">
            <div className="d-flex justify-content-between align-items-center mb-2">
              <span className="text-muted small fw-semibold">ACTIVE SUBSCRIPTIONS</span>
              <div
                className="rounded-3 d-flex align-items-center justify-content-center text-white"
                style={{ width: 40, height: 40, background: '#F59E0B' }}
              >
                <i className="bi bi-gem fs-5"></i>
              </div>
            </div>
            <h3 className="fw-bold text-dark mb-1">{stats.activeSubscriptions}</h3>
            <div className="d-flex align-items-center text-muted small">
              <i className="bi bi-cash-stack me-1 text-success"></i>
              <span>₹{stats.estimatedRevenue.toLocaleString('en-IN')} revenue</span>
            </div>
          </div>
        </div>
      </div>

      {/* Analytics & Quick Overview Section */}
      <div className="row g-3 mb-4">
        {/* Gender Demographics */}
        <div className="col-12 col-lg-6">
          <div className="card admin-card bg-white p-4 h-100">
            <h5 className="fw-bold mb-3 d-flex align-items-center gap-2">
              <i className="bi bi-gender-ambiguous text-primary"></i> Gender Community Ratio
            </h5>
            <div className="d-flex justify-content-between mb-2">
              <span className="fw-semibold text-secondary">
                <i className="bi bi-gender-male text-primary me-1"></i> Grooms: {stats.maleProfiles} ({malePercent}%)
              </span>
              <span className="fw-semibold text-danger">
                <i className="bi bi-gender-female text-danger me-1"></i> Brides: {stats.femaleProfiles} ({femalePercent}%)
              </span>
            </div>
            <div className="progress" style={{ height: '14px', borderRadius: '10px' }}>
              <div
                className="progress-bar"
                role="progressbar"
                style={{ width: `${malePercent}%`, backgroundColor: '#3B82F6' }}
                aria-valuenow={malePercent}
                aria-valuemin="0"
                aria-valuemax="100"
              ></div>
              <div
                className="progress-bar"
                role="progressbar"
                style={{ width: `${femalePercent}%`, backgroundColor: '#EC4899' }}
                aria-valuenow={femalePercent}
                aria-valuemin="0"
                aria-valuemax="100"
              ></div>
            </div>

            <hr className="my-4" />

            <h5 className="fw-bold mb-3 d-flex align-items-center gap-2">
              <i className="bi bi-shield-check text-success"></i> Profile Trust & Verification
            </h5>
            <div className="d-flex justify-content-between mb-2 small text-muted">
              <span>Verified: {stats.verifiedProfiles}</span>
              <span>Pending: {stats.pendingVerifications}</span>
            </div>
            <div className="progress" style={{ height: '10px', borderRadius: '10px' }}>
              <div
                className="progress-bar bg-success"
                role="progressbar"
                style={{ width: `${verifiedPercent}%` }}
              ></div>
              <div
                className="progress-bar bg-warning"
                role="progressbar"
                style={{ width: `${100 - verifiedPercent}%` }}
              ></div>
            </div>
          </div>
        </div>

        {/* Membership Plans Snapshot */}
        <div className="col-12 col-lg-6">
          <div className="card admin-card bg-white p-4 h-100">
            <div className="d-flex justify-content-between align-items-center mb-3">
              <h5 className="fw-bold mb-0 d-flex align-items-center gap-2">
                <i className="bi bi-stars text-warning"></i> Membership Plans Distribution
              </h5>
              <Link href="/admin/subscriptions" className="small text-decoration-none fw-semibold text-danger">
                Manage Plans &rarr;
              </Link>
            </div>

            <div className="d-flex flex-column gap-3">
              {data?.plans?.map((plan) => (
                <div key={plan.code} className="p-3 rounded-3 border bg-light d-flex align-items-center justify-content-between">
                  <div className="d-flex align-items-center gap-3">
                    <div
                      className="rounded-circle d-flex align-items-center justify-content-center text-white fw-bold"
                      style={{
                        width: 40,
                        height: 40,
                        background:
                          plan.code === 'PLAT'
                            ? '#8B5CF6'
                            : plan.code === 'GOLD'
                            ? '#F59E0B'
                            : '#06B6D4',
                      }}
                    >
                      <i className="bi bi-gem"></i>
                    </div>
                    <div>
                      <div className="fw-bold text-dark">{plan.name}</div>
                      <small className="text-muted">₹{plan.price_inr} • Code: {plan.code}</small>
                    </div>
                  </div>
                  <div className="text-end">
                    <span className="badge bg-white text-dark border px-3 py-2 rounded-pill fw-bold">
                      {plan.subscribers} Subscribers
                    </span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* Recent Registrations Table */}
      <div className="card admin-card bg-white p-4">
        <div className="d-flex flex-column flex-md-row justify-content-between align-items-md-center gap-2 mb-3">
          <div>
            <h5 className="fw-bold mb-1 font-heading">Recent Member Registrations</h5>
            <small className="text-muted">Latest individuals who signed up on the matrimony network</small>
          </div>
          <Link href="/admin/users" className="btn btn-outline-danger btn-sm rounded-pill px-3 fw-bold">
            View All Members ({stats.totalUsers}) &rarr;
          </Link>
        </div>

        <div className="table-responsive">
          <table className="table table-hover align-middle mb-0">
            <thead className="table-light">
              <tr>
                <th scope="col" className="text-uppercase small fw-bold">Member</th>
                <th scope="col" className="text-uppercase small fw-bold">Matri ID</th>
                <th scope="col" className="text-uppercase small fw-bold">Contact</th>
                <th scope="col" className="text-uppercase small fw-bold">Gender</th>
                <th scope="col" className="text-uppercase small fw-bold">Status</th>
                <th scope="col" className="text-uppercase small fw-bold">Verification</th>
                <th scope="col" className="text-uppercase small fw-bold text-end">Action</th>
              </tr>
            </thead>
            <tbody>
              {data?.recentUsers?.map((u) => {
                const fullName = [u.first_name, u.last_name].filter(Boolean).join(' ') || u.email.split('@')[0];
                return (
                  <tr key={u.id}>
                    <td>
                      <div className="d-flex align-items-center gap-2">
                        {u.photo_url ? (
                          <img
                            src={u.photo_url}
                            alt={fullName}
                            className="rounded-circle object-fit-cover"
                            style={{ width: 36, height: 36 }}
                          />
                        ) : (
                          <div
                            className="rounded-circle bg-danger-subtle text-danger fw-bold d-flex align-items-center justify-content-center"
                            style={{ width: 36, height: 36 }}
                          >
                            {fullName.charAt(0).toUpperCase()}
                          </div>
                        )}
                        <div>
                          <div className="fw-semibold text-dark">{fullName}</div>
                          <small className="text-muted" style={{ fontSize: '0.75rem' }}>{u.role}</small>
                        </div>
                      </div>
                    </td>
                    <td>
                      <span className="badge bg-light text-dark border font-monospace">
                        {u.matri_id || 'N/A'}
                      </span>
                    </td>
                    <td>
                      <div>{u.email}</div>
                      <small className="text-muted">{u.phone || 'No phone'}</small>
                    </td>
                    <td>
                      <span className={`badge ${u.gender === 'Female' ? 'bg-danger-subtle text-danger' : 'bg-primary-subtle text-primary'}`}>
                        {u.gender || 'Not specified'}
                      </span>
                    </td>
                    <td>
                      <span className={`badge ${u.profile_active !== false ? 'bg-success-subtle text-success' : 'bg-secondary-subtle text-secondary'}`}>
                        {u.profile_active !== false ? 'Active' : 'Deactivated'}
                      </span>
                    </td>
                    <td>
                      <span className={`badge ${u.is_verified ? 'bg-success text-white' : 'bg-warning text-dark'}`}>
                        {u.is_verified ? 'Verified' : 'Pending'}
                      </span>
                    </td>
                    <td className="text-end">
                      <button
                        onClick={() => handleQuickVerify(u.id, u.is_verified)}
                        disabled={actionLoading}
                        className={`btn btn-sm rounded-pill px-3 ${
                          u.is_verified ? 'btn-outline-secondary' : 'btn-success'
                        }`}
                        title={u.is_verified ? 'Revoke verification' : 'Mark as verified'}
                      >
                        <i className={`bi ${u.is_verified ? 'bi-x-circle' : 'bi-check-circle'} me-1`}></i>
                        {u.is_verified ? 'Unverify' : 'Verify'}
                      </button>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
