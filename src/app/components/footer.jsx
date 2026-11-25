'use client';

import React, { useEffect, useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { getSession } from "@/lib/session-client";
import "bootstrap-icons/font/bootstrap-icons.css";

import { useI18n } from "@/lib/i18n/LanguageProvider";
import InstallAppButton from "@/app/components/InstallApp";
const COMPANY = [
  { href: "/matrimoney/aboutus", label: "About Us" },
  { href: "/matrimoney/contactus", label: "Contact Us" },
  { href: "/#stories", label: "Success Stories" },
  { href: "/matrimoney/feedback", label: "Feedback" },
  { href: "/matrimoney/safety", label: "Safety Centre" },
];

const DISCOVER = [
  { href: "/matrimoney/package", label: "Premium Plans" },
  { href: "/matrimoney/shortlist", label: "Shortlisted Profiles" },
  { href: "/matrimoney/matches/who-viewed-myprofile", label: "Who Viewed My Profile" },
  { href: "/matrimoney/interests?filter=received", label: "Interest Received" },
];

const SOCIAL = [
  { icon: "bi-facebook", label: "Facebook" },
  { icon: "bi-twitter-x", label: "X" },
  { icon: "bi-instagram", label: "Instagram" },
  { icon: "bi-youtube", label: "YouTube" },
];

const Footer = () => {
  const { t } = useI18n();
  const pathname = usePathname();
  const [member, setMember] = useState(false);

  useEffect(() => {
    let cancelled = false;
    getSession().then((d) => !cancelled && setMember(Boolean(d?.id)));
    return () => {
      cancelled = true;
    };
  }, [pathname]);

  if (pathname?.startsWith("/admin")) return null;

  return (
    <footer className="site-footer text-white mt-auto">
      <div className="mandala-deco light footer-mandala" aria-hidden="true" />
      {/* Call-to-action band */}
      <div className="container footer-cta-wrap">
        <div>
          <div className="footer-cta">
            <div className="mandala-deco light" aria-hidden="true" />
            <div className="row align-items-center g-4 position-relative">
              <div className="col-lg-8 text-center text-lg-start">
                <span className="eyebrow light mb-2">{member ? "Premium Membership" : "Begin Your Forever"}</span>
                <h3 className="text-white mb-2" style={{ fontSize: "2.2rem" }}>
                  {member ? "Get noticed by the families that matter." : "Your soulmate may be just one introduction away."}
                </h3>
                <p className="mb-0 text-white-50">
                  {member
                    ? "Upgrade to contact more matches, appear higher in searches and get personal assistance."
                    : "Join thousands of verified families finding meaningful matches every day."}
                </p>
              </div>
              <div className="col-lg-4 d-flex gap-2 justify-content-center justify-content-lg-end flex-wrap">
                <Link href={member ? "/matrimoney/package" : "/#join"} className="btn btn-gold px-4 py-2">
                  {member ? "Upgrade Plan" : "Register Free"}
                </Link>
                <Link href="/matrimoney/matches/overall" className="btn btn-glass rounded-pill px-4 py-2">
                  Browse Matches
                </Link>
              </div>
            </div>
          </div>
        </div>
      </div>

      <div className="container pt-5 position-relative" style={{ zIndex: 1 }}>
        <div className="row g-4 justify-content-between">
          {/* Brand + contact */}
          <div className="col-lg-4 col-md-6">
            <Link href="/" className="brand-logo mb-3">
              <span className="brand-mark" aria-hidden="true" />
              <span>
                <span className="brand-word">
                  <span className="text-white">Matri</span>
                  <span className="gold-text">Money</span>
                </span>
                <span className="brand-tagline" style={{ color: "var(--gold-light)" }}>Sacred Unions</span>
              </span>
            </Link>
            <p className="small footer-muted mb-3" style={{ maxWidth: 320 }}>
              A premium, family-first matrimony service bringing together verified brides and grooms across India and the world.
            </p>
            <ul className="list-unstyled d-flex flex-column gap-2 small footer-muted">
              <li className="d-flex gap-2"><i className="bi bi-geo-alt-fill text-gold" /> Bhubaneswar, Odisha, India</li>
              <li className="d-flex gap-2"><i className="bi bi-telephone-fill text-gold" /> +91 6370103299</li>
              <li className="d-flex gap-2"><i className="bi bi-envelope-fill text-gold" /> support@matrimony.com</li>
            </ul>

            <div className="mt-4">
              <InstallAppButton />
            </div>
          </div>

          <div className="col-lg-2 col-md-6 col-6">
            <h6 className="footer-heading">{t("footer.company")}</h6>
            <ul className="list-unstyled d-flex flex-column gap-2 small">
              {COMPANY.map((l) => (
                <li key={l.label}><Link href={l.href} className="footer-link">{l.label}</Link></li>
              ))}
            </ul>
          </div>

          <div className="col-lg-3 col-md-6 col-6">
            <h6 className="footer-heading">{t("footer.discover")}</h6>
            <ul className="list-unstyled d-flex flex-column gap-2 small">
              {DISCOVER.map((l) => (
                <li key={l.label}><Link href={l.href} className="footer-link">{l.label}</Link></li>
              ))}
            </ul>
          </div>

          <div className="col-lg-3 col-md-6">
            <h6 className="footer-heading">{t("footer.social")}</h6>
            <div className="d-flex gap-2">
              {SOCIAL.map((s) => (
                <a key={s.label} href="#" aria-label={s.label} className="social-orb">
                  <i className={`bi ${s.icon}`} />
                </a>
              ))}
            </div>
            <p className="small footer-muted mt-4 mb-0">
              Connect with us on social media for latest updates and success stories.
            </p>
          </div>
        </div>
      </div>

      <div className="footer-bottom mt-5">
        <div className="container py-3">
          <div className="d-flex flex-column flex-md-row justify-content-between align-items-center small footer-muted gap-2">
            <div className="d-flex gap-4 flex-wrap justify-content-center">
              <Link href="/matrimoney/privacy" className="footer-link">{t("footer.privacy")}</Link>
              <Link href="/matrimoney/terms" className="footer-link">{t("footer.terms")}</Link>
              <Link href="/matrimoney/safety" className="footer-link">{t("footer.safety")}</Link>
              <Link href="/admin" className="footer-link" style={{ color: "var(--gold-light)" }}>
                <i className="bi bi-shield-lock-fill me-1" /> Admin Portal
              </Link>
            </div>
            <div>&copy; {new Date().getFullYear()} MatriMoney. Crafted with <span className="gold-text">♥</span> in India.</div>
          </div>
        </div>
      </div>
    </footer>
  );
};

export default Footer;
