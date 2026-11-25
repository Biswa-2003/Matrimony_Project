"use client";

import React, { useState, useEffect, useMemo } from "react";
import "bootstrap-icons/font/bootstrap-icons.css";
import MatrimonyMidPage from "../midpage/page";
import { useRouter } from "next/navigation";
import { FaEye, FaEyeSlash } from "react-icons/fa";
import Link from "next/link";
import { getSession } from "@/lib/session-client";
import { useSiteContent, isCustomImage } from "@/lib/site-content-client";
import Scene3D from "@/app/components/three/Scene3D";
import { Reveal, TiltCard, AnimatedCounter } from "@/app/components/motion";
import { PASSWORD_RULES } from "@/app/components/PasswordChecklist";


import { useI18n } from "@/lib/i18n/LanguageProvider";
const yearsAgo = (n) => {
  const d = new Date();
  d.setFullYear(d.getFullYear() - n);
  return d.toISOString().slice(0, 10);
};

const Home1 = () => {
  const { t } = useI18n();
  const router = useRouter();
  const { media } = useSiteContent();
  const [castes, setCastes] = useState([]);
  const [loading, setLoading] = useState(false);
  const [isLoggedIn, setIsLoggedIn] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [activeTab, setActiveTab] = useState("register");
  const [recentProfiles, setRecentProfiles] = useState([]);
  const [otpState, setOtpState] = useState({ status: "idle", message: "", cooldown: 0 });

  // Quick Search state
  const [searchGender, setSearchGender] = useState("Female");
  const [searchAgeFrom, setSearchAgeFrom] = useState("21");
  const [searchAgeTo, setSearchAgeTo] = useState("30");
  const [searchCaste, setSearchCaste] = useState("");

  const [formData, setFormData] = useState({
    first_name: "",
    last_name: "",
    gender: "Male",
    dob: "",
    caste_id: "",
    mobile_no: "",
    email: "",
    otp: "",
    password: "",
    agree: false,
  });
  const [error, setError] = useState(null);

  useEffect(() => {
    fetch("/api/lookups/castes")
      .then((res) => res.json())
      .then((data) => setCastes(Array.isArray(data) ? data : []))
      .catch(() => setCastes([]));

    getSession().then((s) => setIsLoggedIn(Boolean(s)));

    fetch("/api/recent-users?limit=4&months=12")
      .then((res) => res.json())
      .then((data) => {
        if (Array.isArray(data.users) && data.users.length > 0) setRecentProfiles(data.users);
      })
      .catch(() => {});
  }, []);

  // OTP resend cooldown
  useEffect(() => {
    if (otpState.cooldown <= 0) return;
    const t = setTimeout(() => setOtpState((s) => ({ ...s, cooldown: s.cooldown - 1 })), 1000);
    return () => clearTimeout(t);
  }, [otpState.cooldown]);

  const handleChange = (e) => {
    const { name, value, type, checked } = e.target;
    setFormData((prev) => ({ ...prev, [name]: type === "checkbox" ? checked : value }));
  };

  const passwordChecks = useMemo(
    () => PASSWORD_RULES.map((r) => ({ ...r, ok: r.test(formData.password) })),
    [formData.password]
  );
  const passwordOk = passwordChecks.every((c) => c.ok);
  const minAge = formData.gender === "Male" ? 21 : 18;

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError(null);
    if (!formData.agree) return setError("Please agree to the terms and privacy policy.");
    if (!passwordOk) return setError("Please choose a stronger password that meets all the rules below.");
    setLoading(true);
    try {
      const res = await fetch("/api/register", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(formData),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Registration failed");
      router.push("/matrimoney/login?registered=true");
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleSendOtp = async () => {
    if (!/^\S+@\S+\.\S+$/.test(formData.email)) {
      setOtpState({ status: "error", message: "Enter a valid email address first.", cooldown: 0 });
      return;
    }
    setOtpState({ status: "sending", message: "", cooldown: 0 });
    try {
      const res = await fetch("/api/auth/send-otp", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: formData.email, phone: formData.mobile_no }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Failed to send OTP.");
      if (data.dev_otp) setFormData((p) => ({ ...p, otp: data.dev_otp })); // development convenience
      if (data.delivered === false) {
        setOtpState({ status: "help", message: `${data.message} ${data.help || ""}`.trim(), cooldown: 45 });
      } else {
        setOtpState({ status: "sent", message: `Code sent to ${formData.email}`, cooldown: 45 });
      }
    } catch (e) {
      setOtpState({ status: "error", message: e.message, cooldown: 0 });
    }
  };

  const handleQuickSearch = (e) => {
    e.preventDefault();
    const params = new URLSearchParams();
    if (searchAgeFrom) params.set("ageMin", searchAgeFrom);
    if (searchAgeTo) params.set("ageMax", searchAgeTo);
    if (searchCaste) params.set("casteId", searchCaste);
    router.push(`/matrimoney/preference-search?${params.toString()}`);
  };

  return (
    <>
      {/* ================= HERO ================= */}
      <section className="hero-3d position-relative overflow-hidden" style={{ paddingBottom: 110 }}>
        <div className="mandala-deco light hero-mandala" aria-hidden="true" />
        <div className="hero-vignette" aria-hidden="true" />
        <Scene3D variant="hero" className="hero-canvas" />

        <div className="container position-relative py-5" style={{ zIndex: 2 }}>
          <div className="row align-items-center g-5" style={{ minHeight: 600 }}>
            <div className="col-lg-6">
              <Reveal delay={0.05}>
                <span className="eyebrow light mb-4">{t("home.eyebrow")}</span>
              </Reveal>

              <Reveal delay={0.15}>
                <h1 className="hero-title mb-4">
                  {t("home.title1")} <br />
                  {t("home.title2")} <em className="gold-text shine">{t("home.title3")}</em>
                </h1>
              </Reveal>

              <Reveal delay={0.25}>
                <p className="hero-lead mb-4">
                  {t("home.lead")}
                </p>
              </Reveal>

              <Reveal delay={0.35}>
                <div className="d-flex flex-wrap gap-3 mb-5">
                  <a href="#join" className="btn btn-gold btn-lg">
                    {t("home.begin")} <i className="bi bi-arrow-right ms-2" />
                  </a>
                  <Link href={isLoggedIn ? "/dashboard/myhome" : "/matrimoney/login"} className="btn btn-glass btn-lg">
                    {isLoggedIn ? t("home.dashboard") : t("home.memberLogin")}
                  </Link>
                </div>
              </Reveal>

              <Reveal delay={0.45}>
                <div className="d-flex align-items-center gap-4 flex-wrap">
                  <div>
                    <div className="hero-stat-num gold-text">50K+</div>
                    <div className="hero-stat-label">Verified Profiles</div>
                  </div>
                  <span className="hero-divider-v" />
                  <div>
                    <div className="hero-stat-num gold-text">12.5K</div>
                    <div className="hero-stat-label">Happy Marriages</div>
                  </div>
                  <span className="hero-divider-v" />
                  <div>
                    <div className="hero-stat-num gold-text">24/7</div>
                    <div className="hero-stat-label">Personal Support</div>
                  </div>
                </div>
              </Reveal>
            </div>

            <div className="col-lg-6 position-relative d-none d-lg-block">
              <Reveal delay={0.2} y={60}>
                {isCustomImage(media.home_hero) ? (
                  <div className="hero-photo-arch animate-float">
                    <img src={media.home_hero} alt="Happy couple" />
                  </div>
                ) : (
                  <div className="hero-art animate-float">
                    <img src={media.home_hero} alt="Bride and groom beneath a decorated wedding mandap" />
                  </div>
                )}
              </Reveal>
              <div className="floating-3d-badge" style={{ top: "14%", left: "0%" }}>
                <span className="badge-icon"><i className="bi bi-shield-fill-check" /></span>
                <div>
                  <div className="fw-semibold small lh-1">100% Verified</div>
                  <small className="text-muted" style={{ fontSize: "0.68rem" }}>Photo &amp; mobile checked</small>
                </div>
              </div>
              <div className="floating-3d-badge" style={{ bottom: "16%", right: "-2%", animationDelay: "1.5s" }}>
                <span className="badge-icon"><i className="bi bi-stars" /></span>
                <div>
                  <div className="fw-semibold small lh-1">AI Matchmaking</div>
                  <small className="text-muted" style={{ fontSize: "0.68rem" }}>Smart partner search</small>
                </div>
              </div>
              <div className="floating-3d-badge" style={{ top: "46%", left: "-6%", animationDelay: "0.8s" }}>
                <span className="badge-icon"><i className="bi bi-eye-slash-fill" /></span>
                <div>
                  <div className="fw-semibold small lh-1">Private by Design</div>
                  <small className="text-muted" style={{ fontSize: "0.68rem" }}>You control visibility</small>
                </div>
              </div>
            </div>
          </div>
        </div>

        <a href="#join" className="scroll-cue" aria-label="Scroll to registration">
          <span />
        </a>
      </section>

      {/* ================= REGISTER / SEARCH HUB ================= */}
      <div id="join" className="container position-relative" style={{ marginTop: -80, zIndex: 10, scrollMarginTop: 110 }}>
        <div className="row justify-content-center">
          <Reveal className="col-lg-11 col-xl-10" y={60}>
            <div className="card glass-card hub-card border-0 overflow-hidden">
              <div className="hub-tabs" role="tablist">
                <button
                  role="tab"
                  aria-selected={activeTab === "register"}
                  onClick={() => setActiveTab("register")}
                  className={`hub-tab ${activeTab === "register" ? "active" : ""}`}
                >
                  <i className="bi bi-person-heart me-2" /> Create Free Profile
                </button>
                <button
                  role="tab"
                  aria-selected={activeTab === "search"}
                  onClick={() => setActiveTab("search")}
                  className={`hub-tab ${activeTab === "search" ? "active" : ""}`}
                >
                  <i className="bi bi-search-heart me-2" /> Find Your Match
                </button>
              </div>

              <div className="card-body p-4 p-md-5">
                {activeTab === "register" && (
                  <div>
                    <div className="text-center mb-4">
                      <h2 className="mb-1" style={{ fontSize: "2.2rem" }}>
                        {t("home.regTitle1")} <span className="gradient-text">{t("home.regTitle2")}</span>
                      </h2>
                      <p className="text-muted small mb-0">{t("home.regSub")}</p>
                      <span className="ornament" />
                    </div>

                    {error && (
                      <div className="alert alert-danger py-2 small d-flex align-items-center gap-2" role="alert">
                        <i className="bi bi-exclamation-circle" /> {error}
                      </div>
                    )}

                    <form onSubmit={handleSubmit} noValidate={false}>
                      <div className="row g-3">
                        <div className="col-md-6">
                          <label className="form-label" htmlFor="reg-first">First Name</label>
                          <input id="reg-first" type="text" className="form-control" placeholder="e.g. Rahul"
                            name="first_name" value={formData.first_name} onChange={handleChange} required autoComplete="given-name" />
                        </div>
                        <div className="col-md-6">
                          <label className="form-label" htmlFor="reg-last">Last Name</label>
                          <input id="reg-last" type="text" className="form-control" placeholder="e.g. Sharma"
                            name="last_name" value={formData.last_name} onChange={handleChange} required autoComplete="family-name" />
                        </div>

                        <div className="col-md-6">
                          <label className="form-label d-block">Profile For</label>
                          <div className="d-flex gap-2">
                            {[["Male", "Groom", "bi-gender-male"], ["Female", "Bride", "bi-gender-female"]].map(([val, label, icon]) => (
                              <React.Fragment key={val}>
                                <input type="radio" className="btn-check" name="gender" id={`g-${val}`} value={val}
                                  checked={formData.gender === val} onChange={handleChange} />
                                <label className="btn btn-outline-danger flex-fill" htmlFor={`g-${val}`}>
                                  <i className={`bi ${icon} me-1`} /> {label}
                                </label>
                              </React.Fragment>
                            ))}
                          </div>
                        </div>
                        <div className="col-md-6">
                          <label className="form-label" htmlFor="reg-dob">Date of Birth</label>
                          <input id="reg-dob" type="date" className="form-control" name="dob" value={formData.dob}
                            onChange={handleChange} required max={yearsAgo(minAge)} min={yearsAgo(80)} />
                          <div className="form-text small">Minimum age {minAge} for {formData.gender === "Male" ? "grooms" : "brides"}.</div>
                        </div>

                        <div className="col-md-6">
                          <label className="form-label" htmlFor="reg-caste">Community</label>
                          <select id="reg-caste" className="form-select" name="caste_id" value={formData.caste_id} onChange={handleChange} required>
                            <option value="">Select community</option>
                            {castes.map((c) => (
                              <option key={c.id} value={c.id}>{c.name}</option>
                            ))}
                          </select>
                        </div>
                        <div className="col-md-6">
                          <label className="form-label" htmlFor="reg-mobile">Mobile Number</label>
                          <div className="input-group">
                            <span className="input-group-text">+91</span>
                            <input id="reg-mobile" type="tel" className="form-control" placeholder="10-digit number"
                              name="mobile_no" value={formData.mobile_no} onChange={handleChange} required
                              pattern="[6-9][0-9]{9}" maxLength={10} inputMode="numeric" autoComplete="tel-national" />
                          </div>
                        </div>

                        <div className="col-md-6">
                          <label className="form-label" htmlFor="reg-email">Email Address</label>
                          <input id="reg-email" type="email" className="form-control" placeholder="you@example.com"
                            name="email" value={formData.email} onChange={handleChange} required autoComplete="email" />
                        </div>
                        <div className="col-md-6">
                          <label className="form-label" htmlFor="reg-otp">Email Verification Code</label>
                          <div className="input-group">
                            <input id="reg-otp" type="text" className="form-control" placeholder="6-digit code"
                              name="otp" value={formData.otp} onChange={handleChange} inputMode="numeric" maxLength={6} />
                            <button type="button" className="btn btn-outline-danger" onClick={handleSendOtp}
                              disabled={otpState.status === "sending" || otpState.cooldown > 0}>
                              {otpState.status === "sending"
                                ? "Sending…"
                                : otpState.cooldown > 0
                                ? `Resend ${otpState.cooldown}s`
                                : otpState.status === "sent" ? "Resend" : "Send Code"}
                            </button>
                          </div>
                          {otpState.message && (
                            <div className={`form-text small ${otpState.status === "error" ? "text-danger" : otpState.status === "help" ? "text-warning-emphasis" : "text-success"}`}>
                              <i className={`bi ${otpState.status === "error" ? "bi-x-circle" : otpState.status === "help" ? "bi-headset" : "bi-check-circle"} me-1`} />
                              {otpState.message}
                            </div>
                          )}
                        </div>

                        <div className="col-12">
                          <label className="form-label" htmlFor="reg-pass">Create a Secure Password</label>
                          <div className="input-group">
                            <input id="reg-pass" type={showPassword ? "text" : "password"} className="form-control"
                              placeholder="Choose a strong password" name="password" value={formData.password}
                              onChange={handleChange} required autoComplete="new-password" />
                            <button className="btn btn-outline-secondary" type="button" onClick={() => setShowPassword(!showPassword)}
                              aria-label={showPassword ? "Hide password" : "Show password"}>
                              {showPassword ? <FaEyeSlash /> : <FaEye />}
                            </button>
                          </div>
                          <div className="d-flex flex-wrap gap-2 mt-2">
                            {passwordChecks.map((c) => (
                              <span key={c.label} className={`badge rounded-pill ${c.ok ? "badge-gold" : "bg-light text-muted border"}`}>
                                <i className={`bi ${c.ok ? "bi-check2" : "bi-dot"} me-1`} />{c.label}
                              </span>
                            ))}
                          </div>
                        </div>

                        <div className="col-12 text-center mt-3">
                          <div className="form-check d-inline-block">
                            <input className="form-check-input" type="checkbox" name="agree" id="agreeCheck"
                              checked={formData.agree} onChange={handleChange} />
                            <label className="form-check-label text-muted small ms-1" htmlFor="agreeCheck">
                              I agree to the <Link href="/matrimoney/terms" className="text-danger fw-semibold" target="_blank">Terms of Use</Link> and <Link href="/matrimoney/privacy" className="text-danger fw-semibold" target="_blank">Privacy Policy</Link>.
                            </label>
                          </div>
                        </div>

                        <div className="col-12 text-center mt-3">
                          <button type="submit" disabled={loading} className="btn btn-primary btn-lg px-5" style={{ minWidth: 280 }}>
                            {loading ? (
                              <><span className="spinner-border spinner-border-sm me-2" /> Creating your profile…</>
                            ) : (
                              <>Register My Profile Free <i className="bi bi-arrow-right ms-2" /></>
                            )}
                          </button>
                          <div className="small text-muted mt-3">
                            <i className="bi bi-lock-fill text-gold me-1" /> Your details are private and never shared without consent.
                          </div>
                        </div>
                      </div>
                    </form>
                  </div>
                )}

                {activeTab === "search" && (
                  <div>
                    <div className="text-center mb-4">
                      <h2 className="mb-1" style={{ fontSize: "2.2rem" }}>
                        {t("home.searchTitle1")} <span className="gradient-text">{t("home.searchTitle2")}</span>
                      </h2>
                      <p className="text-muted small mb-0">{t("home.searchSub")}</p>
                      <span className="ornament" />
                    </div>

                    <form onSubmit={handleQuickSearch}>
                      <div className="row g-3 align-items-end">
                        <div className="col-md-3">
                          <label className="form-label">Looking For</label>
                          <select className="form-select" value={searchGender} onChange={(e) => setSearchGender(e.target.value)}>
                            <option value="Female">Bride</option>
                            <option value="Male">Groom</option>
                          </select>
                        </div>
                        <div className="col-md-3">
                          <label className="form-label">Age</label>
                          <div className="input-group">
                            <input type="number" className="form-control" value={searchAgeFrom} min="18" max="70"
                              onChange={(e) => setSearchAgeFrom(e.target.value)} aria-label="Minimum age" />
                            <span className="input-group-text">to</span>
                            <input type="number" className="form-control" value={searchAgeTo} min="18" max="70"
                              onChange={(e) => setSearchAgeTo(e.target.value)} aria-label="Maximum age" />
                          </div>
                        </div>
                        <div className="col-md-3">
                          <label className="form-label">Community</label>
                          <select className="form-select" value={searchCaste} onChange={(e) => setSearchCaste(e.target.value)}>
                            <option value="">Any community</option>
                            {castes.map((c) => (
                              <option key={c.id} value={c.id}>{c.name}</option>
                            ))}
                          </select>
                        </div>
                        <div className="col-md-3">
                          <button type="submit" className="btn btn-primary w-100 py-2">
                            <i className="bi bi-search me-2" /> Search
                          </button>
                        </div>
                      </div>
                    </form>
                  </div>
                )}
              </div>
            </div>
          </Reveal>
        </div>
      </div>

      {/* ================= TRUST NUMBERS ================= */}
      <section className="container py-5 my-4">
        <div className="row g-4 text-center">
          {[
            { to: 50000, suffix: "+", label: "Verified Profiles", sub: "Screened by our team", icon: "bi-person-check" },
            { to: 12500, suffix: "+", label: "Happy Marriages", sub: "Families united", icon: "bi-gem" },
            { to: 100, suffix: "%", label: "Privacy Controlled", sub: "You choose who sees you", icon: "bi-shield-lock" },
            { text: "24/7", label: "Assisted Matchmaking", sub: "AI & human guidance", icon: "bi-headset" },
          ].map((s, i) => (
            <div key={s.label} className="col-6 col-md-3">
              <Reveal delay={i * 0.1} className="h-100">
                <TiltCard className="stat-card h-100 p-4">
                  <div className="stat-icon mb-3" style={{ transform: "translateZ(40px)" }}>
                    <i className={`bi ${s.icon}`} />
                  </div>
                  <div className="stat-num mb-1" style={{ transform: "translateZ(50px)" }}>
                    {s.text ? s.text : <AnimatedCounter to={s.to} suffix={s.suffix} />}
                  </div>
                  <div className="fw-semibold" style={{ color: "var(--maroon-900)" }}>{s.label}</div>
                  <small className="text-muted">{s.sub}</small>
                </TiltCard>
              </Reveal>
            </div>
          ))}
        </div>
      </section>

      {/* ================= FEATURED PROFILES ================= */}
      {recentProfiles.length > 0 && (
        <section className="py-5 section-soft">
          <div className="container py-3">
            <Reveal className="d-flex flex-column flex-md-row justify-content-between align-items-md-end gap-3 mb-5">
              <div>
                <span className="eyebrow mb-2">{t("home.featuredEyebrow")}</span>
                <h2 className="mb-0" style={{ fontSize: "2.6rem" }}>{t("home.featuredTitle")}</h2>
              </div>
              <Link href="/matrimoney/matches/overall" className="btn btn-outline-danger px-4">
                View All Matches <i className="bi bi-arrow-right ms-1" />
              </Link>
            </Reveal>

            <div className="row g-4">
              {recentProfiles.map((p, i) => (
                <div key={p.user_id} className="col-6 col-md-3">
                  <Reveal delay={i * 0.08} className="h-100">
                    <TiltCard className="profile-tilt h-100">
                      <div className="position-relative overflow-hidden" style={{ height: 260, borderRadius: "22px 22px 0 0" }}>
                        <img
                          src={p.photo || "/uploads/default.jpg"}
                          alt={p.first_name}
                          className="w-100 h-100 object-fit-cover profile-tilt-img"
                          onError={(e) => {
                            e.target.onerror = null;
                            e.target.src = String(p.gender).toLowerCase() === "male" ? "/images/avatar-male.svg" : "/images/avatar-female.svg";
                          }}
                        />
                        <div className="profile-tilt-shade" />
                        <span className="verified-chip"><i className="bi bi-patch-check-fill" /> Verified</span>
                        <div className="position-absolute bottom-0 start-0 p-3 text-white">
                          <div className="fw-semibold" style={{ fontFamily: "var(--font-display)", fontSize: "1.5rem", lineHeight: 1 }}>{p.first_name}</div>
                          <small className="opacity-75 font-monospace">{p.matri_id}</small>
                        </div>
                      </div>
                      <div className="p-3 text-center">
                        <div className="text-muted small mb-2">{p.gender === "Male" ? "Groom" : p.gender === "Female" ? "Bride" : "Member"}</div>
                        <Link href={`/matrimoney/profile-details/${p.matri_id}`} className="btn btn-sm btn-primary w-100">
                          View Profile
                        </Link>
                      </div>
                    </TiltCard>
                  </Reveal>
                </div>
              ))}
            </div>
          </div>
        </section>
      )}

      {/* ================= THREE STEPS ================= */}
      <section className="py-5 position-relative overflow-hidden section-ivory">
        <div className="mandala-deco" style={{ width: 520, height: 520, left: -200, top: -120 }} aria-hidden="true" />
        <div className="container py-4 position-relative">
          <Reveal className="text-center mb-5">
            <span className="eyebrow mb-2">{t("home.stepsEyebrow")}</span>
            <h2 style={{ fontSize: "2.8rem" }}>{t("home.stepsTitle")}</h2>
            <span className="ornament" />
          </Reveal>

          <div className="row g-4 text-center">
            {[
              { icon: "bi-person-vcard", title: t("home.step1t"), text: t("home.step1d") },
              { icon: "bi-hearts", title: t("home.step2t"), text: t("home.step2d") },
              { icon: "bi-flower1", title: t("home.step3t"), text: t("home.step3d") },
            ].map((s, i) => (
              <div key={s.title} className="col-md-4">
                <Reveal delay={i * 0.15} className="h-100">
                  <TiltCard className="step-3d-box p-4 p-lg-5 h-100" max={8}>
                    <div className="step-orb mx-auto mb-4" style={{ transform: "translateZ(60px)" }}>
                      <i className={`bi ${s.icon}`} />
                    </div>
                    <div className="eyebrow justify-content-center mb-2" style={{ fontSize: "0.65rem" }}>{t("home.step")} {i + 1}</div>
                    <h4 className="mb-2" style={{ fontSize: "1.7rem", transform: "translateZ(30px)" }}>{s.title}</h4>
                    <p className="text-muted small mb-0">{s.text}</p>
                  </TiltCard>
                </Reveal>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Stories, why-us, traditions */}
      <MatrimonyMidPage />
    </>
  );
};

export default Home1;
