"use client";

import React, { useEffect, useState } from "react";
import Link from "next/link";
import { FaQuestionCircle } from "react-icons/fa";

import { useI18n } from "@/lib/i18n/LanguageProvider";
import LanguageSwitcher from "@/app/components/LanguageSwitcher";
export default function GuestNav() {
    const [scrolled, setScrolled] = useState(false);
    const { t } = useI18n();

    useEffect(() => {
        const onScroll = () => setScrolled(window.scrollY > 30);
        onScroll();
        window.addEventListener("scroll", onScroll, { passive: true });
        return () => window.removeEventListener("scroll", onScroll);
    }, []);

    return (
        <nav className={`navbar navbar-expand-lg w-100 mt-0 nav-glass ${scrolled ? "nav-scrolled" : ""}`}>
            <div className="container">
                <Link className="navbar-brand d-flex align-items-center gap-2 brand-logo" href="/">
                    <span className="brand-mark" aria-hidden="true" />
                    <span>
                        <span className="brand-word">
                            <span className="brand-matri">Matri</span>
                            <span className="brand-money">Money</span>
                        </span>
                        <span className="brand-tagline">Sacred Unions</span>
                    </span>
                </Link>

                <div className="ms-auto d-flex align-items-center gap-2 gap-md-3">
                    <LanguageSwitcher />
                    <Link href="/matrimoney/aboutus" className="nav-help small fw-medium text-maroon d-none d-lg-block">{t("nav.about")}</Link>
                    <Link href="/matrimoney/package" className="nav-help small fw-medium text-maroon d-none d-lg-block me-lg-2">{t("nav.membership")}</Link>
                    <Link href="/matrimoney/login" className="btn btn-outline-danger px-3 px-md-4">
                        {t("nav.login")}
                    </Link>
                    <Link href="/#join" className="btn btn-gold px-3 px-md-4 d-none d-sm-inline-block">
                        {t("nav.register")}
                    </Link>
                    <Link href="/matrimoney/contactus" className="d-flex align-items-center gap-1 text-decoration-none text-muted fw-semibold nav-help">
                        <FaQuestionCircle size={18} />
                        <span className="d-none d-md-block small">{t("nav.help")}</span>
                    </Link>
                </div>
            </div>
        </nav>
    );
}
