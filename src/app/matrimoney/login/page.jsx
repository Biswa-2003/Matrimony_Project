'use client';

import React, { useState, useEffect } from "react";
import Link from "next/link";
import { Container, Row, Col, Form, Button, InputGroup } from "react-bootstrap";
import { AiFillEye, AiFillEyeInvisible } from "react-icons/ai";
import "bootstrap/dist/css/bootstrap.min.css";
import { useRouter } from "next/navigation";

export default function LoginPage() {
  const [emailOrPhone, setEmailOrPhone] = useState("");
  const [password, setPassword] = useState("");
  const [passwordVisible, setPasswordVisible] = useState(false);
  const [responseMessage, setResponseMessage] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [currentImageIndex, setCurrentImageIndex] = useState(0);
  const router = useRouter();

  const images = [
    "/Image_02/Banner_1.jpg",
    "/Image_02/matromon.jpg",
    "/Image_02/Banner_2.jpg",
    "/Image_02/hindu.jpg"
  ];

  useEffect(() => {
    const interval = setInterval(() => {
      setCurrentImageIndex((prevIndex) => (prevIndex + 1) % images.length);
    }, 4500);
    return () => clearInterval(interval);
  }, [images.length]);

  const handleLogin = async (e) => {
    if (e) e.preventDefault();
    if (!emailOrPhone || !password) {
      alert("Please enter both email/mobile and password.");
      return;
    }

    try {
      setIsLoading(true);
      const res = await fetch("/api/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ emailOrPhone, password }),
        credentials: "include",
      });
      const data = await res.json();

      if (res.ok) {
        setResponseMessage("Welcome " + (data.user?.first_name || data.user?.name || "Member"));
        if (data.user?.role === 'admin') {
          window.location.href = "/admin";
        } else {
          window.location.href = "/dashboard/myhome";
        }
      } else {
        alert("❌ " + (data.message || data.error || "Login failed"));
        setResponseMessage(data.message || data.error || "Login failed");
      }
    } catch (err) {
      console.error("Login failed:", err);
      setResponseMessage("Something went wrong.");
    } finally {
      setIsLoading(false);
    }
  };

  const handleFillAdmin = () => {
    setEmailOrPhone("admin@matrimony.com");
    setPassword("Admin@12345!");
  };

  const handleFillMember = () => {
    setEmailOrPhone("user@matrimony.com");
    setPassword("User@12345!");
  };

  return (
    <div
      className="login-wrapper d-flex align-items-center justify-content-center py-5 min-vh-100"
      style={{
        background: 'radial-gradient(circle at 10% 20%, #FFF1F2 0%, #FDF4F8 40%, #F5F3FF 100%)',
      }}
    >
      <Container>
        <Row className="justify-content-center">
          <Col md={11} lg={10} xl={9}>
            <div className="card glass-card border-0 shadow-lg overflow-hidden position-relative">
              <Row className="g-0">
                {/* Left Side: Illustration / Brand Panel */}
                <Col md={6} className="d-none d-md-block position-relative bg-light overflow-hidden">
                  {images.map((src, index) => (
                    <img
                      key={index}
                      src={src}
                      alt={`Wedding Celebration ${index + 1}`}
                      className="w-100 h-100 object-fit-cover position-absolute top-0 start-0"
                      style={{
                        minHeight: "560px",
                        objectPosition: "center",
                        opacity: currentImageIndex === index ? 1 : 0,
                        transition: "opacity 1.5s ease-in-out",
                        zIndex: 0,
                      }}
                    />
                  ))}

                  <div
                    className="position-absolute top-0 start-0 w-100 h-100"
                    style={{
                      background:
                        "linear-gradient(180deg, rgba(73, 11, 34, 0.4) 0%, rgba(45, 6, 21, 0.85) 100%)",
                      zIndex: 1,
                      pointerEvents: "none",
                    }}
                  ></div>

                  <div
                    className="position-absolute bottom-0 start-0 w-100 p-4 text-white text-center"
                    style={{ zIndex: 2 }}
                  >
                    <div className="badge bg-white bg-opacity-25 text-white mb-2 px-3 py-1 rounded-pill">
                      ❤️ 100% Verified Profiles
                    </div>
                    <h3 className="fw-bold mb-2 font-heading text-white">Find True Love & Commitment</h3>
                    <p className="mb-0 text-white-50 small">
                      Join thousands of couples who discovered their soulmates on MatriMoney.
                    </p>
                  </div>
                </Col>

                {/* Right Side: Login Form */}
                <Col md={6} className="p-4 p-lg-5 d-flex flex-column justify-content-center bg-white">
                  <div className="mb-4">
                    <div className="d-flex align-items-center gap-1 mb-2">
                      <span className="fw-bold fs-4" style={{ color: 'var(--brand-maroon, #580c29)' }}>Matri</span>
                      <span className="fw-bold fs-4" style={{ color: 'var(--brand-primary, #E33183)' }}>Money</span>
                    </div>
                    <h2 className="fw-bold text-dark font-heading mb-1">Welcome Back</h2>
                    <p className="text-muted small">Please enter your credentials to access your account.</p>
                  </div>

                  <Form onSubmit={handleLogin}>
                    <Form.Group className="mb-3" controlId="formEmailOrPhone">
                      <Form.Label className="small fw-bold text-uppercase text-secondary">Email or Phone Number</Form.Label>
                      <Form.Control
                        type="text"
                        className="form-control-lg bg-light border"
                        placeholder="e.g. user@email.com or 9876543210"
                        value={emailOrPhone}
                        onChange={(e) => setEmailOrPhone(e.target.value)}
                      />
                    </Form.Group>

                    <Form.Group className="mb-3" controlId="formPassword">
                      <div className="d-flex justify-content-between align-items-center mb-1">
                        <Form.Label className="small fw-bold text-uppercase text-secondary mb-0">Password</Form.Label>
                        <Link href="/matrimoney/forgot" className="small text-decoration-none text-danger fw-semibold">
                          Forgot Password?
                        </Link>
                      </div>
                      <InputGroup className="bg-light rounded-3 overflow-hidden border">
                        <Form.Control
                          type={passwordVisible ? "text" : "password"}
                          className="form-control-lg border-0 bg-transparent shadow-none"
                          placeholder="Your secret password"
                          value={password}
                          onChange={(e) => setPassword(e.target.value)}
                        />
                        <Button
                          variant="link"
                          className="text-muted border-0 text-decoration-none"
                          onClick={() => setPasswordVisible(!passwordVisible)}
                        >
                          {passwordVisible ? <AiFillEyeInvisible size={20} /> : <AiFillEye size={20} />}
                        </Button>
                      </InputGroup>
                    </Form.Group>

                    <Button
                      type="submit"
                      disabled={isLoading}
                      className="btn btn-primary w-100 py-3 mb-3 fw-bold shadow-sm"
                      style={{ fontSize: "1rem" }}
                    >
                      {isLoading ? (
                        <>
                          <span className="spinner-border spinner-border-sm me-2" role="status"></span>
                          Authenticating...
                        </>
                      ) : (
                        "Sign In to Your Account"
                      )}
                    </Button>
                  </Form>

                  {/* 1-Click Demo Login Box */}
                  <div className="p-3 rounded-3 bg-light border mb-4">
                    <small className="d-block fw-bold text-muted text-uppercase mb-2" style={{ fontSize: '0.7rem' }}>
                      ⚡ Quick 1-Click Demo Credentials:
                    </small>
                    <div className="d-flex gap-2">
                      <button
                        type="button"
                        onClick={handleFillAdmin}
                        className="btn btn-sm btn-outline-danger flex-grow-1 rounded-pill fw-semibold"
                        title="Fill admin credentials"
                      >
                        <i className="bi bi-shield-lock me-1"></i> Admin Demo
                      </button>
                      <button
                        type="button"
                        onClick={handleFillMember}
                        className="btn btn-sm btn-outline-secondary flex-grow-1 rounded-pill fw-semibold"
                        title="Fill member credentials"
                      >
                        <i className="bi bi-person me-1"></i> Member Demo
                      </button>
                    </div>
                  </div>

                  <div className="text-center">
                    <span className="text-muted small">Don't have an account yet? </span>
                    <Link href="/matrimoney/home" className="text-danger fw-bold text-decoration-none">
                      Register Free Here
                    </Link>
                  </div>
                </Col>
              </Row>
            </div>
          </Col>
        </Row>
      </Container>
    </div>
  );
}
