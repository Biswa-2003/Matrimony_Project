"use client";

import React, { useState } from "react";
import {
  Container,
  Row,
  Col,
  Nav,
  Form,
  Button,
  Alert,
} from "react-bootstrap";
import "bootstrap/dist/css/bootstrap.min.css";
import DashNav from "@/app/components/dashnav";

export default function ProfileSettingsPage() {
  const [activeTab, setActiveTab] = useState("email");

  const [email, setEmail] = useState("");
  const [primaryNumber, setPrimaryNumber] = useState("");
  const [parentNumber, setParentNumber] = useState("");
  const [lockPhoto, setLockPhoto] = useState("no");
  const [visibility, setVisibility] = useState("all");
  const [deactivateDuration, setDeactivateDuration] = useState("none");
  const [deleteReason, setDeleteReason] = useState("marriage");



  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");

  const [statusMessage, setStatusMessage] = useState(null);

  const showStatus = (type, text) => setStatusMessage({ type, text });

  /* ---------- handlers ---------- */

  /* ---------- handlers ---------- */

  React.useEffect(() => {
    if (activeTab === "privacy") {
      fetchPrivacySettings();
    }
  }, [activeTab]);

  const fetchPrivacySettings = async () => {
    try {
      const res = await fetch("/api/profile/privacy");
      if (res.ok) {
        const data = await res.json();
        setPrimaryNumber(data.primaryNumber || "");
        setParentNumber(data.parentNumber || "");
        setLockPhoto(data.photoLocked ? "yes" : "no");
      }
    } catch (err) {
      console.error("Failed to fetch privacy settings", err);
    }
  };

  const handleUpdateEmail = async () => {
    try {
      const res = await fetch("/api/profile/email", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email }),
      });
      const data = await res.json();
      if (res.ok) showStatus("success", data.message);
      else showStatus("danger", data.error || "Failed to update email.");
    } catch {
      showStatus("danger", "Server error while updating email.");
    }
  };

  const handleChangePassword = async () => {
    try {
      const res = await fetch("/api/change-password", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ currentPassword, newPassword, confirmPassword }),
      });
      const data = await res.json();
      if (res.ok) {
        showStatus("success", data.message);
        setCurrentPassword("");
        setNewPassword("");
        setConfirmPassword("");
      } else {
        showStatus("danger", data.error || "Failed to change password.");
      }
    } catch {
      showStatus("danger", "Server error while changing password.");
    }
  };



  const handleSavePrivacy = async () => {
    try {
      const res = await fetch("/api/profile/privacy", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          primaryNumber,
          parentNumber,
          photoLocked: lockPhoto === "yes",
        }),
      });
      const data = await res.json();
      if (res.ok) showStatus("success", data.message);
      else showStatus("danger", data.error || "Failed to save privacy.");
    } catch {
      showStatus("danger", "Server error while saving privacy.");
    }
  };

  const handleSaveVisibility = async () => {
    try {
      const res = await fetch("/api/profile/visibility", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ visibility }),
      });
      const data = await res.json();
      if (res.ok) showStatus("success", data.message);
      else showStatus("danger", data.error || "Failed to save profile setting.");
    } catch {
      showStatus("danger", "Server error while saving profile setting.");
    }
  };

  /* ---------- handlers ---------- */

  // ... (keep earlier imports and state)
  // Ensure useRouter is available
  // const router = useRouter(); (Assuming this needs to be added to the component body)

  const handleDeactivate = async () => {
    try {
      const res = await fetch("/api/profile/deactivate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ duration: deactivateDuration }),
      });
      const data = await res.json();
      if (res.ok) {
        showStatus("success", data.message + " Redirecting...");

        // Wait 3 seconds then logout & redirect
        setTimeout(async () => {
          await fetch('/api/logout', { method: 'GET' }); // Clear session/cookie
          window.location.href = "/matrimoney/login";
        }, 3000);

      } else {
        showStatus("danger", data.error || "Failed to deactivate profile.");
      }
    } catch {
      showStatus("danger", "Server error while deactivating profile.");
    }
  };

  const handleDeleteProfile = async () => {
    if (!window.confirm("Are you sure? This cannot be undone.")) return;

    try {
      const res = await fetch("/api/profile/delete", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ reason: deleteReason }),
      });
      const data = await res.json();
      if (res.ok) {
        showStatus("success", data.message);
      } else {
        showStatus("danger", data.error || "Failed to delete profile.");
      }
    } catch {
      showStatus("danger", "Server error while deleting profile.");
    }
  };

  const SettingsTab = ({ eventKey, label, icon }) => (
    <Nav.Item className="mb-1">
      <Nav.Link
        eventKey={eventKey}
        className={`d-flex align-items-center gap-3 px-3 py-3 rounded-3 fw-semibold ${activeTab === eventKey ? 'active-tab shadow-sm' : 'text-secondary'}`}
        style={{ transition: 'all 0.2s' }}
      >
        <span className="d-flex align-items-center justify-content-center" style={{ width: 24 }}>{icon}</span>
        {label}
      </Nav.Link>
    </Nav.Item>
  );

  return (
    <>
      {/* Spacer */}
      <div style={{ height: 0 }}></div>

      <div className="profile-surface pb-5 pt-4">
        <Container>
          <div className="d-flex align-items-center justify-content-between mb-4">
            <h4 className="fw-bold text-maroon mb-0">Settings</h4>
            <span className="text-muted small">Manage your account preferences</span>
          </div>

          <Row className="g-4">
            {/* Sidebar */}
            <Col lg={3} md={4}>
              <div className="pe-card p-3">
                <Nav
                  variant="pills"
                  className="flex-column"
                  activeKey={activeTab}
                  onSelect={(key) => {
                    setActiveTab(key);
                    setStatusMessage(null);
                  }}
                >
                  <div className="small text-muted fw-bold mb-2 ps-3 text-uppercase" style={{ fontSize: '0.75rem' }}>Account</div>
                  <SettingsTab eventKey="email" label="Email Address" icon={<i className="bi bi-envelope"></i>} />
                  <SettingsTab eventKey="password" label="Change Password" icon={<i className="bi bi-key"></i>} />

                  <div className="small text-muted fw-bold mb-2 ps-3 mt-3 text-uppercase" style={{ fontSize: '0.75rem' }}>Preferences</div>
                  <SettingsTab eventKey="privacy" label="Privacy Options" icon={<i className="bi bi-shield-lock"></i>} />
                  <SettingsTab eventKey="setting" label="Profile Visibility" icon={<i className="bi bi-eye"></i>} />

                  <div className="small text-muted fw-bold mb-2 ps-3 mt-3 text-uppercase" style={{ fontSize: '0.75rem' }}>Danger Zone</div>
                  <SettingsTab eventKey="deactivate" label="Deactivate Profile" icon={<i className="bi bi-pause-circle"></i>} />
                  <SettingsTab eventKey="delete" label="Delete Profile" icon={<i className="bi bi-trash"></i>} />
                </Nav>
              </div>
            </Col>

            {/* Main Content */}
            <Col lg={9} md={8}>
              <div className="pe-card h-100 p-4 p-md-5">
                {statusMessage && (
                  <Alert variant={statusMessage.type} onClose={() => setStatusMessage(null)} dismissible className="mb-4 shadow-sm border-0">
                    {statusMessage.text}
                  </Alert>
                )}

                {/* Email */}
                {activeTab === "email" && (
                  <div className="fade-in-up">
                    <h5 className="fw-bold text-maroon mb-3">Email Address</h5>
                    <p className="text-muted mb-4">
                      A valid e-mail id will be used to send you mailers, match alerts, and special offers.
                    </p>
                    <Form.Group className="mb-3" style={{ maxWidth: 400 }}>
                      <Form.Label className="fw-semibold">Current Email</Form.Label>
                      <Form.Control
                        type="email"
                        value={email}
                        onChange={(e) => setEmail(e.target.value)}
                        className="form-control-lg fs-6"
                        placeholder="Enter new email"
                      />
                    </Form.Group>
                    <Button variant="primary" onClick={handleUpdateEmail} className="px-4 fw-bold">Update Email</Button>
                  </div>
                )}

                {/* Change Password */}
                {activeTab === "password" && (
                  <div className="fade-in-up">
                    <h5 className="fw-bold text-maroon mb-3">Change Password</h5>
                    <p className="text-muted mb-4">
                      Secure your account with a strong password. We recommend using at least 6 characters.
                    </p>
                    <div style={{ maxWidth: 400 }}>
                      <Form.Group className="mb-3">
                        <Form.Label className="fw-semibold">Current Password</Form.Label>
                        <Form.Control
                          type="password"
                          placeholder="Enter Current Password"
                          value={currentPassword}
                          onChange={(e) => setCurrentPassword(e.target.value)}
                        />
                      </Form.Group>
                      <Form.Group className="mb-3">
                        <Form.Label className="fw-semibold">New Password</Form.Label>
                        <Form.Control
                          type="password"
                          placeholder="Enter New Password"
                          value={newPassword}
                          onChange={(e) => setNewPassword(e.target.value)}
                        />
                      </Form.Group>
                      <Form.Group className="mb-4">
                        <Form.Label className="fw-semibold">Confirm Password</Form.Label>
                        <Form.Control
                          type="password"
                          placeholder="Re-enter New Password"
                          value={confirmPassword}
                          onChange={(e) => setConfirmPassword(e.target.value)}
                        />
                      </Form.Group>
                      <Button variant="primary" onClick={handleChangePassword} className="px-4 fw-bold">
                        Change Password
                      </Button>
                    </div>
                  </div>
                )}



                {/* Privacy */}
                {activeTab === "privacy" && (
                  <div className="fade-in-up">
                    <h5 className="fw-bold text-maroon mb-3">Privacy Options</h5>
                    <p className="text-muted mb-4">Manage your contact details and photo privacy.</p>

                    <div style={{ maxWidth: 500 }}>
                      <h6 className="fw-bold text-dark mb-3">Contact Information</h6>
                      <Form.Group className="mb-3">
                        <Form.Label className="small text-muted fw-bold">Primary Mobile Number</Form.Label>
                        <div className="input-group">
                          <span className="input-group-text bg-light border-end-0 text-muted">+91</span>
                          <Form.Control
                            type="text"
                            value={primaryNumber}
                            onChange={(e) => setPrimaryNumber(e.target.value)}
                            className="border-start-0"
                          />
                        </div>
                      </Form.Group>
                      <Form.Group className="mb-4">
                        <Form.Label className="small text-muted fw-bold">Parents' Contact Number</Form.Label>
                        <div className="input-group">
                          <span className="input-group-text bg-light border-end-0 text-muted">+91</span>
                          <Form.Control
                            type="text"
                            value={parentNumber}
                            onChange={(e) => setParentNumber(e.target.value)}
                            className="border-start-0"
                          />
                        </div>
                      </Form.Group>

                      <hr className="my-4" />

                      <h6 className="fw-bold text-dark mb-3">Photo Privacy</h6>
                      <div className="p-3 bg-light rounded-3 border mb-4">
                        <Form.Label className="fw-semibold d-block mb-2">Lock Profile Photo?</Form.Label>
                        <div className="d-flex gap-4">
                          <Form.Check
                            type="radio"
                            label="Yes (Locked)"
                            name="lockPhoto"
                            id="lock-yes"
                            checked={lockPhoto === "yes"}
                            onChange={() => setLockPhoto("yes")}
                          />
                          <Form.Check
                            type="radio"
                            label="No (Visible)"
                            name="lockPhoto"
                            id="lock-no"
                            checked={lockPhoto === "no"}
                            onChange={() => setLockPhoto("no")}
                          />
                        </div>
                      </div>

                      <div className="d-flex gap-2">
                        <Button variant="primary" onClick={handleSavePrivacy} className="px-4 fw-bold">Save Changes</Button>
                        <Button variant="outline-danger" onClick={() => {
                          setPrimaryNumber("");
                          setParentNumber("");
                          setLockPhoto("no");
                        }}>Reset</Button>
                      </div>
                    </div>
                  </div>
                )}

                {/* Profile Setting (visibility) */}
                {activeTab === "setting" && (
                  <div className="fade-in-up">
                    <h5 className="fw-bold text-maroon mb-3">Profile Visibility</h5>
                    <p className="text-muted mb-4">Control who can see your profile details.</p>

                    <div className="p-4 bg-light rounded-3 border mb-4">
                      <label className="d-flex align-items-start gap-3 mb-3 cursor-pointer">
                        <input
                          type="radio"
                          name="privacyOpt"
                          className="form-check-input mt-1"
                          checked={visibility === "all"}
                          onChange={() => setVisibility("all")}
                        />
                        <div>
                          <span className="d-block fw-bold text-dark">Show my Profile to everyone</span>
                          <small className="text-muted">Includes visitors who haven't registered. Recommended for maximum visibility.</small>
                        </div>
                      </label>
                      <label className="d-flex align-items-start gap-3 cursor-pointer">
                        <input
                          type="radio"
                          name="privacyOpt"
                          className="form-check-input mt-1"
                          checked={visibility === "members"}
                          onChange={() => setVisibility("members")}
                        />
                        <div>
                          <span className="d-block fw-bold text-dark">Show to registered members only</span>
                          <small className="text-muted">Only logged-in users can view your profile.</small>
                        </div>
                      </label>
                    </div>

                    <Button variant="primary" onClick={handleSaveVisibility} className="px-4 fw-bold">
                      Update Visibility
                    </Button>
                  </div>
                )}

                {/* Deactivate Profile */}
                {activeTab === "deactivate" && (
                  <div className="fade-in-up">
                    <h5 className="fw-bold text-danger mb-3">Deactivate Profile</h5>
                    <p className="text-muted mb-4">
                      Temporarily hide your profile. You won't appear in searches, but your data will be saved.
                    </p>

                    <div style={{ maxWidth: 400 }}>
                      <Form.Label className="fw-semibold">Deactivate for:</Form.Label>
                      <Form.Select
                        className="mb-3 form-control-lg fs-6"
                        value={deactivateDuration}
                        onChange={(e) => setDeactivateDuration(e.target.value)}
                      >
                        <option value="none">Select Duration</option>
                        <option value="15d">15 days</option>
                        <option value="1m">1 month</option>
                        <option value="until">Until I log in again</option>
                      </Form.Select>
                      <Button variant="outline-danger" onClick={handleDeactivate} className="px-4 fw-bold w-100">
                        Deactivate Profile
                      </Button>
                    </div>
                  </div>
                )}

                {/* Delete Profile */}
                {activeTab === "delete" && (
                  <div className="fade-in-up">
                    <h5 className="fw-bold text-danger mb-3">Delete Profile</h5>
                    <div className="alert alert-danger border-danger bg-danger-subtle p-3 rounded-3 mb-4">
                      <i className="bi bi-exclamation-triangle-fill me-2"></i>
                      <strong>Warning:</strong> Deleting your profile is permanent and cannot be undone. All your data, messages, and matches will be lost.
                    </div>

                    <div className="mb-4">
                      <p className="fw-bold mb-2">Please tell us why you are leaving:</p>
                      <Form.Check
                        type="radio"
                        label="Marriage Fixed"
                        name="deleteReason"
                        id="dr-1"
                        checked={deleteReason === "marriage"}
                        onChange={() => setDeleteReason("marriage")}
                        className="mb-2"
                      />
                      <Form.Check
                        type="radio"
                        label="Found match elsewhere"
                        name="deleteReason"
                        id="dr-2"
                        checked={deleteReason === "found"}
                        onChange={() => setDeleteReason("found")}
                        className="mb-2"
                      />
                      <Form.Check
                        type="radio"
                        label="Other reasons"
                        name="deleteReason"
                        id="dr-3"
                        checked={deleteReason === "other"}
                        onChange={() => setDeleteReason("other")}
                      />
                    </div>

                    <Button
                      variant="danger"
                      onClick={handleDeleteProfile}
                      className="px-4 fw-bold"
                    >
                      Delete My Account Permanently
                    </Button>
                  </div>
                )}
              </div>
            </Col>
          </Row>
        </Container>
      </div>

      <style jsx global>{`
        .profile-surface {
            background-color: #f4f7fa;
            min-height: 100vh;
        }
        .pe-card {
            border: 1px solid rgba(0,0,0,0.06);
            border-radius: 12px;
            box-shadow: 0 4px 12px rgba(0,0,0,0.03);
            background: #fff;
            overflow: hidden;
        }
        .text-maroon { color: var(--brand-maroon, #800020) !important; }
        .text-primary { color: var(--brand-primary, #E33183) !important; }
        
        .active-tab {
            background-color: #fff1f7 !important;
            color: var(--brand-primary, #E33183) !important;
        }
        .active-tab span {
            color: var(--brand-primary, #E33183);
        }
        
        .btn-primary { 
           background-color: var(--brand-primary, #E33183); 
           border-color: var(--brand-primary, #E33183);
        }
        .btn-primary:hover {
           background-color: #c21e6b;
           border-color: #c21e6b;
        }
        
        .form-control:focus, .form-select:focus {
            border-color: var(--brand-primary, #E33183);
            box-shadow: 0 0 0 0.2rem rgba(227, 49, 131, 0.2);
        }
        
        @keyframes fadeInUp {
            from { opacity: 0; transform: translateY(10px); }
            to { opacity: 1; transform: translateY(0); }
        }
        .fade-in-up {
            animation: fadeInUp 0.4s ease-out forwards;
        }
      `}</style>
    </>
  );
}
