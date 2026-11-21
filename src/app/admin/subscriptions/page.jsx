'use client';

import React, { useState, useEffect } from 'react';

export default function AdminSubscriptionsPage() {
  const [plans, setPlans] = useState([]);
  const [subscriptions, setSubscriptions] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showGrantModal, setShowGrantModal] = useState(false);
  const [usersList, setUsersList] = useState([]);
  const [actionLoading, setActionLoading] = useState(false);

  const [form, setForm] = useState({
    userId: '',
    planId: '',
    durationDays: '30',
    contactLimit: '50',
  });

  const fetchData = async () => {
    try {
      setLoading(true);
      const res = await fetch('/api/admin/subscriptions');
      const data = await res.json();
      if (res.ok) {
        setPlans(data.plans || []);
        setSubscriptions(data.subscriptions || []);
      }
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  const fetchUsersForSelect = async () => {
    try {
      const res = await fetch('/api/admin/users?limit=100');
      const data = await res.json();
      if (res.ok) {
        setUsersList(data.users || []);
      }
    } catch (e) {
      console.error(e);
    }
  };

  useEffect(() => {
    fetchData();
    fetchUsersForSelect();
  }, []);

  const handleGrantSubmit = async (e) => {
    e.preventDefault();
    if (!form.userId || !form.planId) {
      alert('Please select both a user and a plan.');
      return;
    }

    try {
      setActionLoading(true);
      const res = await fetch('/api/admin/subscriptions', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(form),
      });
      const data = await res.json();
      if (res.ok) {
        alert(data.message || 'Subscription granted!');
        setShowGrantModal(false);
        setForm({ userId: '', planId: '', durationDays: '30', contactLimit: '50' });
        fetchData();
      } else {
        alert(data.error || 'Failed to grant subscription');
      }
    } catch (e) {
      console.error(e);
      alert('Error granting subscription');
    } finally {
      setActionLoading(false);
    }
  };

  return (
    <div className="container-fluid p-0">
      {/* Header bar */}
      <div className="card admin-card bg-white p-4 mb-4">
        <div className="d-flex flex-column flex-md-row justify-content-between align-items-md-center gap-3">
          <div>
            <h4 className="fw-bold mb-1 font-heading text-dark">
              <i className="bi bi-gem text-warning me-2"></i> Subscriptions & Membership Control
            </h4>
            <small className="text-muted">
              Oversee membership tiers, active subscriptions, revenue, and grant complimentary access.
            </small>
          </div>
          <div>
            <button
              onClick={() => setShowGrantModal(true)}
              className="btn btn-warning rounded-pill px-4 fw-bold shadow-sm"
              style={{ background: 'linear-gradient(135deg, #F59E0B, #D97706)', color: '#fff', border: 'none' }}
            >
              <i className="bi bi-gift-fill me-2"></i> Grant / Assign Plan
            </button>
          </div>
        </div>
      </div>

      {/* Plan Tiers Overview Cards */}
      <div className="row g-4 mb-4">
        {plans.map((p) => (
          <div key={p.id} className="col-12 col-md-6 col-xl-3">
            <div className="card admin-card bg-white h-100 p-4 border-top border-4" style={{ borderTopColor: p.code === 'PLAT' ? '#8B5CF6' : p.code === 'GOLD' ? '#F59E0B' : '#06B6D4' }}>
              <div className="d-flex justify-content-between align-items-center mb-3">
                <span className="badge bg-light text-dark border px-3 py-1 font-monospace">{p.code}</span>
                <span className="fw-bold text-dark fs-5">₹{p.price_inr}</span>
              </div>
              <h5 className="fw-bold text-dark mb-1">{p.name}</h5>
              <p className="text-muted small mb-3">
                {p.duration_days} days validity • {p.contact_limit} contact unlocks
              </p>
              <div className="bg-light rounded p-2 text-center small text-secondary">
                <i className="bi bi-check-circle-fill text-success me-1"></i>
                Full profile access & messaging
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* Subscriptions Table */}
      <div className="card admin-card bg-white p-4">
        <div className="d-flex justify-content-between align-items-center mb-3">
          <h5 className="fw-bold mb-0 font-heading">Active & Recent Subscriptions</h5>
          <span className="badge bg-secondary-subtle text-secondary px-3 py-2 rounded-pill">
            {subscriptions.length} Records
          </span>
        </div>

        {loading ? (
          <div className="text-center py-5">
            <div className="spinner-border text-warning" role="status"></div>
            <p className="mt-2 text-muted">Loading subscriptions...</p>
          </div>
        ) : subscriptions.length === 0 ? (
          <div className="text-center py-5">
            <i className="bi bi-gem text-muted display-4"></i>
            <h5 className="mt-3 text-secondary">No subscriptions recorded yet</h5>
            <p className="text-muted small">Grant a subscription above to get started.</p>
          </div>
        ) : (
          <div className="table-responsive">
            <table className="table table-hover align-middle mb-0">
              <thead className="table-light">
                <tr>
                  <th scope="col" className="text-uppercase small fw-bold">Member</th>
                  <th scope="col" className="text-uppercase small fw-bold">Matri ID</th>
                  <th scope="col" className="text-uppercase small fw-bold">Plan Name</th>
                  <th scope="col" className="text-uppercase small fw-bold">Duration / Expiry</th>
                  <th scope="col" className="text-uppercase small fw-bold">Remaining Contacts</th>
                  <th scope="col" className="text-uppercase small fw-bold text-end">Status</th>
                </tr>
              </thead>
              <tbody>
                {subscriptions.map((s) => {
                  const fullName = [s.first_name, s.last_name].filter(Boolean).join(' ') || s.email;
                  return (
                    <tr key={s.id}>
                      <td>
                        <div className="fw-bold text-dark">{fullName}</div>
                        <small className="text-muted">{s.email}</small>
                      </td>
                      <td>
                        <span className="badge bg-light text-dark border font-monospace">
                          {s.matri_id || 'N/A'}
                        </span>
                      </td>
                      <td>
                        <span className="badge bg-warning-subtle text-dark border border-warning px-3 py-1 fw-bold">
                          💎 {s.plan_name} ({s.plan_code})
                        </span>
                      </td>
                      <td>
                        <div>Expires: {new Date(s.ends_at).toLocaleDateString()}</div>
                        <small className="text-muted">Started: {new Date(s.starts_at).toLocaleDateString()}</small>
                      </td>
                      <td>
                        <span className="badge bg-info-subtle text-dark fw-bold px-3 py-1">
                          {s.remaining_contacts} Contacts left
                        </span>
                      </td>
                      <td className="text-end">
                        <span className={`badge ${s.is_active ? 'bg-success' : 'bg-danger'} px-3 py-1 rounded-pill`}>
                          {s.is_active ? 'Active' : 'Expired'}
                        </span>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Grant Subscription Modal */}
      {showGrantModal && (
        <div className="modal show d-block" tabIndex="-1" style={{ backgroundColor: 'rgba(0,0,0,0.5)' }}>
          <div className="modal-dialog modal-dialog-centered">
            <div className="modal-content rounded-4 border-0 shadow-lg">
              <form onSubmit={handleGrantSubmit}>
                <div className="modal-header bg-gradient text-white" style={{ background: 'linear-gradient(135deg, #B45309, #F59E0B)' }}>
                  <h5 className="modal-title font-heading fw-bold">
                    <i className="bi bi-gift-fill me-2"></i> Grant / Upgrade Membership Plan
                  </h5>
                  <button
                    type="button"
                    className="btn-close btn-close-white"
                    onClick={() => setShowGrantModal(false)}
                  ></button>
                </div>
                <div className="modal-body p-4">
                  <div className="mb-3">
                    <label className="form-label small fw-semibold">Select Member</label>
                    <select
                      required
                      className="form-select"
                      value={form.userId}
                      onChange={(e) => setForm({ ...form, userId: e.target.value })}
                    >
                      <option value="">-- Choose Member --</option>
                      {usersList.map((u) => {
                        const name = [u.first_name, u.last_name].filter(Boolean).join(' ') || u.email;
                        return (
                          <option key={u.id} value={u.id}>
                            {name} ({u.matri_id || u.email})
                          </option>
                        );
                      })}
                    </select>
                  </div>

                  <div className="mb-3">
                    <label className="form-label small fw-semibold">Choose Plan</label>
                    <select
                      required
                      className="form-select"
                      value={form.planId}
                      onChange={(e) => {
                        const selected = plans.find((p) => String(p.id) === e.target.value);
                        setForm({
                          ...form,
                          planId: e.target.value,
                          durationDays: selected ? String(selected.duration_days) : '30',
                          contactLimit: selected ? String(selected.contact_limit) : '50',
                        });
                      }}
                    >
                      <option value="">-- Choose Plan --</option>
                      {plans.map((p) => (
                        <option key={p.id} value={p.id}>
                          {p.name} (₹{p.price_inr} - {p.duration_days} days - {p.contact_limit} contacts)
                        </option>
                      ))}
                    </select>
                  </div>

                  <div className="row g-3">
                    <div className="col-6">
                      <label className="form-label small fw-semibold">Duration (Days)</label>
                      <input
                        type="number"
                        min="1"
                        required
                        className="form-control"
                        value={form.durationDays}
                        onChange={(e) => setForm({ ...form, durationDays: e.target.value })}
                      />
                    </div>
                    <div className="col-6">
                      <label className="form-label small fw-semibold">Contact Unlock Limit</label>
                      <input
                        type="number"
                        min="1"
                        required
                        className="form-control"
                        value={form.contactLimit}
                        onChange={(e) => setForm({ ...form, contactLimit: e.target.value })}
                      />
                    </div>
                  </div>
                </div>
                <div className="modal-footer bg-light">
                  <button
                    type="button"
                    className="btn btn-secondary"
                    onClick={() => setShowGrantModal(false)}
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={actionLoading}
                    className="btn btn-warning px-4 fw-bold"
                  >
                    {actionLoading ? 'Assigning...' : 'Grant Plan'}
                  </button>
                </div>
              </form>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
