"use client";

import React, { useState, useEffect } from "react";
import "bootstrap/dist/css/bootstrap.min.css";
import "bootstrap-icons/font/bootstrap-icons.css";
import MatriNav from "@/app/components/matrinav";
import GuestNav from "@/app/components/guestnav";
import MatrimonyMidPage from "../midpage/page";
import Footer from "@/app/components/footer";
import { useRouter } from "next/navigation";
import { FaEye, FaEyeSlash } from "react-icons/fa";

const Home1 = () => {
  const router = useRouter();
  const [castes, setCastes] = useState([]);
  const [loading, setLoading] = useState(false);
  const [isLoggedIn, setIsLoggedIn] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
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
    agree: false
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

      // Success - Redirect to login
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
        if (data.dev_otp) console.log("DEV OTP:", data.dev_otp);
      } else {
        alert(data.error || "Failed to send OTP.");
      }
    } catch (e) {
      console.error(e);
      alert("Something went wrong sending OTP.");
    }
  };

  return (
    <>

      {/* Hero Section */}
      <div className="bg-maroon position-relative" style={{ marginTop: "0px" }}>
        <div className="container py-4">
          <div className="row align-items-center min-vh-50 py-4">
            {/* Left Side: Text */}
            <div className="col-lg-6 text-white mb-4 mb-lg-0">
              <h1 className="display-4 fw-bold mb-2 font-heading text-white">
                Indian
                <br />
                <span style={{ color: "var(--brand-light-pink)" }}>Matrimony.</span>
              </h1>
              <p className="lead mb-3 opacity-75" style={{ fontSize: "1.1rem" }}>
                Find your right life partner here. <br />
                Trusted by thousands of Indian families.
              </p>

              <div className="d-flex gap-3">
                <div className="d-flex align-items-center gap-2">
                  <div className="bg-white rounded-circle p-1" style={{ width: '24px', height: '24px', display: 'grid', placeItems: 'center' }}>
                    <i className="bi bi-people-fill text-dark" style={{ fontSize: '12px' }}></i>
                  </div>
                  <span className="small">100% Verified</span>
                </div>
                <div className="d-flex align-items-center gap-2">
                  <div className="bg-white rounded-circle p-1" style={{ width: '24px', height: '24px', display: 'grid', placeItems: 'center' }}>
                    <i className="bi bi-shield-check-fill text-dark" style={{ fontSize: '12px' }}></i>
                  </div>
                  <span className="small">Most Trusted</span>
                </div>
              </div>
            </div>

            {/* Right Side: Animated Image */}
            <div className="col-lg-6 text-center">
              <div className="position-relative d-inline-block">
                {/* Glow Effect */}
                <div style={{
                  width: '350px', height: '350px',
                  borderRadius: '50%',
                  backgroundColor: '#E91E63', // Pinkish glow
                  opacity: '0.3',
                  position: 'absolute',
                  top: '50%', left: '50%',
                  transform: 'translate(-50%, -50%) blur(50px)',
                  zIndex: 0
                }}></div>

                <div className="hero-img-container" style={{ position: 'relative', zIndex: 1 }}>
                  <img
                    src="/Image_02/home_couple_cartoon.png"
                    alt="Happy Couple"
                    className="img-fluid rounded-circle shadow-lg hero-pulse-animation"
                    style={{
                      width: '320px',
                      height: '320px',
                      objectFit: 'cover',
                      border: '8px solid rgba(255, 255, 255, 0.2)', // Subtle glass border
                      padding: '5px', // Gap between image and border
                      background: 'rgba(255, 255, 255, 0.1)'
                    }}
                  />
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* CSS Animation for Pulse */}
        <style jsx>{`
          @keyframes pulse-float {
            0% { transform: translateY(0px) scale(1); box-shadow: 0 0 0 0 rgba(255, 255, 255, 0.4); }
            50% { transform: translateY(-10px) scale(1.02); box-shadow: 0 0 20px 10px rgba(255, 255, 255, 0); }
            100% { transform: translateY(0px) scale(1); box-shadow: 0 0 0 0 rgba(255, 255, 255, 0.4); }
          }
          .hero-pulse-animation {
            animation: pulse-float 4s ease-in-out infinite;
          }
        `}</style>

        <div style={{ position: 'absolute', bottom: 0, left: 0, right: 0, height: '50px', background: 'transparent' }}></div>
      </div>

      {/* Registration Section (Replaces Search) */}
      <div className="container" style={{ marginTop: "-40px", position: "relative", zIndex: 10 }}>
        <div className="row justify-content-center">
          <div className="col-lg-10 col-xl-9">
            <div className="card border-0 shadow-lg rounded-4 overflow-hidden">
              <div className="card-header bg-white border-0 text-center pt-4 pb-0">
                <h3 className="fw-bold text-dark font-heading">
                  Begin your journey with a <span style={{ color: "var(--brand-primary, #E33183)" }}>FREE REGISTRATION!</span>
                </h3>
                <p className="text-muted small">Join thousands of happy couples.</p>
              </div>

              <div className="card-body p-4 p-md-5">
                {error && <div className="alert alert-danger py-2 small rounded-3">{error}</div>}

                <form onSubmit={handleSubmit}>
                  <div className="row g-3">
                    {/* First Name */}
                    <div className="col-md-6">
                      <div className="form-floating">
                        <input
                          type="text"
                          className="form-control"
                          id="floatingFirst"
                          placeholder="First Name"
                          name="first_name"
                          value={formData.first_name}
                          onChange={handleChange}
                          required
                        />
                        <label htmlFor="floatingFirst">First Name</label>
                      </div>
                    </div>

                    {/* Last Name */}
                    <div className="col-md-6">
                      <div className="form-floating">
                        <input
                          type="text"
                          className="form-control"
                          id="floatingLast"
                          placeholder="Last Name"
                          name="last_name"
                          value={formData.last_name}
                          onChange={handleChange}
                          required
                        />
                        <label htmlFor="floatingLast">Last Name</label>
                      </div>
                    </div>

                    {/* Gender */}
                    <div className="col-md-6">
                      <div className="form-floating">
                        <select
                          className="form-select"
                          id="floatingGender"
                          name="gender"
                          value={formData.gender}
                          onChange={handleChange}
                        >
                          <option value="Male">Male</option>
                          <option value="Female">Female</option>
                        </select>
                        <label htmlFor="floatingGender">Gender</label>
                      </div>
                    </div>

                    {/* Date of Birth */}
                    <div className="col-md-6">
                      <div className="form-floating">
                        <input
                          type="date"
                          className="form-control"
                          id="floatingDob"
                          name="dob"
                          value={formData.dob}
                          onChange={handleChange}
                          required
                        />
                        <label htmlFor="floatingDob">Date of Birth</label>
                      </div>
                    </div>

                    {/* Caste */}
                    <div className="col-md-6">
                      <div className="form-floating">
                        <select
                          className="form-select"
                          id="floatingCaste"
                          name="caste_id"
                          value={formData.caste_id}
                          onChange={handleChange}
                          required
                        >
                          <option value="">Select Caste</option>
                          {castes.map((c) => (
                            <option key={c.id} value={c.id}>{c.name}</option>
                          ))}
                        </select>
                        <label htmlFor="floatingCaste">Caste</label>
                      </div>
                    </div>

                    {/* Mobile No */}
                    <div className="col-md-6">
                      <div className="form-floating">
                        <input
                          type="tel"
                          className="form-control"
                          id="floatingMobile"
                          placeholder="Mobile No."
                          name="mobile_no"
                          value={formData.mobile_no}
                          onChange={handleChange}
                          required
                        />
                        <label htmlFor="floatingMobile">Mobile No.</label>
                      </div>
                    </div>

                    {/* Email ID */}
                    <div className="col-md-6">
                      <div className="form-floating">
                        <input
                          type="email"
                          className="form-control"
                          id="floatingEmail"
                          placeholder="Email ID"
                          name="email"
                          value={formData.email}
                          onChange={handleChange}
                          required
                        />
                        <label htmlFor="floatingEmail">Email ID</label>
                      </div>
                    </div>

                    {/* Email OTP */}
                    <div className="col-md-6">
                      <div className="input-group h-100">
                        <div className="form-floating flex-grow-1">
                          <input
                            type="text"
                            className="form-control rounded-end-0"
                            id="floatingOtp"
                            placeholder="OTP"
                            name="otp"
                            value={formData.otp}
                            onChange={handleChange}
                          />
                          <label htmlFor="floatingOtp">OTP (Optional)</label>
                        </div>
                        <button type="button" className="btn btn-outline-secondary px-3" onClick={handleSendOtp}>
                          Send
                        </button>
                      </div>
                    </div>

                    {/* Password */}
                    <div className="col-12">
                      <div className="input-group">
                        <div className="form-floating flex-grow-1">
                          <input
                            type={showPassword ? "text" : "password"}
                            className="form-control rounded-end-0"
                            id="floatingPassword"
                            placeholder="Password"
                            name="password"
                            value={formData.password}
                            onChange={handleChange}
                            required
                          />
                          <label htmlFor="floatingPassword">Create Password</label>
                        </div>
                        <button className="btn btn-outline-secondary px-3 border-start-0" type="button" onClick={() => setShowPassword(!showPassword)}>
                          {showPassword ? <FaEyeSlash /> : <FaEye />}
                        </button>
                      </div>
                    </div>

                    {/* Terms */}
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
                        <label className="form-check-label text-muted small" htmlFor="agreeCheck">
                          I agree to the <a href="#" className="text-decoration-none">Terms & Conditions</a>
                        </label>
                      </div>
                    </div>

                    {/* Submit Button */}
                    <div className="col-12 mt-4 text-center">
                      <button
                        type="submit"
                        className="btn btn-lg w-50 fw-bold text-uppercase text-white shadow-sm"
                        disabled={loading}
                        style={{
                          background: "linear-gradient(45deg, var(--brand-maroon, #800020), var(--brand-primary, #E33183))",
                          border: "none",
                          fontSize: "1.1rem",
                          borderRadius: "50px"
                        }}
                      >
                        {loading ? "Registering..." : "Register Free"}
                      </button>
                    </div>
                  </div>
                </form>
              </div>
            </div>
          </div>
        </div>
      </div>

      <MatrimonyMidPage />
    </>
  );
};

export default Home1;
