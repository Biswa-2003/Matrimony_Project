"use client";
import { useState } from "react";
import { Modal, Button } from "react-bootstrap";

export default function ViewContactButton({ mobile, email, isPremiumViewer }) {
    const [show, setShow] = useState(false);

    // Logic: accurate contact visibility depends on backend rules (privacy settings), 
    // but here we handle the presentation. 
    // If no mobile is passed, we show "Locked" content.

    return (
        <>
            <button
                className="btn btn-outline-dark fw-bold d-inline-flex align-items-center justify-content-center gap-2"
                onClick={() => setShow(true)}
                style={{ borderColor: '#333' }}
            >
                <i className="bi bi-telephone-fill"></i> Contact
            </button>

            <Modal show={show} onHide={() => setShow(false)} centered>
                <Modal.Header closeButton className="border-0">
                    <Modal.Title className="fw-bold" style={{ color: '#800020' }}>Contact Details</Modal.Title>
                </Modal.Header>
                <Modal.Body className="text-center pb-4">
                    {mobile || email ? (
                        <div className="d-flex flex-column gap-3">
                            <div className="alert alert-success border-0 bg-success-subtle mb-3">
                                <i className="bi bi-check-circle-fill me-2"></i> Contact Verified
                            </div>

                            {mobile && (
                                <div className="p-3 bg-white shadow-sm rounded border">
                                    <small className="text-muted d-block text-uppercase fw-bold mb-1" style={{ fontSize: '0.75rem' }}>Mobile Number</small>
                                    <span className="fs-4 fw-bold text-dark">{mobile}</span>
                                    <a href={`tel:${mobile}`} className="btn btn-sm btn-success rounded-pill px-3 ms-2">
                                        <i className="bi bi-telephone"></i> Call
                                    </a>
                                </div>
                            )}

                            {email && (
                                <div className="p-3 bg-white shadow-sm rounded border">
                                    <small className="text-muted d-block text-uppercase fw-bold mb-1" style={{ fontSize: '0.75rem' }}>Email Address</small>
                                    <span className="fs-5 fw-semibold text-dark">{email}</span>
                                </div>
                            )}

                            <div className="mt-2 text-start small text-muted bg-light p-2 rounded">
                                <i className="bi bi-info-circle me-1"></i> Make sure to mention you found this profile on our Matrimony site.
                            </div>
                        </div>
                    ) : (
                        <div className="py-2">
                            <div className="mb-3">
                                <span className="d-inline-flex align-items-center justify-content-center bg-warning-subtle text-warning rounded-circle" style={{ width: 60, height: 60 }}>
                                    <i className="bi bi-lock-fill fs-3"></i>
                                </span>
                            </div>
                            <h5 className="fw-bold text-dark">Contact Information Hidden</h5>
                            <p className="text-muted small mx-auto" style={{ maxWidth: 300 }}>
                                {isPremiumViewer
                                    ? "This user has chosen to keep their contact details private currently."
                                    : "Upgrade your membership to view verified contact details of this profile."}
                            </p>

                            {!isPremiumViewer && (
                                <Button href="/matrimoney/package" variant="primary" className="px-4 fw-bold" style={{ backgroundColor: '#E33183', borderColor: '#E33183' }}>
                                    Upgrade Now
                                </Button>
                            )}
                        </div>
                    )}
                </Modal.Body>
            </Modal>
        </>
    );
}
