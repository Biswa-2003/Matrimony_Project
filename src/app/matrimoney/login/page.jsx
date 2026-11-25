'use client';

import React, { useState, useEffect } from "react";
import Link from "next/link";
import { AiFillEye, AiFillEyeInvisible } from "react-icons/ai";
import AuthShell from "@/app/components/AuthShell";

import { useI18n } from "@/lib/i18n/LanguageProvider";
// Demo credential shortcuts are only shown in development, or when explicitly enabled
// for a staging/demo deployment via NEXT_PUBLIC_SHOW_DEMO_LOGIN=true. Never in production by default.
const SHOW_DEMO_LOGIN =
  process.env.NODE_ENV !== "production" || process.env.NEXT_PUBLIC_SHOW_DEMO_LOGIN === "true";

// Folded to `null` at build time when demo login is off, so the strings never ship to the browser.
const DEMO_ACCOUNTS = SHOW_DEMO_LOGIN
  ? {
      admin: { id: "admin@matrimony.com", password: "Admin@12345!" },
      member: { id: "user@matrimony.com", password: "User@12345!" },
    }
  : null;

export default function LoginPage() {
  const { t } = useI18n();
  const [emailOrPhone, setEmailOrPhone] = useState("");
  const [password, setPassword] = useState("");
  const [passwordVisible, setPasswordVisible] = useState(false);
  const [status, setStatus] = useState({ type: "", text: "" });
  const [isLoading, setIsLoading] = useState(false);
  // "member" or "admin" - same sign-in, but the admin tab only lets admin accounts through
  const [mode, setMode] = useState("member");
  const isAdmin = mode === "admin";

  const switchMode = (next) => {
    setMode(next);
    setStatus({ type: "", text: "" });
    const url = new URL(window.location.href);
    if (next === "admin") url.searchParams.set("as", "admin");
    else url.searchParams.delete("as");
    window.history.replaceState(null, "", url);
  };

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    if (params.get("as") === "admin") setMode("admin");
    if (params.get("registered") === "true") {
      setStatus({ type: "success", text: "Welcome to MatriMoney! Your profile is ready — please sign in." });
    } else if (params.get("reset") === "true") {
      setStatus({ type: "success", text: "Your password has been updated. Please sign in with the new password." });
    }
  }, []);

  const handleLogin = async (e) => {
    e?.preventDefault();
    if (!emailOrPhone || !password) {
      setStatus({ type: "error", text: "Please enter both your email/mobile and password." });
      return;
    }
    try {
      setIsLoading(true);
      setStatus({ type: "", text: "" });
      const res = await fetch("/api/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ emailOrPhone, password }),
        credentials: "include",
      });
      const data = await res.json();
      const accountIsAdmin = data.user?.role === "admin";
      if (res.ok && isAdmin !== accountIsAdmin) {
        // wrong tab for this account (member on Admin, or admin on Member): don't leave it signed in
        await fetch("/api/logout", { method: "POST", credentials: "include" }).catch(() => {});
        setStatus({ type: "error", text: t(isAdmin ? "login.notAdmin" : "login.isAdmin") });
      } else if (res.ok) {
        setStatus({ type: "success", text: `Welcome back, ${data.user?.first_name || data.user?.name || "Member"}…` });
        window.location.href = accountIsAdmin
          ? "/admin"
          : data.user?.must_change_password
            ? "/dashboard/profile-setting?tab=password&must=1" // signed in with a temporary password from support
            : "/dashboard/myhome";
      } else {
        setStatus({ type: "error", text: data.message || data.error || "Login failed. Please check your details." });
      }
    } catch {
      setStatus({ type: "error", text: "Something went wrong. Please try again." });
    } finally {
      setIsLoading(false);
    }
  };

  const fillDemo = (kind) => {
    const acct = DEMO_ACCOUNTS?.[kind];
    if (!acct) return;
    setEmailOrPhone(acct.id);
    setPassword(acct.password);
  };

  return (
    <AuthShell
      artTitle="Find Love That Honours Tradition"
      artText="Thousands of families have found their perfect match on MatriMoney. Yours could be next."
    >
      <div className="login-switch mb-4" role="tablist" aria-label="Sign in as">
        <button
          type="button"
          role="tab"
          aria-selected={!isAdmin}
          className={`login-switch-btn ${!isAdmin ? "active" : ""}`}
          onClick={() => switchMode("member")}
        >
          <i className="bi bi-person-heart" /> {t("login.asMember")}
        </button>
        <button
          type="button"
          role="tab"
          aria-selected={isAdmin}
          className={`login-switch-btn ${isAdmin ? "active" : ""}`}
          onClick={() => switchMode("admin")}
        >
          <i className="bi bi-shield-lock" /> {t("login.asAdmin")}
        </button>
      </div>

      <span className="eyebrow mb-2">{t(isAdmin ? "login.adminEyebrow" : "login.eyebrow")}</span>
      <h2 className="mb-1" style={{ fontSize: "2.4rem" }}>{t(isAdmin ? "login.adminTitle" : "login.title")}</h2>
      <p className="text-muted small mb-4">{t(isAdmin ? "login.adminSub" : "login.sub")}</p>

      {status.text && (
        <div className={`alert ${status.type === "error" ? "alert-danger" : "alert-success"} py-2 small d-flex gap-2 align-items-center`} role="alert">
          <i className={`bi ${status.type === "error" ? "bi-exclamation-circle" : "bi-check-circle"}`} />
          {status.text}
        </div>
      )}

      <form onSubmit={handleLogin} noValidate>
        <div className="mb-3">
          <label className="form-label" htmlFor="login-id">{t(isAdmin ? "login.adminId" : "login.id")}</label>
          <div className="input-group">
            <span className="input-group-text"><i className={`bi ${isAdmin ? "bi-shield-lock" : "bi-person"}`} /></span>
            <input
              id="login-id"
              type="text"
              className="form-control"
              placeholder={isAdmin ? "admin@yourdomain.com" : "you@example.com or 9876543210"}
              value={emailOrPhone}
              onChange={(e) => setEmailOrPhone(e.target.value)}
              autoComplete="username"
            />
          </div>
        </div>

        <div className="mb-2">
          <div className="d-flex justify-content-between align-items-center">
            <label className="form-label" htmlFor="login-pass">{t("login.password")}</label>
            <Link href="/matrimoney/forgot" className="small text-danger fw-medium mb-2">{t("login.forgot")}</Link>
          </div>
          <div className="input-group">
            <span className="input-group-text"><i className="bi bi-lock" /></span>
            <input
              id="login-pass"
              type={passwordVisible ? "text" : "password"}
              className="form-control"
              placeholder="Your password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              autoComplete="current-password"
            />
            <button
              type="button"
              className="btn btn-outline-secondary"
              onClick={() => setPasswordVisible(!passwordVisible)}
              aria-label={passwordVisible ? "Hide password" : "Show password"}
            >
              {passwordVisible ? <AiFillEyeInvisible size={18} /> : <AiFillEye size={18} />}
            </button>
          </div>
        </div>

        <button type="submit" disabled={isLoading} className={`btn w-100 py-3 mt-3 mb-3 ${isAdmin ? "btn-dark" : "btn-primary"}`}>
          {isLoading ? (
            <><span className="spinner-border spinner-border-sm me-2" role="status" /> {t("login.signingIn")}</>
          ) : (
            <>{t(isAdmin ? "login.adminSubmit" : "login.submit")} <i className="bi bi-arrow-right ms-1" /></>
          )}
        </button>
      </form>

      {SHOW_DEMO_LOGIN && (
        <div className="p-3 rounded-4 mb-3" style={{ background: "var(--gold-pale)", border: "1px dashed var(--gold)" }}>
          <small className="d-block fw-semibold text-maroon mb-2" style={{ fontSize: "0.72rem", letterSpacing: ".08em" }}>
            <i className="bi bi-lightning-charge-fill me-1" /> DEMO ACCOUNTS (development only)
          </small>
          <div className="d-flex gap-2">
            <button type="button" onClick={() => fillDemo("admin")} className="btn btn-sm btn-outline-danger flex-grow-1">
              <i className="bi bi-shield-lock me-1" /> Admin
            </button>
            <button type="button" onClick={() => fillDemo("member")} className="btn btn-sm btn-outline-secondary flex-grow-1">
              <i className="bi bi-person me-1" /> Member
            </button>
          </div>
        </div>
      )}

      {isAdmin ? (
        <p className="text-center small text-muted mb-0">
          <i className="bi bi-info-circle me-1" /> {t("login.adminNote")}
        </p>
      ) : (
        <div className="text-center small">
          <span className="text-muted">{t("login.new")} </span>
          <Link href="/#join" className="text-danger fw-semibold">{t("login.create")}</Link>
        </div>
      )}
    </AuthShell>
  );
}
