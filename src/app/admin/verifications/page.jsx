'use client';

import React, { useState, useEffect } from 'react';

export default function AdminVerificationsPage() {
  const [profiles, setProfiles] = useState([]);
  const [loading, setLoading] = useState(true);
  const [tab, setTab] = useState('pending'); // 'pending' | 'verified' | 'all'
  const [actionLoading, setActionLoading] = useState(false);

  const fetchProfiles = async () => {
    try {
      setLoading(true);
      const verifiedParam = tab === 'pending' ? 'false' : tab === 'verified' ? 'true' : '';
      const res = await fetch(`/api/admin/users?verified=${verifiedParam}&limit=100`);
      const data = await res.json();
      if (res.ok) {
        setProfiles(data.users || []);
      }
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchProfiles();
  }, [tab]);

  const handleVerify = async (userId, newStatus) => {
    try {
      setActionLoading(true);
      const res = await fetch(`/api/admin/users/${userId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ is_verified: newStatus }),
      });
      if (res.ok) {
        fetchProfiles();
      }
    } catch (e) {
      console.error(e);
    } finally {
      setActionLoading(false);
    }
  };

  return (
    <div className="container-fluid p-0">
      {/* Header Bar */}
      <div className="card admin-card bg-white p-4 mb-4">
        <div className="d-flex flex-column flex-md-row justify-content-between align-items-md-center gap-3">
          <div>
            <h4 className="fw-bold mb-1 font-heading text-dark">
              <i className="bi bi-shield-check text-success me-2"></i> Profile & Photo Verification Hub
            </h4>
            <small className="text-muted">
              Review and certify matrimonial profiles to ensure authenticity and build trust.
            </small>
          </div>
          <div className="btn-group rounded-pill p-1 bg-light border">
            <button
              onClick={() => setTab('pending')}
              className={`btn btn-sm rounded-pill px-3 fw-semibold ${
                tab === 'pending' ? 'btn-danger' : 'btn-light text-muted'
              }`}
              style={tab === 'pending' ? { backgroundColor: '#E33183', borderColor: '#E33183' } : {}}
            >
              Pending Review
            </button>
            <button
              onClick={() => setTab('verified')}
              className={`btn btn-sm rounded-pill px-3 fw-semibold ${
                tab === 'verified' ? 'btn-success' : 'btn-light text-muted'
              }`}
            >
              Verified ({tab === 'verified' ? profiles.length : 'Certified'})
            </button>
            <button
              onClick={() => setTab('all')}
              className={`btn btn-sm rounded-pill px-3 fw-semibold ${
                tab === 'all' ? 'btn-secondary' : 'btn-light text-muted'
              }`}
            >
              All Profiles
            </button>
          </div>
        </div>
      </div>

      {/* Profiles Card Grid */}
      {loading ? (
        <div className="text-center py-5">
          <div className="spinner-border text-danger" role="status"></div>
          <p className="mt-2 text-muted">Scanning profiles...</p>
        </div>
      ) : profiles.length === 0 ? (
        <div className="card admin-card bg-white p-5 text-center">
          <i className="bi bi-check2-circle text-success display-3"></i>
          <h4 className="mt-3 fw-bold text-dark">All Caught Up!</h4>
          <p className="text-muted">
            {tab === 'pending'
              ? 'No pending profile verifications remaining at this time. Great job!'
              : 'No profiles found under this tab.'}
          </p>
        </div>
      ) : (
        <div className="row g-4">
          {profiles.map((u) => {
            const fullName = [u.first_name, u.last_name].filter(Boolean).join(' ') || u.email.split('@')[0];
            return (
              <div key={u.id} className="col-12 col-md-6 col-xl-4">
                <div className="card admin-card bg-white h-100 overflow-hidden position-relative">
                  {/* Status Banner */}
                  <div
                    className="p-3 text-white d-flex justify-content-between align-items-center"
                    style={{
                      background: u.is_verified
                        ? 'linear-gradient(135deg, #059669, #10B981)'
                        : 'linear-gradient(135deg, #D97706, #F59E0B)',
                    }}
                  >
                    <span className="small fw-bold">
                      <i className={`bi ${u.is_verified ? 'bi-patch-check-fill' : 'bi-hourglass-split'} me-1`}></i>
                      {u.is_verified ? 'VERIFIED PROFILE' : 'AWAITING VERIFICATION'}
                    </span>
                    <span className="badge bg-black bg-opacity-25">{u.matri_id || 'ID PENDING'}</span>
                  </div>

                  <div className="card-body p-4 text-center">
                    {/* Photo / Avatar */}
                    <div className="position-relative d-inline-block mb-3">
                      {u.photo_url ? (
                        <img
                          src={u.photo_url}
                          alt={fullName}
                          className="rounded-circle shadow object-fit-cover"
                          style={{ width: 100, height: 100, border: '3px solid #fff' }}
                        />
                      ) : (
                        <div
                          className="rounded-circle bg-danger-subtle text-danger fw-bold display-6 d-inline-flex align-items-center justify-content-center shadow"
                          style={{ width: 100, height: 100 }}
                        >
                          {fullName.charAt(0).toUpperCase()}
                        </div>
                      )}
                      {u.is_verified && (
                        <span
                          className="position-absolute bottom-0 end-0 bg-success text-white rounded-circle p-1 d-flex align-items-center justify-content-center"
                          style={{ width: 26, height: 26, border: '2px solid #fff' }}
                        >
                          <i className="bi bi-check-lg" style={{ fontSize: '0.8rem' }}></i>
                        </span>
                      )}
                    </div>

                    <h5 className="fw-bold mb-1 text-dark">{fullName}</h5>
                    <p className="small text-muted mb-3">
                      {u.gender || 'N/A'} • {u.age_years ? `${u.age_years} yrs` : 'Age N/A'} • {u.religion_name || 'Community N/A'}
                    </p>

                    <div className="bg-light rounded-3 p-3 text-start small mb-3">
                      <div className="d-flex justify-content-between mb-1">
                        <span className="text-muted">Email:</span>
                        <span className="fw-semibold text-truncate" style={{ maxWidth: '180px' }}>{u.email}</span>
                      </div>
                      <div className="d-flex justify-content-between mb-1">
                        <span className="text-muted">Phone:</span>
                        <span className="fw-semibold">{u.phone || 'Not provided'}</span>
                      </div>
                      <div className="d-flex justify-content-between mb-1">
                        <span className="text-muted">City:</span>
                        <span className="fw-semibold">{u.city_name || 'Not provided'}</span>
                      </div>
                      <div className="d-flex justify-content-between">
                        <span className="text-muted">Registered:</span>
                        <span className="fw-semibold">{new Date(u.created_at).toLocaleDateString()}</span>
                      </div>
                    </div>

                    {/* Actions */}
                    <div className="d-flex gap-2">
                      {!u.is_verified ? (
                        <button
                          onClick={() => handleVerify(u.id, true)}
                          disabled={actionLoading}
                          className="btn btn-success flex-grow-1 rounded-pill fw-bold py-2 shadow-sm"
                        >
                          <i className="bi bi-patch-check-fill me-1"></i> Approve & Verify
                        </button>
                      ) : (
                        <button
                          onClick={() => handleVerify(u.id, false)}
                          disabled={actionLoading}
                          className="btn btn-outline-warning flex-grow-1 rounded-pill fw-semibold py-2"
                        >
                          <i className="bi bi-x-circle me-1"></i> Revoke Verification
                        </button>
                      )}
                    </div>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
