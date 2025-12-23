"use client";
import { useState } from "react";
import { Modal, Button } from "react-bootstrap";

export default function ShortlistButton({ matriId }) {
    const [isShortlisted, setIsShortlisted] = useState(false);
    const [loading, setLoading] = useState(false);
    // Modal state
    const [showModal, setShowModal] = useState(false);
    const [modalMessage, setModalMessage] = useState("");

    const handleToggle = async () => {
        setLoading(true);
        try {
            // Simulator for now
            await new Promise(r => setTimeout(r, 600));
            const distinctState = !isShortlisted;
            setIsShortlisted(distinctState);

            // Show feedback
            setModalMessage(distinctState ? "Profile added to shortlist." : "Profile removed from shortlist.");
            setShowModal(true);

        } catch (e) {
            console.error(e);
        } finally {
            setLoading(false);
        }
    };

    // Modal Render Logic
    const renderModal = () => (
        <Modal show={showModal} onHide={() => setShowModal(false)} centered>
            <Modal.Header closeButton className="border-0">
                <Modal.Title className="fw-bold" style={{ color: '#800020' }}>
                    Success
                </Modal.Title>
            </Modal.Header>
            <Modal.Body className="text-center pb-4">
                <div className="mb-3">
                    <span className="d-inline-flex align-items-center justify-content-center bg-success-subtle text-success rounded-circle" style={{ width: 60, height: 60 }}>
                        <i className="bi bi-star-fill fs-3"></i>
                    </span>
                </div>
                <h5 className="fw-bold text-dark mb-2">Shortlist Updated</h5>
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

    if (isShortlisted) {
        return (
            <>
                <button
                    className="btn btn-outline-success fw-bold d-inline-flex align-items-center justify-content-center gap-2"
                    onClick={handleToggle}
                    disabled={loading}
                >
                    {loading ? <span className="spinner-border spinner-border-sm" /> : <i className="bi bi-star-fill"></i>}
                    Shortlisted
                </button>
                {renderModal()}
            </>
        )
    }

    return (
        <>
            <button
                className="btn btn-outline-secondary fw-bold d-inline-flex align-items-center justify-content-center gap-2"
                onClick={handleToggle}
                disabled={loading}
                style={{ borderColor: '#ccc', color: '#555' }}
            >
                {loading ? <span className="spinner-border spinner-border-sm" /> : <i className="bi bi-star"></i>}
                Shortlist
            </button>
            {renderModal()}
        </>
    );
}
