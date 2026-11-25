"use client";

import React, { useEffect, useState } from "react";
import Link from "next/link";
import AuthShell from "@/app/components/AuthShell";

const RESEND_SECONDS = 60;

export default function ForgotPasswordPage() {
  const [email, setEmail] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [sentTo, setSentTo] = useState("");
  const [cooldown, setCooldown] = useState(0);

  useEffect(() => {
    if (cooldown <= 0) return;
    const t = setTimeout(() => setCooldown((c) => c - 1), 1000);
    return () => clearTimeout(t);
  }, [cooldown]);

  const request = async (address) => {
    setLoading(true);
    setError("");
    try {
      const res = await fetch("/api/forgot", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: address }),
      });
      const data = await res.json().catch(() => ({}));
      if (res.ok) {
        setSentTo(address.trim().toLowerCase());
        setCooldown(RESEND_SECONDS);
      } else if (res.status === 429) {
        setError(data.error || "Too many requests. Please wait a few minutes and try again.");
        if (data.retryAfter) setCooldown(Math.min(Number(data.retryAfter) || 0, 15 * 60));
      } else {
        setError(data.error || "We couldn't send the reset link. Please try again.");
      }
    } catch {
      setError("Network problem — please check your connection and try again.");
    } finally {
      setLoading(false);
    }
  };

  const onSubmit = (e) => {
    e.preventDefault();
    if (!email.trim()) return;
    request(email);
  };

  const mmss = (s) => `${Math.floor(s / 60)}:${String(s % 60).padStart(2, "0")}`;

  return (
    <AuthShell artTitle="We'll Help You Back In" artText="Reset your password securely and continue your search for a life partner.">
      <ol className="rp-steps" aria-label="Password reset steps">
        <li className={sentTo ? "done" : "active"}><span>1</span>Your email</li>
        <li className={sentTo ? "active" : ""}><span>2</span>Check inbox</li>
        <li><span>3</span>New password</li>
      </ol>

      {!sentTo ? (
        <div className="rp-fade" key="form">
          <span className="eyebrow mb-2">Account Recovery</span>
          <h2 className="mb-1" style={{ fontSize: "2.4rem" }}>Forgot Password?</h2>
          <p className="text-muted small mb-4">
            No worries — enter the email you registered with and we&apos;ll send you a secure, one-time reset link.
          </p>

          {error && <div className="rp-alert error" role="alert"><i className="bi bi-exclamation-circle" /> {error}</div>}

          <form onSubmit={onSubmit} noValidate>
            <label className="form-label" htmlFor="forgot-email">Email address</label>
            <div className="input-group mb-4">
              <span className="input-group-text"><i className="bi bi-envelope" /></span>
              <input id="forgot-email" type="email" className="form-control" placeholder="you@example.com"
                value={email} onChange={(e) => setEmail(e.target.value)} required autoComplete="email" autoFocus />
            </div>
            <button type="submit" className="btn btn-primary w-100 py-3" disabled={loading || !email.trim() || cooldown > 0}>
              {loading ? <><span className="spinner-border spinner-border-sm me-2" /> Sending…</>
                : cooldown > 0 ? `Try again in ${mmss(cooldown)}` : <>Send reset link <i className="bi bi-arrow-right ms-1" /></>}
            </button>
          </form>

          <div className="rp-note mt-4">
            <i className="bi bi-shield-lock" />
            <span>For your safety the link works <strong>once</strong> and expires in <strong>30 minutes</strong>. We never ask for your password by phone or email.</span>
          </div>
        </div>
      ) : (
        <div className="rp-fade text-center" key="sent">
          <div className="rp-hero-icon"><i className="bi bi-envelope-paper-heart" /></div>
          <h2 className="mb-1" style={{ fontSize: "2.2rem" }}>Check your inbox</h2>
          <p className="text-muted small mb-1">If an account exists for</p>
          <p className="fw-semibold mb-3" style={{ color: "var(--maroon-900)", wordBreak: "break-all" }}>{sentTo}</p>
          <p className="text-muted small mb-4">you&apos;ll receive a link to set a new password. It expires in 30 minutes.</p>

          {error && <div className="rp-alert error text-start" role="alert"><i className="bi bi-exclamation-circle" /> {error}</div>}

          <ul className="rp-tips text-start">
            <li><i className="bi bi-inbox" /> Look in <strong>Spam</strong> or <strong>Promotions</strong> if it isn&apos;t in your inbox.</li>
            <li><i className="bi bi-clock-history" /> Emails can take a minute or two to arrive.</li>
            <li><i className="bi bi-link-45deg" /> Only the newest link works — older ones stop after you reset.</li>
          </ul>

          <button type="button" className="btn btn-outline-primary w-100 py-2 mb-2" disabled={loading || cooldown > 0} onClick={() => request(sentTo)}>
            {loading ? <><span className="spinner-border spinner-border-sm me-2" /> Sending…</>
              : cooldown > 0 ? <>Resend link in {mmss(cooldown)}</> : <><i className="bi bi-arrow-repeat me-1" /> Resend link</>}
          </button>
          <button type="button" className="btn btn-link small text-muted" onClick={() => { setSentTo(""); setError(""); setCooldown(0); }}>
            Use a different email
          </button>
        </div>
      )}

      <div className="text-center small mt-3">
        <Link href="/matrimoney/login" className="text-danger fw-semibold"><i className="bi bi-arrow-left me-1" /> Back to login</Link>
        <span className="text-muted mx-2">·</span>
        <Link href="/matrimoney/contactus" className="text-muted">Need help?</Link>
      </div>
    </AuthShell>
  );
}
