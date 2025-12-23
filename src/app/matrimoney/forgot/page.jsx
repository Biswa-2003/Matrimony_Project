// ✅ File: app/forgot/page.jsx
"use client";
import React, { useState } from "react";
import { Container, Form, Button, Card } from "react-bootstrap";
import "bootstrap/dist/css/bootstrap.min.css";

export default function ForgotPasswordPage() {
  const [email, setEmail] = useState("");

  const handleSubmit = async (e) => {
    e.preventDefault();                                                          

    try {
      const res = await fetch("/api/forgot", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email }),
      });

      const data = await res.json();
      if (res.ok) {
        alert("✅ Reset link sent to your email.");
      } else {
        alert("❌ " + (data.error || "Failed to send reset link."));
      }
    } catch (err) {
      console.error("Request failed:", err);
      alert("❌ Something went wrong.");
    }
  };

  return (
    <Container className="d-flex justify-content-center align-items-center" style={{ minHeight: "100vh" }}>
      <Card style={{ width: "100%", maxWidth: "400px", padding: "2rem", border: "1px solid #ddd", backgroundColor: "#f8f9fa" }}>
        <h5 className="text-center mb-4">Forgot Password ?</h5>
        <Form onSubmit={handleSubmit}>
          <Form.Group className="mb-3">
            <Form.Control
              type="email"
              placeholder="Please enter your email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
            />
          </Form.Group>
          <Button
            type="submit"
            className="w-100"
            style={{
              backgroundColor: "#8c1c24",
              border: "none",
              borderRadius: "8px",
              fontWeight: "bold",
            }}
          >
            SUBMIT
          </Button>
        </Form>
      </Card>
    </Container>
  );
}
