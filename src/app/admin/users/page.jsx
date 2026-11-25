'use client';

import React, { useState, useEffect } from 'react';
import PasswordHelp from './PasswordHelp';

export default function AdminUsersPage() {
  const [users, setUsers] = useState([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [genderFilter, setGenderFilter] = useState('');
  const [verifiedFilter, setVerifiedFilter] = useState('');
  const [activeFilter, setActiveFilter] = useState('');
  const [selectedUser, setSelectedUser] = useState(null);
  const [showDetailModal, setShowDetailModal] = useState(false);
  const [showAddModal, setShowAddModal] = useState(false);
  const [actionLoading, setActionLoading] = useState(false);
  const [pwMember, setPwMember] = useState(null); // member whose password is being reset

  // New user form state
  const [newUser, setNewUser] = useState({
    email: '',
    password: '',
    firstName: '',
    lastName: '',
    phone: '',
    gender: 'Male',
    role: 'user',
  });

  const fetchUsers = async () => {
    try {
      setLoading(true);
      const params = new URLSearchParams();
      if (search) params.set('search', search);
      if (genderFilter) params.set('gender', genderFilter);
      if (verifiedFilter) params.set('verified', verifiedFilter);
      if (activeFilter) params.set('active', activeFilter);

      const res = await fetch(`/api/admin/users?${params.toString()}`);
      const data = await res.json();
      if (res.ok) {
        setUsers(data.users || []);
        setTotal(data.total || 0);
      }
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchUsers();
  }, [genderFilter, verifiedFilter, activeFilter]);

  const handleSearchSubmit = (e) => {
    e.preventDefault();
    fetchUsers();
  };

  const handleToggleVerify = async (userId, currentVal) => {
    try {
      setActionLoading(true);
      const res = await fetch(`/api/admin/users/${userId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ is_verified: !currentVal }),
      });
      if (res.ok) {
        fetchUsers();
      }
    } catch (e) {
      console.error(e);
    } finally {
      setActionLoading(false);
    }
  };

  const handleToggleActive = async (userId, currentVal) => {
    try {
      setActionLoading(true);
      const res = await fetch(`/api/admin/users/${userId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ is_active: !currentVal }),
      });
      if (res.ok) {
        fetchUsers();
      }
    } catch (e) {
      console.error(e);
    } finally {
      setActionLoading(false);
    }
  };

  const handleToggleRole = async (userId, currentRole) => {
    const nextRole = currentRole === 'admin' ? 'user' : 'admin';
    if (!confirm(`Are you sure you want to change this member's role to ${nextRole.toUpperCase()}?`)) return;

    try {
      setActionLoading(true);
      const res = await fetch(`/api/admin/users/${userId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ role: nextRole }),
      });
      if (res.ok) {
        fetchUsers();
      }
    } catch (e) {
      console.error(e);
    } finally {
      setActionLoading(false);
    }
  };

  const handleDeleteUser = async (userId, name) => {
    if (!confirm(`Warning: Are you sure you want to permanently delete ${name || 'this user'}? All associated profile and subscription records will be removed.`)) return;

    try {
      setActionLoading(true);
      const res = await fetch(`/api/admin/users/${userId}`, {
        method: 'DELETE',
      });
      if (res.ok) {
        alert('User deleted successfully.');
        fetchUsers();
        setShowDetailModal(false);
      }
    } catch (e) {
      console.error(e);
    } finally {
      setActionLoading(false);
    }
  };

  const handleViewDetails = async (userId) => {
    try {
      const res = await fetch(`/api/admin/users/${userId}`);
      const data = await res.json();
      if (res.ok) {
        setSelectedUser(data.user);
        setShowDetailModal(true);
      }
    } catch (e) {
      console.error(e);
    }
  };

  const handleCreateUser = async (e) => {
    e.preventDefault();
    try {
      setActionLoading(true);
      const res = await fetch('/api/admin/users', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(newUser),
      });
      const data = await res.json();
      if (res.ok) {
        alert('Member created successfully!');
        setShowAddModal(false);
        setNewUser({
          email: '',
          password: '',
          firstName: '',
          lastName: '',
          phone: '',
          gender: 'Male',
          role: 'user',
        });
        fetchUsers();
      } else {
        alert(data.error || 'Failed to create user');
      }
    } catch (e) {
      console.error(e);
      alert('Error creating user');
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
            <h4 className="fw-bold mb-1 font-heading text-dark">Member Directory & Profiles</h4>
            <small className="text-muted">
              Search, verify, inspect, and manage matrimonial profiles ({total} members found)
            </small>
          </div>
          <div>
            <button
              onClick={() => setShowAddModal(true)}
              className="btn btn-danger rounded-pill px-4 fw-semibold shadow-sm"
              style={{ backgroundColor: '#a3123a', borderColor: '#a3123a' }}
            >
              <i className="bi bi-person-plus-fill me-2"></i> Add New Member
            </button>
          </div>
        </div>

        {/* Search & Filters */}
        <hr className="my-3 opacity-25" />
        <div className="row g-3">
          <div className="col-12 col-md-5">
            <form onSubmit={handleSearchSubmit}>
              <div className="input-group">
                <span className="input-group-text bg-light border-end-0">
                  <i className="bi bi-search text-muted"></i>
                </span>
                <input
                  type="text"
                  className="form-control bg-light border-start-0"
                  placeholder="Search by name, email, phone, matri ID..."
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                />
                <button type="submit" className="btn btn-danger px-4">
                  Search
                </button>
              </div>
            </form>
          </div>

          <div className="col-6 col-md-2">
            <select
              className="form-select bg-light"
              value={genderFilter}
              onChange={(e) => setGenderFilter(e.target.value)}
            >
              <option value="">All Genders</option>
              <option value="Male">Male</option>
              <option value="Female">Female</option>
            </select>
          </div>

          <div className="col-6 col-md-2">
            <select
              className="form-select bg-light"
              value={verifiedFilter}
              onChange={(e) => setVerifiedFilter(e.target.value)}
            >
              <option value="">All Verifications</option>
              <option value="true">Verified Only</option>
              <option value="false">Pending Verification</option>
            </select>
          </div>

          <div className="col-6 col-md-2">
            <select
              className="form-select bg-light"
              value={activeFilter}
              onChange={(e) => setActiveFilter(e.target.value)}
            >
              <option value="">All Statuses</option>
              <option value="true">Active Only</option>
              <option value="false">Deactivated Only</option>
            </select>
          </div>

          <div className="col-6 col-md-1">
            <button
              onClick={() => {
                setSearch('');
                setGenderFilter('');
                setVerifiedFilter('');
                setActiveFilter('');
              }}
              className="btn btn-outline-secondary w-100"
              title="Reset Filters"
            >
              <i className="bi bi-arrow-counterclockwise"></i>
            </button>
          </div>
        </div>
      </div>

      {/* Users Table */}
      <div className="card admin-card bg-white p-4">
        {loading ? (
          <div className="text-center py-5">
            <div className="spinner-border text-danger" role="status"></div>
            <p className="mt-2 text-muted">Retrieving members...</p>
          </div>
        ) : users.length === 0 ? (
          <div className="text-center py-5">
            <i className="bi bi-people text-muted display-4"></i>
            <h5 className="mt-3 text-secondary">No members found matching your criteria</h5>
            <p className="text-muted small">Try adjusting your search terms or filter settings.</p>
          </div>
        ) : (
          <div className="table-responsive">
            <table className="table table-hover align-middle mb-0">
              <thead className="table-light">
                <tr>
                  <th scope="col" className="text-uppercase small fw-bold">Member Info</th>
                  <th scope="col" className="text-uppercase small fw-bold">Matri ID</th>
                  <th scope="col" className="text-uppercase small fw-bold">Location & Community</th>
                  <th scope="col" className="text-uppercase small fw-bold">Role</th>
                  <th scope="col" className="text-uppercase small fw-bold">Verification</th>
                  <th scope="col" className="text-uppercase small fw-bold">Status</th>
                  <th scope="col" className="text-uppercase small fw-bold text-end">Actions</th>
                </tr>
              </thead>
              <tbody>
                {users.map((u) => {
                  const fullName = [u.first_name, u.last_name].filter(Boolean).join(' ') || u.email.split('@')[0];
                  return (
                    <tr key={u.id}>
                      <td>
                        <div className="d-flex align-items-center gap-3">
                          {u.photo_url ? (
                            <img
                              src={u.photo_url}
                              alt={fullName}
                              className="rounded-circle object-fit-cover shadow-sm"
                              style={{ width: 42, height: 42, border: '2px solid var(--gold-light)' }}
                              onError={(e) => { e.currentTarget.onerror = null; e.currentTarget.src = String(u?.gender).toLowerCase() === 'male' ? '/images/avatar-male.svg' : '/images/avatar-female.svg'; }}
                            />
                          ) : (
                            <div
                              className="rounded-circle bg-danger-subtle text-danger fw-bold d-flex align-items-center justify-content-center shadow-sm"
                              style={{ width: 42, height: 42 }}
                            >
                              {fullName.charAt(0).toUpperCase()}
                            </div>
                          )}
                          <div>
                            <div className="fw-bold text-dark cursor-pointer hover-danger" onClick={() => handleViewDetails(u.id)}>
                              {fullName}
                            </div>
                            <small className="text-muted d-block">{u.email}</small>
                            <small className="text-muted">{u.phone || 'No phone'}</small>
                          </div>
                        </div>
                      </td>

                      <td>
                        <span className="badge bg-light text-dark border font-monospace px-2 py-1">
                          {u.matri_id || 'PENDING'}
                        </span>
                        {u.plan_name && (
                          <div className="mt-1">
                            <span className="badge bg-warning-subtle text-warning border border-warning-subtle" style={{ fontSize: '0.65rem' }}>
                              💎 {u.plan_name}
                            </span>
                          </div>
                        )}
                      </td>

                      <td>
                        <div className="small fw-semibold text-secondary">
                          {u.religion_name || 'Religion N/A'} • {u.caste_name || 'Caste N/A'}
                        </div>
                        <small className="text-muted">
                          <i className="bi bi-geo-alt me-1"></i>
                          {u.city_name || 'City N/A'}
                        </small>
                      </td>

                      <td>
                        <span
                          className={`badge ${
                            u.role === 'admin'
                              ? 'bg-danger text-white'
                              : 'bg-light text-secondary border'
                          }`}
                        >
                          {u.role || 'user'}
                        </span>
                      </td>

                      <td>
                        <button
                          onClick={() => handleToggleVerify(u.id, u.is_verified)}
                          disabled={actionLoading}
                          className={`btn btn-sm rounded-pill px-3 py-1 ${
                            u.is_verified
                              ? 'btn-success text-white'
                              : 'btn-outline-warning text-dark'
                          }`}
                          style={{ fontSize: '0.75rem' }}
                        >
                          <i className={`bi ${u.is_verified ? 'bi-patch-check-fill' : 'bi-clock'} me-1`}></i>
                          {u.is_verified ? 'Verified' : 'Pending'}
                        </button>
                      </td>

                      <td>
                        <button
                          onClick={() => handleToggleActive(u.id, u.is_active !== false)}
                          disabled={actionLoading}
                          className={`btn btn-sm rounded-pill px-3 py-1 ${
                            u.is_active !== false
                              ? 'btn-outline-success'
                              : 'btn-outline-danger'
                          }`}
                          style={{ fontSize: '0.75rem' }}
                        >
                          {u.is_active !== false ? '● Active' : '○ Deactivated'}
                        </button>
                      </td>

                      <td className="text-end">
                        <div className="dropdown d-inline-block">
                          <button
                            className="btn btn-light btn-sm rounded-circle p-2"
                            type="button"
                            data-bs-toggle="dropdown"
                            aria-expanded="false"
                          >
                            <i className="bi bi-three-dots-vertical"></i>
                          </button>
                          <ul className="dropdown-menu dropdown-menu-end shadow border-0 p-2">
                            <li>
                              <button
                                className="dropdown-item py-2 rounded-2"
                                onClick={() => handleViewDetails(u.id)}
                              >
                                <i className="bi bi-eye text-primary me-2"></i> View Profile
                              </button>
                            </li>
                            <li>
                              <button
                                className="dropdown-item py-2 rounded-2"
                                onClick={() => handleToggleRole(u.id, u.role)}
                              >
                                <i className="bi bi-shield-check text-warning me-2"></i>
                                {u.role === 'admin' ? 'Revoke Admin' : 'Make Admin'}
                              </button>
                            </li>
                            {u.role !== 'admin' && (
                              <li>
                                <button
                                  className="dropdown-item py-2 rounded-2"
                                  onClick={() => setPwMember(u)}
                                >
                                  <i className="bi bi-key text-info me-2"></i> Password help
                                </button>
                              </li>
                            )}
                            <li><hr className="dropdown-divider" /></li>
                            <li>
                              <button
                                className="dropdown-item py-2 rounded-2 text-danger"
                                onClick={() => handleDeleteUser(u.id, fullName)}
                              >
                                <i className="bi bi-trash3 text-danger me-2"></i> Delete User
                              </button>
                            </li>
                          </ul>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Member Details Modal */}
      {showDetailModal && selectedUser && (
        <div className="modal show d-block" tabIndex="-1" style={{ backgroundColor: 'rgba(0,0,0,0.5)' }}>
          <div className="modal-dialog modal-lg modal-dialog-centered modal-dialog-scrollable">
            <div className="modal-content rounded-4 border-0 shadow-lg">
              <div className="modal-header bg-gradient text-white" style={{ background: 'linear-gradient(135deg, #3b0a16, #7a1530)' }}>
                <h5 className="modal-title font-heading fw-bold">
                  <i className="bi bi-person-badge me-2"></i> Member Profile: {selectedUser.first_name} {selectedUser.last_name} ({selectedUser.matri_id})
                </h5>
                <button
                  type="button"
                  className="btn-close btn-close-white"
                  onClick={() => setShowDetailModal(false)}
                ></button>
              </div>
              <div className="modal-body p-4">
                <div className="row g-4">
                  {/* Photo & Identity */}
                  <div className="col-12 col-md-4 text-center border-end">
                    {selectedUser.photo_url ? (
                      <img
                        src={selectedUser.photo_url}
                        alt="Profile"
                        className="rounded-circle shadow-lg mb-3 object-fit-cover"
                        style={{ width: 140, height: 140, border: '4px solid var(--gold)' }}
                        onError={(e) => { e.currentTarget.onerror = null; e.currentTarget.src = String(selectedUser?.gender).toLowerCase() === 'male' ? '/images/avatar-male.svg' : '/images/avatar-female.svg'; }}
                      />
                    ) : (
                      <div
                        className="rounded-circle bg-danger-subtle text-danger fw-bold display-4 d-inline-flex align-items-center justify-content-center shadow mb-3"
                        style={{ width: 140, height: 140 }}
                      >
                        {(selectedUser.first_name || 'U').charAt(0)}
                      </div>
                    )}
                    <h5 className="fw-bold mb-1">{selectedUser.first_name} {selectedUser.last_name}</h5>
                    <div className="badge bg-light text-dark border mb-2">{selectedUser.matri_id}</div>
                    <div>
                      <span className={`badge ${selectedUser.is_verified ? 'bg-success' : 'bg-warning text-dark'} me-1`}>
                        {selectedUser.is_verified ? 'Verified Member' : 'Pending Verification'}
                      </span>
                      <span className={`badge ${selectedUser.is_active !== false ? 'bg-primary' : 'bg-secondary'}`}>
                        {selectedUser.is_active !== false ? 'Active' : 'Inactive'}
                      </span>
                    </div>
                  </div>

                  {/* Profile Key Info */}
                  <div className="col-12 col-md-8">
                    <h6 className="fw-bold text-uppercase small text-muted border-bottom pb-2">Personal & Family Details</h6>
                    <div className="row g-2 mb-3 small">
                      <div className="col-6"><strong>Email:</strong> {selectedUser.email}</div>
                      <div className="col-6"><strong>Phone:</strong> {selectedUser.phone || 'N/A'}</div>
                      <div className="col-6"><strong>Gender:</strong> {selectedUser.gender || 'N/A'}</div>
                      <div className="col-6"><strong>Age:</strong> {selectedUser.age_years || 'N/A'} yrs</div>
                      <div className="col-6"><strong>Religion:</strong> {selectedUser.religion_name || 'N/A'}</div>
                      <div className="col-6"><strong>Caste:</strong> {selectedUser.caste_name || 'N/A'}</div>
                      <div className="col-6"><strong>City:</strong> {selectedUser.city_name || 'N/A'}</div>
                      <div className="col-6"><strong>State:</strong> {selectedUser.state_name || 'N/A'}</div>
                      <div className="col-6"><strong>Education:</strong> {selectedUser.education_name || 'N/A'}</div>
                      <div className="col-6"><strong>Profession:</strong> {selectedUser.profession_name || selectedUser.job || 'N/A'}</div>
                      <div className="col-6"><strong>Marital Status:</strong> {selectedUser.marital_status || 'Never Married'}</div>
                      <div className="col-6"><strong>Annual Income:</strong> {selectedUser.annual_income_inr ? `₹${selectedUser.annual_income_inr}` : 'Not disclosed'}</div>
                    </div>

                    <h6 className="fw-bold text-uppercase small text-muted border-bottom pb-2">About Member</h6>
                    <p className="text-secondary small fst-italic">
                      "{selectedUser.about_me || 'No personal bio added yet.'}"
                    </p>
                  </div>
                </div>
              </div>
              <div className="modal-footer bg-light">
                {selectedUser.role !== 'admin' && (
                  <button
                    type="button"
                    className="btn btn-outline-primary me-auto"
                    onClick={() => setPwMember(selectedUser)}
                  >
                    <i className="bi bi-key me-1"></i> Password help
                  </button>
                )}
                <button
                  type="button"
                  className="btn btn-outline-danger"
                  onClick={() => handleDeleteUser(selectedUser.id, selectedUser.first_name)}
                >
                  <i className="bi bi-trash3 me-1"></i> Delete Member
                </button>
                <button
                  type="button"
                  className="btn btn-secondary"
                  onClick={() => setShowDetailModal(false)}
                >
                  Close
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {pwMember && <PasswordHelp member={pwMember} onClose={() => setPwMember(null)} />}

      {/* Add New Member Modal */}
      {showAddModal && (
        <div className="modal show d-block" tabIndex="-1" style={{ backgroundColor: 'rgba(0,0,0,0.5)' }}>
          <div className="modal-dialog modal-dialog-centered">
            <div className="modal-content rounded-4 border-0 shadow-lg">
              <form onSubmit={handleCreateUser}>
                <div className="modal-header bg-gradient text-white" style={{ background: 'linear-gradient(135deg, #3b0a16, #7a1530)' }}>
                  <h5 className="modal-title font-heading fw-bold">
                    <i className="bi bi-person-plus-fill me-2"></i> Register New Member
                  </h5>
                  <button
                    type="button"
                    className="btn-close btn-close-white"
                    onClick={() => setShowAddModal(false)}
                  ></button>
                </div>
                <div className="modal-body p-4">
                  <div className="row g-3">
                    <div className="col-6">
                      <label className="form-label small fw-semibold">First Name</label>
                      <input
                        type="text"
                        required
                        className="form-control"
                        value={newUser.firstName}
                        onChange={(e) => setNewUser({ ...newUser, firstName: e.target.value })}
                      />
                    </div>
                    <div className="col-6">
                      <label className="form-label small fw-semibold">Last Name</label>
                      <input
                        type="text"
                        required
                        className="form-control"
                        value={newUser.lastName}
                        onChange={(e) => setNewUser({ ...newUser, lastName: e.target.value })}
                      />
                    </div>
                    <div className="col-12">
                      <label className="form-label small fw-semibold">Email Address</label>
                      <input
                        type="email"
                        required
                        className="form-control"
                        value={newUser.email}
                        onChange={(e) => setNewUser({ ...newUser, email: e.target.value })}
                      />
                    </div>
                    <div className="col-12">
                      <label className="form-label small fw-semibold">Password</label>
                      <input
                        type="password"
                        required
                        minLength={6}
                        className="form-control"
                        value={newUser.password}
                        onChange={(e) => setNewUser({ ...newUser, password: e.target.value })}
                      />
                    </div>
                    <div className="col-6">
                      <label className="form-label small fw-semibold">Phone Number</label>
                      <input
                        type="tel"
                        className="form-control"
                        value={newUser.phone}
                        onChange={(e) => setNewUser({ ...newUser, phone: e.target.value })}
                      />
                    </div>
                    <div className="col-6">
                      <label className="form-label small fw-semibold">Gender</label>
                      <select
                        className="form-select"
                        value={newUser.gender}
                        onChange={(e) => setNewUser({ ...newUser, gender: e.target.value })}
                      >
                        <option value="Male">Male</option>
                        <option value="Female">Female</option>
                      </select>
                    </div>
                    <div className="col-12">
                      <label className="form-label small fw-semibold">Role</label>
                      <select
                        className="form-select"
                        value={newUser.role}
                        onChange={(e) => setNewUser({ ...newUser, role: e.target.value })}
                      >
                        <option value="user">User (Standard)</option>
                        <option value="admin">Administrator</option>
                      </select>
                    </div>
                  </div>
                </div>
                <div className="modal-footer bg-light">
                  <button
                    type="button"
                    className="btn btn-secondary"
                    onClick={() => setShowAddModal(false)}
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={actionLoading}
                    className="btn btn-danger px-4"
                    style={{ backgroundColor: '#a3123a', borderColor: '#a3123a' }}
                  >
                    {actionLoading ? 'Creating...' : 'Create Member'}
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
