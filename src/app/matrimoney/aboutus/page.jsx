'use client';

import React from 'react';
import 'bootstrap/dist/css/bootstrap.min.css';
import { Container, Row, Col, Card, Button, Badge } from 'react-bootstrap';

const AboutPage = () => {
  return (
    <>
      {/* Hero Section */}
      <section className="hero py-5 py-md-6 text-white">
        <Container>
          <Row className="align-items-center g-4">
            <Col md={7}>
              <h1 className="display-5 fw-bold mb-3">We help busy professionals find the right life partner</h1>
              <p className="lead opacity-90 mb-4">
                Indian Matrimony is built for intent. Verified profiles, privacy-first design, and a clean experience that respects your time.
              </p>
              <div className="d-flex gap-3 flex-wrap">
                <Button variant="light" className="px-4 py-2 fw-semibold shadow-sm">Explore Profiles</Button>
                <Button variant="outline-light" className="px-4 py-2 fw-semibold">Create Your Profile</Button>
              </div>
            </Col>
            <Col md={5} className="text-md-end">
              <div className="hero-card p-4 rounded-4 shadow-lg bg-white text-dark">
                <h5 className="mb-2">Why choose us?</h5>
                <ul className="mb-0 small lh-lg ps-3">
                  <li>Only for serious matrimonial matches, not dating</li>
                  <li>Smart filters to discover compatible matches faster</li>
                  <li>Secure messaging and contact sharing controls</li>
                </ul>
              </div>
            </Col>
          </Row>
        </Container>
      </section>

      {/* Highlights */}
      <section className="py-5">
        <Container>
          <Row className="g-4">
            <Col md={4}>
              <Card className="h-100 border-0 shadow-sm rounded-4">
                <Card.Body>
                  <Badge bg="info" className="rounded-pill mb-3">Verified</Badge>
                  <Card.Title className="h5">Verified Profiles</Card.Title>
                  <Card.Text className="text-secondary">
                    Every profile goes through checks to reduce spam and keep the community authentic.
                  </Card.Text>
                </Card.Body>
              </Card>
            </Col>
            <Col md={4}>
              <Card className="h-100 border-0 shadow-sm rounded-4">
                <Card.Body>
                  <Badge bg="primary" className="rounded-pill mb-3">Private</Badge>
                  <Card.Title className="h5">Privacy‑first</Card.Title>
                  <Card.Text className="text-secondary">
                    You control what to show and when to share contact details. Safety comes first.
                  </Card.Text>
                </Card.Body>
              </Card>
            </Col>
            <Col md={4}>
              <Card className="h-100 border-0 shadow-sm rounded-4">
                <Card.Body>
                  <Badge bg="warning" text="dark" className="rounded-pill mb-3">Smart</Badge>
                  <Card.Title className="h5">Better Matches</Card.Title>
                  <Card.Text className="text-secondary">
                    Our matching considers preferences that actually matter for long‑term compatibility.
                  </Card.Text>
                </Card.Body>
              </Card>
            </Col>
          </Row>
        </Container>
      </section>

      {/* About Section */}
      <section className="py-5 bg-light">
        <Container>
          <Row className="g-4 align-items-center">
            <Col lg={6}>
              <h2 className="h3 fw-bold mb-3">About Us</h2>
              <p className="mb-3">
                An online matrimony service focused on helping professionals meet suitable brides and grooms.
                Discover profiles that match your values and lifestyle, chat securely, and take the next step with confidence.
              </p>
              <p className="mb-4">
                The services provided here are strictly for matrimonial purposes. It is not a dating platform.
              </p>
              <div className="d-flex gap-3">
                <Button variant="primary" className="px-4">Get Started</Button>
                <Button variant="outline-secondary" className="px-4">Contact Support</Button>
              </div>
            </Col>
            <Col lg={6}>
              <div className="preview-card rounded-4 shadow-sm p-4 bg-white">
                <div className="d-flex flex-column gap-3">
                  <div className="d-flex justify-content-between">
                    <span className="small text-secondary">Active Members</span>
                    <span className="fw-semibold">10,000+</span>
                  </div>
                  <div className="d-flex justify-content-between">
                    <span className="small text-secondary">Verified Photos</span>
                    <span className="fw-semibold">50,000+</span>
                  </div>
                  <div className="d-flex justify-content-between">
                    <span className="small text-secondary">Successful Matches</span>
                    <span className="fw-semibold">Growing daily</span>
                  </div>
                </div>
              </div>
            </Col>
          </Row>
        </Container>
      </section>

      {/* CTA */}
      <section className="py-5 py-md-6">
        <Container>
          <div className="cta d-flex flex-column flex-md-row align-items-center justify-content-between p-4 p-md-5 rounded-4 shadow-sm">
            <div className="mb-3 mb-md-0">
              <h3 className="h4 mb-1">Ready to begin?</h3>
              <p className="mb-0 text-secondary">Create a profile in minutes and start discovering matches.</p>
            </div>
            <Button variant="primary" size="lg" className="px-4">Join Now</Button>
          </div>
        </Container>
      </section>

      <style jsx global>{`
        .py-md-6 { padding-top: 5rem; padding-bottom: 5rem; }
        .hero {
          background-color: var(--brand-maroon);
          /* Optional: Add a subtle pattern overlay if matches design */
        }
        .hero .hero-card { max-width: 420px; margin-left: auto; }
        .step-circle {
          width: 40px; height: 40px; border-radius: 50%;
          display: flex; align-items: center; justify-content: center;
          background: var(--brand-bg-light); color: var(--brand-maroon); font-weight: 700;
        }
        .cta { background: var(--brand-bg-light); }
        .preview-card { min-height: 180px; }
        /* Using global btn-primary styles now */
        .badge-info { background-color: var(--brand-primary); }
      `}</style>
    </>
  );
};

export default AboutPage;
