'use client';

import React from "react";
import Link from "next/link";

export default function MatriNav() {
  return (
    <nav
      className="navbar navbar-expand-lg bg-white shadow-sm w-100 mt-0"
      style={{ position: "fixed", top: 0, zIndex: 999, borderBottom: '3px solid var(--brand-maroon)' }}
    >
      <div className="container">
        {/* Logo Section */}
        <Link href="/" className="navbar-brand">
          <img
            src="/Image/logo.jpg"
            alt="Logo"
            className="img-fluid"
            style={{ maxWidth: "150px", height: "auto", mixBlendMode: "multiply" }}
          />
        </Link>

        {/* Toggle Button for Mobile */}
        <button
          className="navbar-toggler"
          type="button"
          data-bs-toggle="collapse"
          data-bs-target="#navbarNav"
          aria-controls="navbarNav"
          aria-expanded="false"
          aria-label="Toggle navigation"
        >
          <span className="navbar-toggler-icon"></span>
        </button>

        {/* Nav Links */}
        <div className="collapse navbar-collapse" id="navbarNav">
          <ul className="navbar-nav ms-auto align-items-center gap-3">
            <li className="nav-item">
              <Link className="nav-link fw-bold text-maroon hover-primary" href="/matrimoney/aboutus">About Us</Link>
            </li>
            <li className="nav-item">
              <Link className="nav-link fw-bold text-maroon hover-primary" href="/matrimoney/contactus">Contact Us</Link>
            </li>
            <li className="nav-item">
              <Link className="nav-link fw-bold text-maroon hover-primary" href="/matrimoney/packageselection">Package</Link>
            </li>
            <li className="nav-item">
              <Link className="btn btn-outline-primary rounded-pill px-4 btn-sm fw-bold border-2" href="/matrimoney/login">Log In</Link>
            </li>
            <li className="nav-item">
              <Link className="btn btn-primary rounded-pill px-4 btn-sm fw-bold shadow-sm" href="/matrimoney/register">Register Free</Link>
            </li>
            <li className="nav-item">
              <a className="nav-link" href="#app-link">
                <i className="bi bi-android text-primary" style={{ fontSize: "1.5rem" }}></i>
              </a>
            </li>
          </ul>
        </div>
      </div>
    </nav>
  );
}
