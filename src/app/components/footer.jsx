'use client';

import React from "react";
import Link from "next/link";
import "bootstrap-icons/font/bootstrap-icons.css";
import "bootstrap/dist/css/bootstrap.min.css";

const Footer = () => {
  return (
    <footer className="text-white pt-5 pb-3 mt-auto" style={{ backgroundColor: 'var(--brand-maroon, #800020)' }}>
      <div className="container">
        <div className="row g-4 justify-content-between">

          {/* Column 1: Get in Touch */}
          <div className="col-lg-4 col-md-6">
            <h6 className="fw-bold mb-4 text-uppercase tracking-wider">Get in Touch</h6>
            <ul className="list-unstyled d-flex flex-column gap-2 small opacity-75">
              <li className="mb-1 d-flex gap-2"><i className="bi bi-geo-alt-fill"></i> Bhubaneswar, Odisha, India</li>
              <li className="mb-1 d-flex gap-2"><i className="bi bi-telephone-fill"></i> +91 6370103299</li>
              <li className="mb-1 d-flex gap-2"><i className="bi bi-envelope-fill"></i> support@matrimony.com</li>
            </ul>

            <div className="d-flex gap-3 mt-4">
              {/* Google Play Button */}
              <div className="bg-black border border-white border-opacity-25 rounded px-3 py-1 d-flex align-items-center cursor-pointer hover-scale" style={{ width: 'fit-content' }}>
                <i className="bi bi-google-play fs-4 me-2"></i>
                <div style={{ lineHeight: '1.2' }}>
                  <small className="d-block text-white-50" style={{ fontSize: '0.6rem' }}>GET IT ON</small>
                  <span className="fw-bold" style={{ fontSize: '0.8rem' }}>Google Play</span>
                </div>
              </div>

              {/* App Store Button */}
              <div className="bg-black border border-white border-opacity-25 rounded px-3 py-1 d-flex align-items-center cursor-pointer hover-scale" style={{ width: 'fit-content' }}>
                <i className="bi bi-apple fs-4 me-2"></i>
                <div style={{ lineHeight: '1.2' }}>
                  <small className="d-block text-white-50" style={{ fontSize: '0.6rem' }}>Download on the</small>
                  <span className="fw-bold" style={{ fontSize: '0.8rem' }}>App Store</span>
                </div>
              </div>
            </div>
          </div>

          {/* Column 2: Company */}
          <div className="col-lg-2 col-md-6">
            <h6 className="fw-bold mb-4 text-uppercase small tracking-wider">Company</h6>
            <ul className="list-unstyled d-flex flex-column gap-3 small opacity-75">
              <li><Link href="/matrimoney/aboutus" className="text-reset text-decoration-none hover-link">About Us</Link></li>
              <li><Link href="/matrimoney/contactus" className="text-reset text-decoration-none hover-link">Contact Us</Link></li>
              <li><Link href="/matrimoney/success-stories" className="text-reset text-decoration-none hover-link">Success Stories</Link></li>
            </ul>
          </div>

          {/* Column 3: Discover */}
          <div className="col-lg-3 col-md-6">
            <h6 className="fw-bold mb-4 text-uppercase small tracking-wider">Discover</h6>
            <ul className="list-unstyled d-flex flex-column gap-3 small opacity-75">
              <li><Link href="/matrimoney/package" className="text-reset text-decoration-none hover-link">Premium Plans</Link></li>
              <li><Link href="/matrimoney/shortlist" className="text-reset text-decoration-none hover-link">Shortlisted Profiles</Link></li>
              <li><Link href="/matrimoney/matches/who-viewed-myprofile" className="text-reset text-decoration-none hover-link">Who Viewed My Profile</Link></li>
              <li><Link href="/matrimoney/interests?filter=received" className="text-reset text-decoration-none hover-link">Interest Received</Link></li>
            </ul>
          </div>

          {/* Column 4: Social Media */}
          <div className="col-lg-3 col-md-6">
            <h6 className="fw-bold mb-4 text-uppercase tracking-wider">Social Media</h6>
            <div className="d-flex gap-3">
              {[
                { icon: 'bi-facebook', href: '#' },
                { icon: 'bi-twitter-x', href: '#' },
                { icon: 'bi-instagram', href: '#' },
                { icon: 'bi-youtube', href: '#' }
              ].map((social, idx) => (
                <a key={idx} href={social.href} className="text-white fs-5 border border-white border-opacity-25 rounded-circle d-flex align-items-center justify-content-center hover-bg-white hover-text-maroon transition-all" style={{ width: 40, height: 40 }}>
                  <i className={`bi ${social.icon}`}></i>
                </a>
              ))}
            </div>
            <p className="small opacity-50 mt-4">
              Connect with us on social media for latest updates and success stories.
            </p>
          </div>
        </div>
      </div>

      {/* Bottom Footer Bar */}
      <div className="mt-5 pt-3" style={{ borderTop: '1px solid rgba(255,255,255,0.1)' }}>
        <div className="container">
          <div className="d-flex flex-column flex-md-row justify-content-between align-items-center small opacity-50">
            <div className="d-flex gap-4 flex-wrap justify-content-center justify-content-md-start mb-2 mb-md-0">
              <Link href="/privacy" className="text-reset text-decoration-none hover-link">Privacy Policy</Link>
              <Link href="/terms" className="text-reset text-decoration-none hover-link">Terms of Use</Link>
            </div>
            <div className="text-center text-md-end">
              &copy; {new Date().getFullYear()} MatriMoney. All rights reserved.
            </div>
          </div>
        </div>
      </div>

      <style jsx>{`
        .tracking-wider { letter-spacing: 1px; }
        .hover-link:hover { text-decoration: underline !important; opacity: 1; }
        .hover-scale:hover { transform: scale(1.05); transition: transform 0.2s; }
        .hover-bg-white:hover { background-color: white !important; color: var(--brand-maroon, #800020) !important; border-color: white !important; }
        .transition-all { transition: all 0.3s ease; }
      `}</style>
    </footer>
  );
};

export default Footer;
