"use client";
import { useEffect, useState } from "react";
import { Modal, Button } from "react-bootstrap";

export default function SendInterestButton({ matriId, receiverId }) {
  const [label, setLabel] = useState("Send Interest");
  const [loading, setLoading] = useState(false);
  const [status, setStatus] = useState("none"); // none, sent, accepted, rejected

  // Check initial status
  useEffect(() => {
    let alive = true;
    (async () => {
      try {
        const r = await fetch(
          `/api/matrimoney/profile-details/${encodeURIComponent(matriId)}?withInterest=1`,
          { credentials: "include", cache: "no-store" }
        );
        if (!r.ok) return;
        const d = await r.json();
        if (!alive) return;
        const s = d?.interest?.me_to_them?.status;
        if (s === "sent") {
          setLabel("Interest Sent");
          setStatus("sent");
        } else if (s === "accepted") {
          setLabel("Interest Accepted");
          setStatus("accepted");
        } else if (s === "rejected") {
          setLabel("Interest Declined");
          setStatus("rejected");
        }
      } catch { }
    })();
    return () => {
      alive = false;
    };
  }, [matriId]);

  // Modal state
  const [showModal, setShowModal] = useState(false);
  const [modalMessage, setModalMessage] = useState("");
  const [modalType, setModalType] = useState("error"); // error or info

  async function handleClick() {
    if (status !== "none" || loading) return;
    setLoading(true);
    try {
      const body = receiverId
        ? { receiver_id: receiverId }
        : { matri_id: matriId };
      const res = await fetch("/api/interest", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify(body),
      });
      const j = await res.json().catch(() => ({}));

      if (!res.ok) {
        setModalMessage(j?.error || "Failed to send interest");
        setModalType("error");
        setShowModal(true);
        return;
      }

      setLabel("Interest Sent");
      setStatus("sent");
      setModalMessage("Interest sent successfully!");
      setModalType("success");
      // Optional: show success modal vs just updating button state
      // setShowModal(true); 
    } finally {
      setLoading(false);
    }
  }

  // Styles
  const baseClass = "btn fw-bold d-inline-flex align-items-center justify-content-center gap-2";

  // Modal Render Logic
  const renderModal = () => (
    <Modal show={showModal} onHide={() => setShowModal(false)} centered>
      <Modal.Header closeButton className="border-0">
        <Modal.Title className="fw-bold" style={{ color: '#800020' }}>
          {modalType === 'error' ? 'Notice' : 'Success'}
        </Modal.Title>
      </Modal.Header>
      <Modal.Body className="text-center pb-4">
        <div className="mb-3">
          {modalType === 'error' ? (
            <span className="d-inline-flex align-items-center justify-content-center bg-danger-subtle text-danger rounded-circle" style={{ width: 60, height: 60 }}>
              <i className="bi bi-exclamation-triangle-fill fs-3"></i>
            </span>
          ) : (
            <span className="d-inline-flex align-items-center justify-content-center bg-success-subtle text-success rounded-circle" style={{ width: 60, height: 60 }}>
              <i className="bi bi-check-circle-fill fs-3"></i>
            </span>
          )}
        </div>
        <h5 className="fw-bold text-dark mb-2">
          {modalType === 'error' ? 'Action Required' : 'Done!'}
        </h5>
        <p className="text-muted mb-4 px-4">{modalMessage}</p>
        <Button
          variant="secondary"
          onClick={() => setShowModal(false)}
          className="px-4 fw-bold rounded-pill"
        >
          Close
        </Button>
      </Modal.Body>
    </Modal>
  );

  if (status === "accepted") {
    return (
      <>
        <button className={`${baseClass} btn-success`} style={{ backgroundColor: '#4CAF50', borderColor: '#4CAF50' }} disabled>
          <i className="bi bi-people-fill"></i> Friend
        </button>
        {renderModal()}
      </>
    );
  }

  if (status === "sent") {
    return (
      <>
        <button className={`${baseClass} btn-light text-muted border`} disabled>
          <i className="bi bi-send-check-fill"></i> Interest Sent
        </button>
        {renderModal()}
      </>
    );
  }

  return (
    <>
      <button
        className={`${baseClass} btn-primary text-white`}
        onClick={handleClick}
        disabled={loading}
        style={{
          background: 'var(--brand-primary, #E33183)',
          borderColor: 'var(--brand-primary, #E33183)'
        }}
      >
        {loading ? (
          <>
            <span className="spinner-border spinner-border-sm" role="status" aria-hidden="true"></span>
            Sending...
          </>
        ) : (
          <>
            <i className="bi bi-heart-fill"></i> Send Interest
          </>
        )}
      </button>
      {renderModal()}
    </>
  );
}
