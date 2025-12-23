"use client";

import React from "react";
import Link from "next/link";
import { FaQuestionCircle } from "react-icons/fa";

export default function GuestNav() {
    return (
        <nav
            className="navbar navbar-expand-lg bg-white shadow-sm w-100 mt-0 py-3"
            style={{ position: "fixed", top: 0, zIndex: 999, borderBottom: '3px solid #ddd', minHeight: '90px' }}
        >
            <div className="container">
                {/* Logo Section - Matches DashNav Text Style */}
                <Link className="navbar-brand d-flex align-items-center" href="/">
                    <div className="d-flex align-items-center gap-1">
                        <span className="fw-bold" style={{ fontSize: '1.75rem', fontFamily: 'serif', color: 'var(--brand-maroon, #800020)' }}>Matri</span>
                        <span className="fw-bold" style={{ fontSize: '1.75rem', fontFamily: 'serif', color: 'var(--brand-primary, #E33183)' }}>Money</span>
                    </div>
                </Link>

                {/* Guest Controls */}
                <div className="ms-auto d-flex align-items-center gap-3">
                    <span className="fw-bold text-dark d-none d-md-block">Already a member?</span>
                    <Link
                        href="/matrimoney/login"
                        className="btn btn-outline-danger fw-bold text-uppercase px-4 rounded-pill"
                        style={{ borderColor: 'var(--brand-primary, #E33183)', color: 'var(--brand-primary, #E33183)' }}
                    >
                        Log In
                    </Link>

                    <Link href="/matrimoney/contactus" className="d-flex align-items-center gap-1 text-decoration-none text-muted fw-bold">
                        <FaQuestionCircle size={20} />
                        <span className="d-none d-md-block">Help</span>
                    </Link>
                </div>
            </div>
        </nav>
    );
}
