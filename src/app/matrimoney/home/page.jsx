"use client";

import React, { useState, useEffect } from "react";
import "bootstrap/dist/css/bootstrap.min.css";
import "bootstrap-icons/font/bootstrap-icons.css";
import MatrimonyMidPage from "../midpage/page";
import { useRouter } from "next/navigation";
import { FaEye, FaEyeSlash } from "react-icons/fa";
import Link from "next/link";

const Home1 = () => {
  const router = useRouter();
  const [castes, setCastes] = useState([]);
  const [loading, setLoading] = useState(false);
  const [isLoggedIn, setIsLoggedIn] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [activeTab, setActiveTab] = useState("register"); // "register" | "search"
  const [recentProfiles, setRecentProfiles] = useState([]);

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
    // 1. Fetch Castes
    fetch("/api/lookups/castes")
      .then((res) => res.json())
      .then((data) => setCastes(data))
      .catch((err) => console.error("Failed to fetch castes", err));

    // 2. Check Login Status
    fetch("/api/me")
      .then((res) => {
        if (res.ok) return res.json();
        throw new Error("Not logged in");
      })
      .then((data) => {
        if (data.user || data.id) setIsLoggedIn(true);
      })
      .catch(() => setIsLoggedIn(false));

    // 3. Fetch Featured Profiles
    fetch("/api/recent-users?limit=4&months=12")
      .then((res) => res.json())
      .then((data) => {
        if (data.users && data.users.length > 0) {
          setRecentProfiles(data.users);
        }
      })
      .catch((err) => console.error("Failed to load featured profiles", err));
  }, []);

  const handleChange = (e) => {
    const { name, value, type, checked } = e.target;
    setFormData((prev) => ({
      ...prev,
      [name]: type === "checkbox" ? checked : value,
    }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError(null);
    if (!formData.agree) {
      setError("Please agree to the terms and conditions.");
      return;
    }
    setLoading(true);

    try {
      const res = await fetch("/api/register", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(formData),
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || "Registration failed");
      }

      router.push("/matrimoney/login?registered=true");
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleSendOtp = async () => {
    if (!formData.email) {
      alert("Please enter your email first.");
      return;
    }

    try {
      const res = await fetch("/api/auth/send-otp", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: formData.email }),
      });
      const data = await res.json();
      if (res.ok) {
        alert(data.message || "OTP sent to your email!");
      } else {
        alert(data.error || "Failed to send OTP.");
      }
    } catch (e) {
      console.error(e);
      alert("Something went wrong sending OTP.");
    }
  };

  const handleQuickSearch = (e) => {
    e.preventDefault();
    const params = new URLSearchParams();
    if (searchGender) params.set("gender", searchGender);
    if (searchAgeFrom) params.set("ageFrom", searchAgeFrom);
    if (searchAgeTo) params.set("ageTo", searchAgeTo);
    if (searchCaste) params.set("caste", searchCaste);
    router.push(`/matrimoney/results?${params.toString()}`);
  };

  return (
    <>
      {/* 3D Animated Hero Section */}
      <div
        className="position-relative text-white py-5 overflow-hidden"
        style={{
          background: "linear-gradient(135deg, #300314 0%, #580C29 35%, #881337 70%, #9F1239 100%)",
          minHeight: "600px",
        }}
      >
        {/* Floating Heart Particles in 3D Space */}
        <span className="heart-float" style={{ left: "10%", animationDelay: "0s" }}>💖</span>
        <span className="heart-float" style={{ left: "25%", animationDelay: "2.5s" }}>💍</span>
        <span className="heart-float" style={{ left: "45%", animationDelay: "5s" }}>✨</span>
        <span className="heart-float" style={{ left: "70%", animationDelay: "1.5s" }}>💖</span>
        <span className="heart-float" style={{ left: "88%", animationDelay: "4s" }}>🌹</span>

        {/* Ambient Glows */}
        <div
          style={{
            position: "absolute",
            top: "-15%",
            right: "0%",
            width: "550px",
            height: "550px",
            borderRadius: "50%",
            background: "radial-gradient(circle, rgba(225, 29, 72, 0.4) 0%, rgba(225, 29, 72, 0) 70%)",
            filter: "blur(70px)",
            pointerEvents: "none",
          }}
        ></div>

        <div className="container position-relative py-4" style={{ zIndex: 2 }}>
          <div className="row align-items-center g-5">
            {/* Left Column: Hero Text */}
            <div className="col-lg-6">
              <div className="d-inline-flex align-items-center gap-2 bg-white bg-opacity-15 border border-white border-opacity-25 rounded-pill px-3 py-1 mb-3 shadow-sm">
                <i className="bi bi-stars text-warning fs-6"></i>
                <span className="small fw-semibold text-white">#1 Trusted Indian Matrimony Network</span>
              </div>

              <h1 className="display-4 fw-bold font-heading text-white mb-3" style={{ lineHeight: 1.15 }}>
                Your Sacred Journey to <br />
                <span style={{ color: "#FF85A2", textShadow: "0 0 25px rgba(255,133,162,0.5)" }}>
                  Lifelong Love
                </span>{" "}
                Begins Here.
              </h1>

              <p className="lead text-white-50 mb-4" style={{ fontSize: "1.15rem", lineHeight: 1.6 }}>
                Connect with verified, cultured, and compatible Indian brides and grooms. Designed with strict privacy,
                smart AI matching, and complete family confidence.
              </p>

              {/* Trust Badges */}
              <div className="d-flex flex-wrap gap-3 mb-4">
                <div className="d-flex align-items-center gap-2 bg-white bg-opacity-10 px-3 py-2 rounded-pill border border-white border-opacity-15 shadow-sm">
                  <i className="bi bi-patch-check-fill text-warning fs-5"></i>
                  <span className="small fw-semibold text-white">100% Verified Profiles</span>
                </div>
                <div className="d-flex align-items-center gap-2 bg-white bg-opacity-10 px-3 py-2 rounded-pill border border-white border-opacity-15 shadow-sm">
                  <i className="bi bi-shield-lock-fill text-info fs-5"></i>
                  <span className="small fw-semibold text-white">Strict Privacy Controls</span>
                </div>
                <div className="d-flex align-items-center gap-2 bg-white bg-opacity-10 px-3 py-2 rounded-pill border border-white border-opacity-15 shadow-sm">
                  <i className="bi bi-chat-heart-fill text-danger fs-5"></i>
                  <span className="small fw-semibold text-white">Direct Family Connect</span>
                </div>
              </div>
            </div>

            {/* Right Column: 3D Animated Hero Couple Artwork */}
            <div className="col-lg-6 text-center">
              <div className="hero-3d-container position-relative d-inline-block p-4">
                {/* 3D Ambient Rotating Rings */}
                <div className="hero-3d-ring hero-ring-1"></div>
                <div className="hero-3d-ring hero-ring-2"></div>

                {/* Floating 3D Badge 1: Top Left */}
                <div className="floating-3d-badge badge-top-left text-dark">
                  <div
                    className="rounded-circle bg-success text-white p-1 d-flex align-items-center justify-content-center"
                    style={{ width: 32, height: 32 }}
                  >
                    <i className="bi bi-shield-fill-check fs-6"></i>
                  </div>
                  <div className="text-start">
                    <div className="fw-bold" style={{ fontSize: "0.82rem", lineHeight: 1.1 }}>
                      100% Verified
                    </div>
                    <small className="text-muted" style={{ fontSize: "0.68rem" }}>
                      Photos & Mobile
                    </small>
                  </div>
                </div>

                {/* Floating 3D Badge 2: Bottom Right */}
                <div className="floating-3d-badge badge-bottom-right text-dark">
                  <div
                    className="rounded-circle bg-danger text-white p-1 d-flex align-items-center justify-content-center"
                    style={{ width: 32, height: 32 }}
                  >
                    <i className="bi bi-heart-fill fs-6"></i>
                  </div>
                  <div className="text-start">
                    <div className="fw-bold" style={{ fontSize: "0.82rem", lineHeight: 1.1 }}>
                      98% Match
                    </div>
                    <small className="text-muted" style={{ fontSize: "0.68rem" }}>
                      AI Compatibility
                    </small>
                  </div>
                </div>

                {/* Main 3D Framed Couple Image with Fallback */}
                <div
                  className="rounded-circle overflow-hidden shadow-lg position-relative"
                  style={{
                    width: "350px",
                    height: "350px",
                    maxWidth: "100%",
                    margin: "0 auto",
                    border: "6px solid rgba(255, 255, 255, 0.45)",
                    boxShadow: "0 25px 60px rgba(0,0,0,0.45), 0 0 45px rgba(225, 29, 72, 0.4)",
                    zIndex: 2,
                  }}
                >
                  <img
                    src="/Image_02/matromon.jpg"
                    alt="Happy Matrimony Couple"
                    className="w-100 h-100 object-fit-cover"
                    onError={(e) => {
                      e.target.onerror = null;
                      e.target.src = "/Image_02/Banner_1.jpg";
                    }}
                  />
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Floating 3D Interactive Hub (Search / Register) */}
      <div className="container position-relative perspective-1000" style={{ marginTop: "-55px", zIndex: 10 }}>
        <div className="row justify-content-center">
          <div className="col-lg-10 col-xl-9">
            <div className="card glass-card card-3d shimmer-card border-0 shadow-lg overflow-hidden">
              {/* Tab Selector */}
              <div className="card-header bg-white border-bottom p-0">
                <div className="d-flex">
                  <button
                    onClick={() => setActiveTab("register")}
                    className={`btn flex-grow-1 py-3 fw-bold rounded-0 border-0 transition-all ${
                      activeTab === "register"
                        ? "text-danger border-bottom border-danger border-3 bg-white"
                        : "text-muted bg-light"
                    }`}
                    style={activeTab === "register" ? { borderBottom: "3px solid #E33183 !important" } : {}}
                  >
                    <i className="bi bi-person-heart me-2"></i> Free Member Registration
                  </button>
                  <button
                    onClick={() => setActiveTab("search")}
                    className={`btn flex-grow-1 py-3 fw-bold rounded-0 border-0 transition-all ${
                      activeTab === "search"
                        ? "text-danger border-bottom border-danger border-3 bg-white"
                        : "text-muted bg-light"
                    }`}
                    style={activeTab === "search" ? { borderBottom: "3px solid #E33183 !important" } : {}}
                  >
                    <i className="bi bi-search-heart me-2"></i> Quick Match Finder
                  </button>
                </div>
              </div>

              <div className="card-body p-4 p-md-5">
                {/* Tab 1: Registration Form */}
                {activeTab === "register" && (
                  <div>
                    <div className="text-center mb-4">
                      <h3 className="fw-bold text-dark font-heading mb-1">
                        Begin Your Search with a <span className="gradient-text">FREE Registration</span>
                      </h3>
                      <p className="text-muted small">It only takes 2 minutes to create your matrimonial profile.</p>
                    </div>

                    {error && <div className="alert alert-danger py-2 small rounded-3">{error}</div>}

                    <form onSubmit={handleSubmit}>
                      <div className="row g-3">
                        <div className="col-md-6">
                          <label className="form-label small fw-semibold text-secondary">First Name</label>
                          <input
                            type="text"
                            className="form-control"
                            placeholder="e.g. Rahul"
                            name="first_name"
                            value={formData.first_name}
                            onChange={handleChange}
                            required
                          />
                        </div>

                        <div className="col-md-6">
                          <label className="form-label small fw-semibold text-secondary">Last Name</label>
                          <input
                            type="text"
                            className="form-control"
                            placeholder="e.g. Sharma"
                            name="last_name"
                            value={formData.last_name}
                            onChange={handleChange}
                            required
                          />
                        </div>

                        <div className="col-md-6">
                          <label className="form-label small fw-semibold text-secondary">Gender</label>
                          <select
                            className="form-select"
                            name="gender"
                            value={formData.gender}
                            onChange={handleChange}
                          >
                            <option value="Male">Male (Groom)</option>
                            <option value="Female">Female (Bride)</option>
                          </select>
                        </div>

                        <div className="col-md-6">
                          <label className="form-label small fw-semibold text-secondary">Date of Birth</label>
                          <input
                            type="date"
                            className="form-control"
                            name="dob"
                            value={formData.dob}
                            onChange={handleChange}
                            required
                          />
                        </div>

                        <div className="col-md-6">
                          <label className="form-label small fw-semibold text-secondary">Caste / Community</label>
                          <select
                            className="form-select"
                            name="caste_id"
                            value={formData.caste_id}
                            onChange={handleChange}
                            required
                          >
                            <option value="">Select Caste</option>
                            {castes.map((c) => (
                              <option key={c.id} value={c.id}>
                                {c.name}
                              </option>
                            ))}
                          </select>
                        </div>

                        <div className="col-md-6">
                          <label className="form-label small fw-semibold text-secondary">Mobile Number</label>
                          <input
                            type="tel"
                            className="form-control"
                            placeholder="10-digit number"
                            name="mobile_no"
                            value={formData.mobile_no}
                            onChange={handleChange}
                            required
                          />
                        </div>

                        <div className="col-md-6">
                          <label className="form-label small fw-semibold text-secondary">Email Address</label>
                          <input
                            type="email"
                            className="form-control"
                            placeholder="e.g. rahul@example.com"
                            name="email"
                            value={formData.email}
                            onChange={handleChange}
                            required
                          />
                        </div>

                        <div className="col-md-6">
                          <label className="form-label small fw-semibold text-secondary">Email Verification</label>
                          <div className="input-group">
                            <input
                              type="text"
                              className="form-control"
                              placeholder="Enter OTP"
                              name="otp"
                              value={formData.otp}
                              onChange={handleChange}
                            />
                            <button
                              type="button"
                              className="btn btn-outline-danger"
                              onClick={handleSendOtp}
                            >
                              Send OTP
                            </button>
                          </div>
                        </div>

                        <div className="col-12">
                          <label className="form-label small fw-semibold text-secondary">Create Secure Password</label>
                          <div className="input-group">
                            <input
                              type={showPassword ? "text" : "password"}
                              className="form-control"
                              placeholder="At least 6 characters"
                              name="password"
                              value={formData.password}
                              onChange={handleChange}
                              required
                            />
                            <button
                              className="btn btn-outline-secondary"
                              type="button"
                              onClick={() => setShowPassword(!showPassword)}
                            >
                              {showPassword ? <FaEyeSlash /> : <FaEye />}
                            </button>
                          </div>
                        </div>

                        <div className="col-12 text-center mt-3">
                          <div className="form-check d-inline-block">
                            <input
                              className="form-check-input"
                              type="checkbox"
                              name="agree"
                              id="agreeCheck"
                              checked={formData.agree}
                              onChange={handleChange}
                            />
                            <label className="form-check-label text-muted small ms-1" htmlFor="agreeCheck">
                              I agree to the <Link href="/matrimoney/aboutus" className="text-danger fw-semibold">Terms of Service</Link> and Privacy Policy.
                            </label>
                          </div>
                        </div>

                        <div className="col-12 text-center mt-4">
                          <button
                            type="submit"
                            disabled={loading}
                            className="btn btn-primary btn-lg px-5 py-3 fw-bold shadow-sm"
                            style={{ minWidth: "260px" }}
                          >
                            {loading ? "Creating Profile..." : "Register My Profile Free"}
                          </button>
                        </div>
                      </div>
                    </form>
                  </div>
                )}

                {/* Tab 2: Quick Match Search Form */}
                {activeTab === "search" && (
                  <div>
                    <div className="text-center mb-4">
                      <h3 className="fw-bold text-dark font-heading mb-1">
                        Find Compatible <span className="gradient-text">Matches Near You</span>
                      </h3>
                      <p className="text-muted small">Filter by gender, age, community, and city to find prospective partners.</p>
                    </div>

                    <form onSubmit={handleQuickSearch}>
                      <div className="row g-3">
                        <div className="col-md-3">
                          <label className="form-label small fw-semibold text-secondary">Looking For</label>
                          <select
                            className="form-select form-select-lg"
                            value={searchGender}
                            onChange={(e) => setSearchGender(e.target.value)}
                          >
                            <option value="Female">Bride (Female)</option>
                            <option value="Male">Groom (Male)</option>
                          </select>
                        </div>

                        <div className="col-md-3">
                          <label className="form-label small fw-semibold text-secondary">Age Range</label>
                          <div className="input-group">
                            <input
                              type="number"
                              className="form-control form-select-lg"
                              value={searchAgeFrom}
                              onChange={(e) => setSearchAgeFrom(e.target.value)}
                              placeholder="From"
                              min="18"
                              max="70"
                            />
                            <span className="input-group-text bg-light">to</span>
                            <input
                              type="number"
                              className="form-control form-select-lg"
                              value={searchAgeTo}
                              onChange={(e) => setSearchAgeTo(e.target.value)}
                              placeholder="To"
                              min="18"
                              max="70"
                            />
                          </div>
                        </div>

                        <div className="col-md-3">
                          <label className="form-label small fw-semibold text-secondary">Caste / Community</label>
                          <select
                            className="form-select form-select-lg"
                            value={searchCaste}
                            onChange={(e) => setSearchCaste(e.target.value)}
                          >
                            <option value="">Any Caste</option>
                            {castes.map((c) => (
                              <option key={c.id} value={c.name}>
                                {c.name}
                              </option>
                            ))}
                          </select>
                        </div>

                        <div className="col-md-3 d-flex align-items-end">
                          <button
                            type="submit"
                            className="btn btn-primary btn-lg w-100 py-3 fw-bold shadow-sm"
                          >
                            <i className="bi bi-search me-2"></i> Find Matches
                          </button>
                        </div>
                      </div>
                    </form>
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* 3D Animated Live Platform Counter Strip */}
      <div className="container py-5 my-3 perspective-1000">
        <div className="row g-4 text-center">
          <div className="col-6 col-md-3">
            <div className="p-4 bg-white rounded-4 shadow-sm border h-100 card-3d">
              <div className="display-6 fw-bold text-danger mb-1 font-heading card-3d-lift">50,000+</div>
              <div className="fw-semibold text-dark">Active Profiles</div>
              <small className="text-muted">Verified Indian singles</small>
            </div>
          </div>
          <div className="col-6 col-md-3">
            <div className="p-4 bg-white rounded-4 shadow-sm border h-100 card-3d">
              <div className="display-6 fw-bold text-warning mb-1 font-heading card-3d-lift">12,500+</div>
              <div className="fw-semibold text-dark">Happy Marriages</div>
              <small className="text-muted">Success stories uniting families</small>
            </div>
          </div>
          <div className="col-6 col-md-3">
            <div className="p-4 bg-white rounded-4 shadow-sm border h-100 card-3d">
              <div className="display-6 fw-bold text-success mb-1 font-heading card-3d-lift">100%</div>
              <div className="fw-semibold text-dark">Verified Mobile & Photos</div>
              <small className="text-muted">Strict trust standards</small>
            </div>
          </div>
          <div className="col-6 col-md-3">
            <div className="p-4 bg-white rounded-4 shadow-sm border h-100 card-3d">
              <div className="display-6 fw-bold text-primary mb-1 font-heading card-3d-lift">24/7</div>
              <div className="fw-semibold text-dark">Assisted Matchmaking</div>
              <small className="text-muted">AI & human guidance</small>
            </div>
          </div>
        </div>
      </div>

      {/* Featured Verified Profiles 3D Showcase */}
      {recentProfiles.length > 0 && (
        <div className="py-5 bg-white border-top border-bottom perspective-1500">
          <div className="container">
            <div className="d-flex flex-column flex-md-row justify-content-between align-items-md-center gap-3 mb-4">
              <div>
                <span className="badge bg-danger-subtle text-danger px-3 py-1 rounded-pill fw-bold mb-2">
                  ✨ FEATURED MEMBERS
                </span>
                <h3 className="fw-bold font-heading text-dark mb-0">Recently Joined Verified Profiles</h3>
              </div>
              <Link href="/matrimoney/matches/overall" className="btn btn-outline-danger btn-sm rounded-pill px-4 fw-bold">
                View All Matches &rarr;
              </Link>
            </div>

            <div className="row g-4">
              {recentProfiles.map((p) => (
                <div key={p.user_id} className="col-6 col-md-3">
                  <div className="card card-3d bg-white h-100 border rounded-4 overflow-hidden shadow-sm">
                    <div className="position-relative" style={{ height: "220px" }}>
                      <img
                        src={p.photo || "/uploads/default.jpg"}
                        alt={p.first_name}
                        className="w-100 h-100 object-fit-cover"
                        onError={(e) => {
                          e.target.onerror = null;
                          e.target.src = "/Image_02/tra1.jpg";
                        }}
                      />
                      <span className="position-absolute top-0 end-0 m-2 badge bg-success shadow-sm rounded-pill">
                        <i className="bi bi-patch-check-fill me-1"></i> Verified
                      </span>
                    </div>
                    <div className="card-body p-3 text-center">
                      <h6 className="fw-bold text-dark mb-1">{p.first_name}</h6>
                      <small className="badge bg-light text-dark border mb-2 font-monospace">{p.matri_id}</small>
                      <div className="d-block text-muted small">{p.gender || "Member"}</div>
                      <Link
                        href={`/matrimoney/profile-details/${p.matri_id}`}
                        className="btn btn-sm btn-outline-danger rounded-pill w-100 mt-2 fw-semibold"
                      >
                        View Profile
                      </Link>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* 3 Steps To Your Life Partner */}
      <div className="py-5 bg-light perspective-1000">
        <div className="container">
          <div className="text-center mb-5">
            <span className="badge bg-danger-subtle text-danger px-3 py-2 rounded-pill fw-bold mb-2">
              SIMPLE 3-STEP JOURNEY
            </span>
            <h2 className="fw-bold font-heading text-dark">How MatriMoney Works</h2>
            <p className="text-muted">Start connecting with your future partner in three intuitive steps</p>
          </div>

          <div className="row g-4 text-center">
            <div className="col-md-4">
              <div className="step-3d-box p-4 h-100 card-3d">
                <div
                  className="rounded-circle d-flex align-items-center justify-content-center text-white mx-auto mb-3 shadow card-3d-lift"
                  style={{ width: 68, height: 68, background: "linear-gradient(135deg, #490B22, #C2185B)" }}
                >
                  <i className="bi bi-person-badge-fill fs-3"></i>
                </div>
                <h5 className="fw-bold text-dark mb-2">1. Create Your Profile</h5>
                <p className="text-muted small mb-0">
                  Register for free, add your photos, educational qualifications, caste, and partner expectations.
                </p>
              </div>
            </div>

            <div className="col-md-4">
              <div className="step-3d-box p-4 h-100 card-3d">
                <div
                  className="rounded-circle d-flex align-items-center justify-content-center text-white mx-auto mb-3 shadow card-3d-lift"
                  style={{ width: 68, height: 68, background: "linear-gradient(135deg, #E33183, #F43F5E)" }}
                >
                  <i className="bi bi-heart-pulse-fill fs-3"></i>
                </div>
                <h5 className="fw-bold text-dark mb-2">2. Connect & Express Interest</h5>
                <p className="text-muted small mb-0">
                  Search through thousands of verified profiles, shortlist your favorites, and send direct interests.
                </p>
              </div>
            </div>

            <div className="col-md-4">
              <div className="step-3d-box p-4 h-100 card-3d">
                <div
                  className="rounded-circle d-flex align-items-center justify-content-center text-white mx-auto mb-3 shadow card-3d-lift"
                  style={{ width: 68, height: 68, background: "linear-gradient(135deg, #D97706, #F59E0B)" }}
                >
                  <i className="bi bi-chat-quote-fill fs-3"></i>
                </div>
                <h5 className="fw-bold text-dark mb-2">3. Meet & Celebrate</h5>
                <p className="text-muted small mb-0">
                  Communicate securely through chat, exchange verified phone numbers, and plan your wedding.
                </p>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Success Stories Component */}
      <MatrimonyMidPage />
    </>
  );
};

export default Home1;
