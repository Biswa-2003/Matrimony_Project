'use client';
import React from 'react';

export default function SuccessModal({ show, message, onClose }) {
    if (!show) return null;

    return (
        <div
            className="position-fixed top-0 start-0 w-100 h-100 d-flex align-items-center justify-content-center fade-in-overlay"
            style={{ zIndex: 9999, background: 'rgba(0,0,0,0.5)', backdropFilter: 'blur(5px)' }}
        >
            <div
                className="bg-white rounded-4 p-4 shadow-lg text-center scale-in-center"
                style={{ minWidth: 320, maxWidth: '90%' }}
            >
                <div className="mb-3 icon-pop">
                    <div
                        className="d-inline-flex align-items-center justify-content-center bg-success text-white rounded-circle shadow-sm"
                        style={{ width: 70, height: 70 }}
                    >
                        <i className="bi bi-check-lg fs-1"></i>
                    </div>
                </div>
                <h4 className="fw-bold text-dark mb-2">Success!</h4>
                <p className="text-muted mb-4 fs-6">{message}</p>
                <button
                    className="btn btn-dark w-100 rounded-pill fw-bold py-2"
                    onClick={onClose}
                >
                    Awesome
                </button>
            </div>
        </div>
    );
}
