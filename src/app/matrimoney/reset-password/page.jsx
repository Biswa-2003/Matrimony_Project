"use client";
import React, { useState } from "react";
import { useSearchParams, useRouter } from "next/navigation";
import { Container, Card, Form, Button } from "react-bootstrap";
import "bootstrap/dist/css/bootstrap.min.css";

export default function ResetPasswordPage() {
  const searchParams = useSearchParams();
  const token = searchParams.get("token");
  const router = useRouter();

  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (password !== confirmPassword) {
      alert("Passwords do not match.");
      return;
    }

    try {
      const res = await fetch("/api/reset-password", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ token, password }),
      });

      const data = await res.json();
      if (res.ok) {
        alert("✅ Password updated successfully!");
        router.push("/login");
      } else {
        alert("❌ " + (data.error || "Failed to reset password."));
      }
    } catch (err) {
      console.error("Reset error:", err);
      alert("❌ Something went wrong.");
    }
  };

  return (
    <Container className="d-flex justify-content-center align-items-center" style={{ minHeight: "100vh" }}>
      <Card style={{ width: "100%", maxWidth: "400px", padding: "2rem", backgroundColor: "#f8f9fa" }}>
        <h5 className="text-center mb-4">Reset Password</h5>
        <Form onSubmit={handleSubmit}>
          <Form.Group className="mb-3">
            <Form.Control
              type="password"
              placeholder="Password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
            />
          </Form.Group>
          <Form.Group className="mb-4">
            <Form.Control
              type="password"
              placeholder="Confirm Password"
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
              required
            />
          </Form.Group>
          <Button
            type="submit"
            className="w-100"
            style={{ backgroundColor: "#8c1c24", border: "none", borderRadius: "8px", fontWeight: "bold" }}
          >
            SUBMIT
          </Button>
        </Form>
      </Card>
    </Container>
  );
}
