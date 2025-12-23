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
  const [currentImageIndex, setCurrentImageIndex] = useState(0);
  const router = useRouter();

  const images = [
    "/Image_02/login_illustration.jpg",
    "/Image_02/login_hands.jpg"
  ];

  useEffect(() => {
    const interval = setInterval(() => {
      setCurrentImageIndex((prevIndex) => (prevIndex + 1) % images.length);
    }, 4000); // Change image every 4 seconds
    return () => clearInterval(interval);
  }, []);

  const handleLogin = async () => {
    if (!emailOrPhone || !password) {
      alert("Please enter both email/mobile and password.");
      return;
    }

    try {
      const res = await fetch("/api/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ emailOrPhone, password }),
        credentials: "include",
      });
      const data = await res.json();

      if (res.ok) {
        setResponseMessage("Welcome " + data.user.first_name);
        window.location.href = "/dashboard/myhome";
      } else {
        alert("❌ " + (data.message || data.error || "Login failed"));
        setResponseMessage(data.message || data.error || "Login failed");
      }
    } catch (err) {
      console.error("Login failed:", err);
      setResponseMessage("Something went wrong.");
    }
  };

  return (
    <>
      <div className="login-wrapper d-flex align-items-center justify-content-center">
        <Container>
          <Row className="justify-content-center">
            <Col md={11} lg={10} xl={9}>
              <div className="bg-white rounded-5 shadow-lg overflow-hidden position-relative animate-card">
                <Row className="g-0">
                  {/* Left Side: Cartoon Illustration Slideshow */}
                  <Col md={6} className="d-none d-md-block position-relative bg-light animate-left overflow-hidden">
                    {images.map((src, index) => (
                      <img
                        key={index}
                        src={src}
                        alt={`Wedding Illustration ${index + 1}`}
                        className="w-100 h-100 object-fit-cover position-absolute top-0 start-0"
                        style={{
                          minHeight: "550px",
                          objectPosition: "center",
                          opacity: currentImageIndex === index ? 1 : 0,
                          transition: "opacity 1.5s ease-in-out",
                          zIndex: 0
                        }}
                      />
                    ))}

                    <div className="position-absolute top-0 start-0 w-100 h-100"
                      style={{ background: "linear-gradient(to bottom, rgba(139, 63, 91, 0.4), rgba(73, 11, 34, 0.8))", zIndex: 1, pointerEvents: 'none' }}></div>
                    <div className="position-absolute bottom-0 start-0 w-100 p-4 text-white text-center"
                      style={{ zIndex: 2 }}>
                      <h3 className="fw-bold mb-1">Welcome Back!</h3>
                      <p className="mb-0 opacity-90">Connect with your perfect match today.</p>
                    </div>
                  </Col>

                  {/* Right Side: Login Form */}
                  <Col md={6} className="p-5 d-flex flex-column justify-content-center animate-right">
                    <div className="mb-4">
                      <h2 className="fw-bold text-maroon mb-2">Member Login</h2>
                      <p className="text-muted">Login to connect with your perfect match!</p>
                    </div>

                    <Form>
                      <Form.Group className="mb-4" controlId="formEmailOrPhone">
                        <Form.Label className="small fw-bold text-uppercase text-secondary ls-1">Email or Phone</Form.Label>
                        <Form.Control
                          type="text"
                          className="form-control-lg border-0 bg-light-gray"
                          placeholder="Example: user@email.com"
                          value={emailOrPhone}
                          onChange={(e) => setEmailOrPhone(e.target.value)}
                        />
                      </Form.Group>

                      <Form.Group className="mb-4" controlId="formPassword">
                        <div className="d-flex justify-content-between align-items-center mb-1">
                          <Form.Label className="small fw-bold text-uppercase text-secondary ls-1 mb-0">Password</Form.Label>
                          <Link href="/matrimoney/forgot" className="small text-decoration-none text-primary fw-bold">
                            Forgot Password?
                          </Link>
                        </div>
                        <InputGroup className="bg-light-gray rounded-3 overflow-hidden">
                          <Form.Control
                            type={passwordVisible ? "text" : "password"}
                            className="form-control-lg border-0 bg-transparent shadow-none"
                            placeholder="Type your password"
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

                      <div className="d-grid gap-2 mt-4">
                        <Button
                          variant="primary"
                          size="lg"
                          onClick={handleLogin}
                          className="fw-bold text-uppercase btn-gradient py-3 rounded-3 border-0"
                          style={{ fontSize: '1rem', letterSpacing: '1px' }}
                        >
                          Log In
                        </Button>
                      </div>

                      <div className="d-flex align-items-center my-4">
                        <hr className="flex-grow-1 opacity-25" />
                        <span className="px-3 text-muted small">New to our platform?</span>
                        <hr className="flex-grow-1 opacity-25" />
                      </div>

                      <div className="d-grid">
                        <Link
                          href="/"
                          className="btn btn-outline-dark fw-bold py-2 rounded-3"
                        >
                          Create Free Account
                        </Link>
                      </div>

                      {responseMessage && (
                        <div className={`text-center mt-3 small fw-bold ${responseMessage.includes("Welcome") ? "text-success" : "text-danger"}`}>
                          {responseMessage}
                        </div>
                      )}
                    </Form>
                  </Col>
                </Row>
              </div>
            </Col>
          </Row>
        </Container>
      </div>

      <style jsx global>{`
        .login-wrapper {
          min-height: 100vh;
          background: #fdf2f7; 
          background-image: radial-gradient(#e3318310 2px, transparent 2px);
          background-size: 30px 30px;
          padding: 20px;
        }
        .text-maroon { color: #800020; }
        .bg-light-gray { background-color: #f0f2f5 !important; }
        .ls-1 { letter-spacing: 1px; }
        
        .form-control-lg {
          font-size: 0.95rem;
          padding: 0.75rem 1rem;
        }
        .form-control-lg:focus {
           box-shadow: none; 
           background-color: #e9ecef !important;
        }
        
        .btn-gradient {
           background: linear-gradient(90deg, #E33183, #800020);
           transition: opacity 0.3s;
        }
        .btn-gradient:hover {
           opacity: 0.9;
        }

        /* Animations */
        @keyframes fadeInUp {
          from { opacity: 0; transform: translateY(30px); }
          to { opacity: 1; transform: translateY(0); }
        }
        @keyframes fadeInScale {
          from { opacity: 0; transform: scale(0.95); }
          to { opacity: 1; transform: scale(1); }
        }
        
        .animate-card {
           animation: fadeInScale 0.8s cubic-bezier(0.22, 1, 0.36, 1) forwards;
        }
        .animate-left {
           opacity: 0;
           animation: fadeInUp 0.8s cubic-bezier(0.22, 1, 0.36, 1) 0.2s forwards;
        }
        .animate-right {
           opacity: 0;
           animation: fadeInUp 0.8s cubic-bezier(0.22, 1, 0.36, 1) 0.4s forwards;
        }
      `}</style>
    </>
  );
}
