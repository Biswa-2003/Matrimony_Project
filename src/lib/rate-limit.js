// src/lib/rate-limit.js
// In-memory sliding-window rate limiter.
// NOTE: memory is per server instance. On a multi-instance / serverless deploy each
// instance keeps its own counters, so treat these limits as "per instance". Swap the
// Map for Redis/Upstash if strict global limits are ever needed.
import { NextResponse } from "next/server";

const buckets = new Map(); // key -> number[] (timestamps, ms)
let lastSweep = Date.now();
const MAX_WINDOW = 24 * 60 * 60 * 1000;

function sweep(now) {
  if (now - lastSweep < 60 * 1000) return;
  lastSweep = now;
  for (const [key, stamps] of buckets) {
    if (!stamps.length || stamps[stamps.length - 1] < now - MAX_WINDOW) buckets.delete(key);
  }
}

/**
 * Core check. Returns { ok, remaining, retryAfter (seconds) }.
 * Always pass a namespaced key, e.g. `login:${ip}` — never a bare IP.
 */
export function check(key, limit, windowMs) {
  const now = Date.now();
  sweep(now);
  const stamps = (buckets.get(key) || []).filter((t) => t > now - windowMs);
  if (stamps.length >= limit) {
    buckets.set(key, stamps);
    return { ok: false, remaining: 0, retryAfter: Math.max(1, Math.ceil((stamps[0] + windowMs - now) / 1000)) };
  }
  stamps.push(now);
  buckets.set(key, stamps);
  return { ok: true, remaining: limit - stamps.length, retryAfter: 0 };
}

/** Back-compatible boolean API: rateLimit(key, limit, windowMs) -> true when allowed. */
export function rateLimit(key, limit = 5, windowMs = 60 * 1000) {
  return check(String(key), limit, windowMs).ok;
}

/** Forget a key (e.g. clear failed-login counter after a successful login). */
export function resetLimit(key) {
  buckets.delete(String(key));
}

/** Best-effort client IP behind proxies (Vercel/NGINX set x-forwarded-for / x-real-ip). */
export function clientIp(req) {
  const h = req?.headers;
  const fwd = h?.get?.("x-forwarded-for");
  if (fwd) return fwd.split(",")[0].trim();
  return h?.get?.("x-real-ip") || h?.get?.("cf-connecting-ip") || "local";
}

function human(sec) {
  if (sec < 90) return `${sec} seconds`;
  const m = Math.ceil(sec / 60);
  return m < 90 ? `${m} minutes` : `${Math.ceil(m / 60)} hours`;
}

/**
 * Route helper. Returns a ready 429 NextResponse when the limit is hit, else null.
 *   const limited = limitOr429(`interest:${me}`, 60, 10 * 60_000);
 *   if (limited) return limited;
 */
export function limitOr429(key, limit, windowMs, message) {
  const r = check(String(key), limit, windowMs);
  if (r.ok) return null;
  return NextResponse.json(
    { error: message || `Too many requests. Please try again in ${human(r.retryAfter)}.`, retryAfter: r.retryAfter },
    { status: 429, headers: { "Retry-After": String(r.retryAfter) } }
  );
}
