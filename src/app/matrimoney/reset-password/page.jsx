"use client";

import React, { Suspense, useEffect, useState } from "react";
import Link from "next/link";
import { useSearchParams, useRouter } from "next/navigation";
import AuthShell from "@/app/components/AuthShell";
import PasswordChecklist, { PASSWORD_RULES, isStrongPassword } from "@/app/components/PasswordChecklist";

const LEVELS = ["Too weak", "Weak", "Fair", "Good", "Strong", "Excellent"];

function strength(p) {
  if (!p) return 0;
  const passed = PASSWORD_RULES.filter((r) => r.test(p)).length; // 0..5
  if (passed < 5 || /\s/.test(p)) return Math.min(passed, 2); // not acceptable yet → at most "Fair"
  return p.length >= 14 ? 5 : p.length >= 12 ? 4 : 3;
}

function PasswordField({ id, label, value, onChange, show, onToggle, autoFocus, invalid }) {
  return (
    <>
      <label className="form-label" htmlFor={id}>{label}</label>
      <div className={`input-group rp-pass ${invalid ? "is-invalid" : ""}`}>
        <span className="input-group-text"><i className="bi bi-lock" /></span>
        <input id={id} type={show ? "text" : "password"} className="form-control" value={value}
          onChange={onChange} required autoComplete="new-password" autoFocus={autoFocus} maxLength={72} />
        <button type="button" className="input-group-text rp-eye" onClick={onToggle} aria-label={show ? "Hide password" : "Show password"}>
          <i className={`bi ${show ? "bi-eye-slash" : "bi-eye"}`} />
        </button>
      </div>
    </>
  );
}

function ResetPasswordForm() {
  const params = useSearchParams();
  const token = params.get("token");
  const router = useRouter();

  const [phase, setPhase] = useState("checking"); // checking | invalid | form | done
  const [linkError, setLinkError] = useState({ reason: "", text: "" });
  const [maskedEmail, setMaskedEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [show, setShow] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [countdown, setCountdown] = useState(5);

  // validate the link first, so an expired link is explained before anyone types
  useEffect(() => {
    if (!token) {
      setLinkError({ reason: "invalid", text: "This page needs the link from your reset email." });
      setPhase("invalid");
      return;
    }
    let alive = true;
    fetch("/api/reset-password", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ token, check: true }),
    })
      .then(async (r) => ({ ok: r.ok, status: r.status, j: await r.json().catch(() => ({})) }))
      .then(({ ok, status, j }) => {
        if (!alive) return;
        if (ok && j.valid) { setMaskedEmail(j.email || ""); setPhase("form"); }
        else if (status === 429) { setLinkError({ reason: "busy", text: j.error }); setPhase("invalid"); }
        else { setLinkError({ reason: j.reason || "invalid", text: j.error || "This reset link is not valid." }); setPhase("invalid"); }
      })
      .catch(() => alive && (setLinkError({ reason: "network", text: "We couldn't check your link. Please check your connection and reload." }), setPhase("invalid")));
    return () => { alive = false; };
  }, [token]);

  useEffect(() => {
    if (phase !== "done") return;
    if (countdown <= 0) { router.push("/matrimoney/login?reset=true"); return; }
    const t = setTimeout(() => setCountdown((c) => c - 1), 1000);
    return () => clearTimeout(t);
  }, [phase, countdown, router]);

  const score = strength(password);
  const matches = confirm.length > 0 && confirm === password;
  const canSubmit = isStrongPassword(password) && matches && !loading;

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError("");
    if (!isStrongPassword(password)) return setError("Please choose a password that meets all the rules below.");
    if (password !== confirm) return setError("Passwords do not match.");
    setLoading(true);
    try {
      const res = await fetch("/api/reset-password", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ token, password, confirmPassword: confirm }),
      });
      const data = await res.json().catch(() => ({}));
      if (res.ok) setPhase("done");
      else if (data.valid === false) { setLinkError({ reason: data.reason, text: data.error }); setPhase("invalid"); }
      else setError(data.error || "Something went wrong. Please try again.");
    } catch {
      setError("Network problem — please try again.");
    } finally {
      setLoading(false);
    }
  };

  if (phase === "checking") {
    return (
      <div className="text-center py-5 rp-fade">
        <span className="spinner-border" style={{ color: "var(--gold-dark)" }} />
        <p className="text-muted small mt-3 mb-0">Checking your reset link…</p>
      </div>
    );
  }

  if (phase === "invalid") {
    const expired = linkError.reason === "expired";
    return (
      <div className="text-center rp-fade">
        <div className="rp-hero-icon is-warn"><i className={`bi ${expired ? "bi-hourglass-bottom" : "bi-link-45deg"}`} /></div>
        <h2 className="mb-2" style={{ fontSize: "2.1rem" }}>{expired ? "This link has expired" : "This link can't be used"}</h2>
        <p className="text-muted small mb-4">{linkError.text}</p>
        <Link href="/matrimoney/forgot" className="btn btn-primary w-100 py-3 mb-2">
          <i className="bi bi-envelope-arrow-up me-1" /> Send me a new link
        </Link>
        <Link href="/matrimoney/login" className="btn btn-link small text-muted">Back to login</Link>
      </div>
    );
  }

  if (phase === "done") {
    return (
      <div className="text-center rp-fade">
        <div className="rp-hero-icon is-ok"><i className="bi bi-shield-check" /></div>
        <h2 className="mb-2" style={{ fontSize: "2.2rem" }}>Password updated</h2>
        <p className="text-muted small mb-4">
          Your account is secure again. You can now log in with your new password.
          <br />Taking you to login in <strong>{countdown}</strong>…
        </p>
        <Link href="/matrimoney/login?reset=true" className="btn btn-primary w-100 py-3">
          Log in now <i className="bi bi-arrow-right ms-1" />
        </Link>
      </div>
    );
  }

  return (
    <div className="rp-fade">
      <span className="eyebrow mb-2">Secure Reset</span>
      <h2 className="mb-1" style={{ fontSize: "2.4rem" }}>Set a New Password</h2>
      <p className="text-muted small mb-4">
        {maskedEmail ? <>For <strong style={{ color: "var(--maroon-900)" }}>{maskedEmail}</strong>. </> : null}
        Choose a strong password you haven&apos;t used here before.
      </p>

      {error && <div className="rp-alert error" role="alert"><i className="bi bi-exclamation-circle" /> {error}</div>}

      <form onSubmit={handleSubmit} noValidate>
        <PasswordField id="new-pass" label="New password" value={password} autoFocus
          onChange={(e) => setPassword(e.target.value)} show={show} onToggle={() => setShow((s) => !s)} />

        <div className="rp-meter mt-2" aria-hidden="true">
          {[1, 2, 3, 4, 5].map((i) => <span key={i} className={i <= score ? `on s${score}` : ""} />)}
        </div>
        <div className="d-flex justify-content-between small mt-1">
          <span className="text-muted">Strength</span>
          <span className={`rp-level s${score}`}>{password ? LEVELS[score] : "—"}</span>
        </div>
        <PasswordChecklist password={password} />

        <div className="mt-3">
          <PasswordField id="confirm-pass" label="Confirm new password" value={confirm}
            onChange={(e) => setConfirm(e.target.value)} show={show} onToggle={() => setShow((s) => !s)}
            invalid={confirm.length > 0 && !matches} />
          {confirm.length > 0 && (
            <div className={`small mt-1 ${matches ? "text-success" : "text-danger"}`}>
              <i className={`bi ${matches ? "bi-check-circle-fill" : "bi-x-circle-fill"} me-1`} />
              {matches ? "Passwords match" : "Passwords don't match yet"}
            </div>
          )}
        </div>

        <button type="submit" className="btn btn-primary w-100 py-3 mt-4" disabled={!canSubmit}>
          {loading ? <><span className="spinner-border spinner-border-sm me-2" /> Updating…</> : <><i className="bi bi-shield-lock me-1" /> Update password</>}
        </button>
      </form>

      <div className="rp-note mt-4">
        <i className="bi bi-info-circle" />
        <span>Tip: a short phrase with a number and a symbol — like <em>Mango@Rain2026</em> — is strong and easy to remember. Don&apos;t reuse passwords from other sites.</span>
      </div>

      <div className="text-center small mt-3">
        <Link href="/matrimoney/login" className="text-danger fw-semibold"><i className="bi bi-arrow-left me-1" /> Back to login</Link>
      </div>
    </div>
  );
}

export default function ResetPasswordPage() {
  return (
    <AuthShell artTitle="A Fresh Start" artText="Your account security matters to us. Set a new password to continue.">
      <ol className="rp-steps" aria-label="Password reset steps">
        <li className="done"><span>1</span>Your email</li>
        <li className="done"><span>2</span>Check inbox</li>
        <li className="active"><span>3</span>New password</li>
      </ol>
      <Suspense fallback={<div className="text-center py-5"><span className="spinner-border" /></div>}>
        <ResetPasswordForm />
      </Suspense>
    </AuthShell>
  );
}
