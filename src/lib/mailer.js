// src/lib/mailer.js
// Transactional email: one branded template, preference checks and throttling.
// Never throws — a failed email must not break the action that triggered it.
import nodemailer from "nodemailer";
import * as nextServer from "next/server";
import { query } from "@/lib/db";
import { ensureSchema } from "@/lib/schema";

let transporter = null;
const configured = () => Boolean(process.env.EMAIL_USER && process.env.EMAIL_PASS);

function getTransport() {
  if (!transporter) {
    transporter = nodemailer.createTransport({
      service: "gmail",
      auth: { user: process.env.EMAIL_USER, pass: process.env.EMAIL_PASS },
    });
  }
  return transporter;
}

export const esc = (s) =>
  String(s ?? "").replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));

export const siteUrl = () => (process.env.NEXT_PUBLIC_BASE_URL || "http://localhost:3000").replace(/\/$/, "");

// RFC 2606 / 6761 reserved domains never receive mail — skip them (test accounts, seed data)
const undeliverable = (email) => /@([a-z0-9-]+\.)*(invalid|test|example|localhost)$/i.test(String(email || "")) || /@example\.(com|net|org)$/i.test(String(email || ""));

/** Branded HTML shell. `body` is trusted HTML built with esc() by the caller. */
export function layout({ preheader = "", title, body, cta, footerNote }) {
  const btn = cta
    ? `<p style="margin:26px 0 8px;text-align:center"><a href="${esc(cta.href)}" style="display:inline-block;background:#c9a24a;color:#3b0a16;text-decoration:none;font-weight:bold;padding:12px 28px;border-radius:40px;font-family:Arial,sans-serif">${esc(cta.label)}</a></p>`
    : "";
  return `<!doctype html><html><body style="margin:0;background:#f6efe4">
  <span style="display:none!important;opacity:0;color:transparent;height:0;width:0;overflow:hidden">${esc(preheader)}</span>
  <div style="padding:28px 12px;font-family:Arial,Helvetica,sans-serif">
    <table role="presentation" width="100%" style="max-width:560px;margin:0 auto;background:#fffdf9;border:1px solid #e8d7b0;border-radius:16px;overflow:hidden">
      <tr><td style="background:#5a0f22;padding:20px 28px">
        <span style="color:#e8cf8e;font-family:Georgia,serif;font-size:24px;font-weight:bold">MatriMoney</span>
        <span style="color:#c9a24a;font-size:10px;letter-spacing:3px;display:block;margin-top:2px">SACRED UNIONS</span>
      </td></tr>
      <tr><td style="padding:28px;color:#2b1a1f;font-size:15px;line-height:1.6">
        <h1 style="font-family:Georgia,serif;font-size:24px;color:#5a0f22;margin:0 0 14px">${esc(title)}</h1>
        ${body}
        ${btn}
      </td></tr>
      <tr><td style="padding:16px 28px;background:#faf3e6;color:#8a7a7e;font-size:12px;line-height:1.5">
        ${footerNote ? `${esc(footerNote)}<br>` : ""}
        You can change which emails you get in <a href="${siteUrl()}/dashboard/profile-setting" style="color:#a3123a">Settings → Notifications</a>.
        For your safety, never share OTPs or send money to anyone you meet online.
      </td></tr>
    </table>
  </div></body></html>`;
}

/** Low-level send. Returns true if handed to the mail server. */
export async function sendMail({ to, subject, html, text }) {
  if (!to || undeliverable(to)) return false;
  if (!configured()) {
    if (process.env.NODE_ENV === "development") console.log(`[MAIL DEBUG] (not configured) to=${to} subject="${subject}"`);
    return false;
  }
  try {
    await getTransport().sendMail({
      from: `"MatriMoney" <${process.env.EMAIL_USER}>`,
      to, subject, html, text,
    });
    return true;
  } catch (e) {
    console.error("[mailer] send failed:", e.message);
    return false;
  }
}

/**
 * Preference-aware, throttled notification email to a member.
 *   kind: 'interest' | 'accepted' | 'message' | 'digest' | 'photo_request' | ...
 *   pref: which preference column gates it ('alert_email' | 'alert_messages' | 'alert_digest')
 *   throttleHours: skip if the same (kind, ref) was mailed to this user within N hours
 */
export async function notifyMember(userId, { kind, ref = null, pref = "alert_email", throttleHours = 0, build }) {
  try {
    if (!userId || typeof build !== "function") return false;
    await ensureSchema();
    const allowedPref = ["alert_email", "alert_messages", "alert_digest"].includes(pref) ? pref : "alert_email";
    const { rows } = await query(
      `SELECT u.email, COALESCE(mp.first_name, u.first_name) AS first_name, COALESCE(mp.is_active, TRUE) AS active,
              COALESCE(p.${allowedPref}, TRUE) AS wants
         FROM users u
         LEFT JOIN matrimony_profiles mp ON mp.user_id = u.id
         LEFT JOIN user_preferences p ON p.user_id = u.id
        WHERE u.id = $1 LIMIT 1`,
      [userId]
    );
    const r = rows[0];
    if (!r?.email || !r.wants || !r.active) return false;

    if (throttleHours > 0) {
      const recent = await query(
        `SELECT 1 FROM email_log WHERE user_id = $1 AND kind = $2 AND ref IS NOT DISTINCT FROM $3
           AND sent_at > NOW() - ($4 || ' hours')::interval LIMIT 1`,
        [userId, kind, ref, String(throttleHours)]
      );
      if (recent.rows.length) return false;
    }

    const mail = await build({ firstName: r.first_name || "there" });
    if (!mail) return false;
    const ok = await sendMail({ to: r.email, ...mail });
    // log attempts too (even when mail isn't configured) so throttling behaves the same everywhere
    await query(`INSERT INTO email_log (user_id, kind, ref) VALUES ($1, $2, $3)`, [userId, kind, ref]);
    return ok;
  } catch (e) {
    console.error("[mailer] notifyMember failed:", e.message);
    return false;
  }
}

/** Fire-and-forget helper for route handlers: don't make the member wait for SMTP. */
export function notifyLater(userId, opts) {
  const job = () => notifyMember(userId, opts).catch(() => {});
  // after() keeps serverless functions alive until the email is handed off
  try {
    if (typeof nextServer.after === "function") return nextServer.after(job);
  } catch { /* outside a request scope (tests, scripts) */ }
  job();
}
