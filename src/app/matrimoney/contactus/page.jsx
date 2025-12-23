'use client';

import React, { useState } from 'react';
import 'bootstrap/dist/css/bootstrap.min.css';
import DashNav from '@/app/components/dashnav';
import { Container, Row, Col, Card, Form, Alert } from 'react-bootstrap';
import { BsTelephoneFill, BsEnvelopeFill, BsGeoAltFill, BsSendFill, BsChatQuoteFill } from 'react-icons/bs';

export default function ContactUsPage() {
  const [formData, setFormData] = useState({
    name: '',
    subject: '',
    mobile: '',
    email: '',
    message: '',
    captcha: ''
  });

  // Simple static captcha for demo
  const [captchaChallenge] = useState({ question: "What is 5 + 3?", answer: "8" });

  const [status, setStatus] = useState({ type: '', msg: '' });
  const [loading, setLoading] = useState(false);

  const handleChange = (e) => {
    setFormData({ ...formData, [e.target.name]: e.target.value });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setStatus({ type: '', msg: '' });

    if (formData.captcha !== captchaChallenge.answer) {
      setStatus({ type: 'danger', msg: 'Incorrect verification code.' });
      return;
    }

    setLoading(true);

    try {
      const res = await fetch('/api/contact', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(formData)
      });

      const data = await res.json();

      if (res.ok) {
        setStatus({ type: 'success', msg: 'Your message has been sent successfully. We will get back to you soon!' });
        setFormData({ name: '', subject: '', mobile: '', email: '', message: '', captcha: '' });
      } else {
        setStatus({ type: 'danger', msg: data.error || 'Failed to send message.' });
      }
    } catch (err) {
      setStatus({ type: 'danger', msg: 'Something went wrong. Please try again later.' });
    } finally {
      setLoading(false);
    }
  };

  return (
    <>
      {/* Spacer removed (layout handles it) */}

      <div className="page-surface">
        {/* Header */}
        <div className="header-section text-center text-white mb-5 position-relative">
          <div className="container py-5 position-relative z-1">
            <div className="d-inline-flex align-items-center justify-content-center p-3 rounded-circle bg-white bg-opacity-10 mb-3 backdrop-blur shadow-sm">
              <BsChatQuoteFill size="2.5rem" className="text-white" />
            </div>
            <h1 className="fw-bold mb-3 display-5">Get in Touch</h1>
            <p className="lead mb-0 opacity-90 mx-auto" style={{ maxWidth: 600 }}>
              Have questions or feedback? We'd love to hear from you. Our team is here to assist you 24/7.
            </p>
          </div>
        </div>

        <div className="container pb-5" style={{ marginTop: '-80px' }}>
          <Row className="justify-content-center g-4">
            {/* Contact Cards */}
            <Col md={4} className="order-md-2">
              <div className="d-flex flex-column gap-3">
                <Card className="border-0 shadow-sm rounded-4 p-4 hover-lift">
                  <div className="d-flex align-items-center gap-3 mb-2">
                    <div className="icon-box bg-primary-subtle text-primary rounded-circle">
                      <BsTelephoneFill />
                    </div>
                    <h6 className="fw-bold mb-0 text-dark">Call Us</h6>
                  </div>
                  <p className="text-muted ms-5 mb-0">+91 99999 99999</p>
                </Card>

                <Card className="border-0 shadow-sm rounded-4 p-4 hover-lift">
                  <div className="d-flex align-items-center gap-3 mb-2">
                    <div className="icon-box bg-danger-subtle text-danger rounded-circle">
                      <BsEnvelopeFill />
                    </div>
                    <h6 className="fw-bold mb-0 text-dark">Email Us</h6>
                  </div>
                  <p className="text-muted ms-5 mb-0">support@matrimony.com</p>
                </Card>

                <Card className="border-0 shadow-sm rounded-4 p-4 hover-lift">
                  <div className="d-flex align-items-center gap-3 mb-2">
                    <div className="icon-box bg-success-subtle text-success rounded-circle">
                      <BsGeoAltFill />
                    </div>
                    <h6 className="fw-bold mb-0 text-dark">Visit Us</h6>
                  </div>
                  <p className="text-muted ms-5 mb-0">Bhubaneswar, Odisha, India</p>
                </Card>
              </div>
            </Col>

            {/* Contact Form */}
            <Col md={8} lg={7} className="order-md-1">
              <Card className="p-4 p-md-5 shadow-lg border-0 rounded-4 fade-in-up">
                <div className="mb-4">
                  <h3 className="fw-bold text-maroon mb-1">Send us a Message</h3>
                  <p className="text-muted">Fill out the form below and we'll get back to you shortly.</p>
                </div>

                {status.msg && (
                  <Alert variant={status.type} onClose={() => setStatus({ type: '', msg: '' })} dismissible className="rounded-3 shadow-sm border-0 mb-4">
                    {status.msg}
                  </Alert>
                )}

                <Form onSubmit={handleSubmit}>
                  <Row className="g-3">
                    <Col md={6}>
                      <Form.Group>
                        <Form.Label className="small fw-bold text-muted text-uppercase">Full Name</Form.Label>
                        <Form.Control
                          type="text"
                          name="name"
                          value={formData.name}
                          onChange={handleChange}
                          placeholder="e.g. John Doe"
                          className="form-control-lg fs-6 bg-light border-0"
                          required
                        />
                      </Form.Group>
                    </Col>
                    <Col md={6}>
                      <Form.Group>
                        <Form.Label className="small fw-bold text-muted text-uppercase">Mobile Number</Form.Label>
                        <Form.Control
                          type="tel"
                          name="mobile"
                          value={formData.mobile}
                          onChange={handleChange}
                          placeholder="e.g. +91 90000 00000"
                          className="form-control-lg fs-6 bg-light border-0"
                          required
                        />
                      </Form.Group>
                    </Col>
                    <Col md={6}>
                      <Form.Group>
                        <Form.Label className="small fw-bold text-muted text-uppercase">Email Address</Form.Label>
                        <Form.Control
                          type="email"
                          name="email"
                          value={formData.email}
                          onChange={handleChange}
                          placeholder="name@example.com"
                          className="form-control-lg fs-6 bg-light border-0"
                          required
                        />
                      </Form.Group>
                    </Col>
                    <Col md={6}>
                      <Form.Group>
                        <Form.Label className="small fw-bold text-muted text-uppercase">Subject</Form.Label>
                        <Form.Control
                          type="text"
                          name="subject"
                          value={formData.subject}
                          onChange={handleChange}
                          placeholder="Inquiry about..."
                          className="form-control-lg fs-6 bg-light border-0"
                          required
                        />
                      </Form.Group>
                    </Col>

                    <Col md={12}>
                      <Form.Group>
                        <Form.Label className="small fw-bold text-muted text-uppercase">Message</Form.Label>
                        <Form.Control
                          as="textarea"
                          rows={4}
                          name="message"
                          value={formData.message}
                          onChange={handleChange}
                          placeholder="How can we help you?"
                          className="form-control-lg fs-6 bg-light border-0"
                          required
                        />
                      </Form.Group>
                    </Col>

                    <Col md={12}>
                      <Form.Group>
                        <Form.Label className="small fw-bold text-muted text-uppercase">Security Check</Form.Label>
                        <div className="d-flex align-items-center gap-3">
                          <div className="bg-light px-3 py-2 rounded-3 border fw-bold text-dark user-select-none">
                            {captchaChallenge.question} = ?
                          </div>
                          <Form.Control
                            type="text"
                            name="captcha"
                            value={formData.captcha}
                            onChange={handleChange}
                            placeholder="Answer"
                            className="form-control-lg fs-6 bg-light border-0"
                            style={{ maxWidth: 150 }}
                            required
                          />
                        </div>
                      </Form.Group>
                    </Col>

                    <Col xs={12} className="mt-4">
                      <button
                        type="submit"
                        className="btn btn-primary w-100 py-3 rounded-pill fw-bold shadow-sm d-flex align-items-center justify-content-center gap-2"
                        disabled={loading}
                      >
                        {loading ? (
                          <>
                            <span className="spinner-border spinner-border-sm" role="status" aria-hidden="true"></span>
                            Sending...
                          </>
                        ) : (
                          <>
                            <BsSendFill /> Send Message
                          </>
                        )}

                      </button>
                    </Col>
                  </Row>
                </Form>
              </Card>
            </Col>
          </Row>
        </div>
      </div>

      <style jsx global>{`
        .page-surface {
            background-color: #f4f7fa;
            min-height: 100vh;
        }
        .header-section {
            background: linear-gradient(135deg, var(--brand-maroon) 0%, #a01040 100%);
            border-bottom-left-radius: 50px;
            border-bottom-right-radius: 50px;
            padding-bottom: 6rem;
        }
        .text-maroon { color: var(--brand-maroon, #800020) !important; }
        .backdrop-blur { backdrop-filter: blur(8px); }
        
        .form-control:focus {
            background-color: #fff !important;
            border: 1px solid var(--brand-primary) !important;
            box-shadow: 0 0 0 0.2rem rgba(227, 49, 131, 0.1) !important;
        }
        
        .icon-box {
            width: 40px;
            height: 40px;
            display: flex;
            align-items: center;
            justify-content: center;
            font-size: 1.2rem;
        }
        
        .hover-lift {
            transition: transform 0.2s ease, box-shadow 0.2s ease;
        }
        .hover-lift:hover {
            transform: translateY(-5px);
            box-shadow: 0 10px 20px rgba(0,0,0,0.08) !important;
        }
        
        @keyframes fadeInUp {
            from { opacity: 0; transform: translateY(20px); }
            to { opacity: 1; transform: translateY(0); }
        }
        .fade-in-up {
            animation: fadeInUp 0.5s ease-out forwards;
        }
      `}</style>
    </>
  );
}
