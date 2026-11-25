"use client";

import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { Suspense, useCallback, useEffect, useLayoutEffect, useMemo, useRef, useState } from "react";
import "./messages.css";

const REPORT_REASONS = [
  "Harassment or abusive messages",
  "Asking for money / scam",
  "Fake profile / impersonation",
  "Inappropriate photos or content",
  "Other",
];
const ICEBREAKERS = [
  "Namaste! Thank you for accepting — lovely to connect 😊",
  "Hi! I liked your profile. What do you enjoy doing on weekends?",
  "Hello! Could you tell me a little about your family?",
  "Hi! What are you looking for in a life partner?",
];

const avatarFor = (g) => (String(g).toLowerCase() === "male" ? "/images/avatar-male.svg" : "/images/avatar-female.svg");
const clock = (t) => new Date(t).toLocaleTimeString("en-IN", { hour: "numeric", minute: "2-digit" });
const dayLabel = (t) => {
  const d = new Date(t);
  const today = new Date();
  const y = new Date(); y.setDate(today.getDate() - 1);
  if (d.toDateString() === today.toDateString()) return "Today";
  if (d.toDateString() === y.toDateString()) return "Yesterday";
  return d.toLocaleDateString("en-IN", { weekday: "short", day: "numeric", month: "short", year: d.getFullYear() === today.getFullYear() ? undefined : "numeric" });
};
const shortWhen = (t) => {
  if (!t) return "";
  const d = new Date(t);
  const today = new Date();
  if (d.toDateString() === today.toDateString()) return clock(t);
  if ((today - d) / 86400000 < 7) return d.toLocaleDateString("en-IN", { weekday: "short" });
  return d.toLocaleDateString("en-IN", { day: "numeric", month: "short" });
};
const lastActive = (t) => {
  if (!t) return "";
  const h = (Date.now() - new Date(t).getTime()) / 3600000;
  if (h < 1) return "Active recently";
  if (h < 24) return "Active today";
  if (h < 48) return "Active yesterday";
  return `Active ${Math.floor(h / 24)} days ago`;
};

function Avatar({ src, gender, size = 44, className = "" }) {
  const fallback = avatarFor(gender);
  const [img, setImg] = useState(src || fallback);
  useEffect(() => setImg(src || fallback), [src, fallback]);
  return (
    <img src={img} alt="" width={size} height={size} className={`mx-avatar ${img === fallback ? "is-avatar" : ""} ${className}`}
      onError={() => setImg(fallback)} />
  );
}

/* ================================================================== */
function MessagesInner() {
  const router = useRouter();
  const params = useSearchParams();
  const active = params.get("with");

  const [inbox, setInbox] = useState(null); // null = loading
  const [inboxError, setInboxError] = useState("");
  const [q, setQ] = useState("");

  const [thread, setThread] = useState(null); // { partner, messages, canMessage, reason, hasMore, readUpTo }
  const [threadError, setThreadError] = useState("");
  const [loadingOlder, setLoadingOlder] = useState(false);
  const [draft, setDraft] = useState("");
  const [sending, setSending] = useState(false);
  const [menu, setMenu] = useState(false);
  const [modal, setModal] = useState(null); // 'report' | 'block'
  const [toast, setToast] = useState(null);

  const bodyRef = useRef(null);
  const inputRef = useRef(null);
  const stickToBottom = useRef(true);

  /* ---------- inbox ---------- */
  const loadInbox = useCallback(async () => {
    try {
      const r = await fetch("/api/messages", { cache: "no-store" });
      if (r.status === 401) return router.push("/matrimoney/login");
      const j = await r.json();
      if (!r.ok) throw new Error(j.error);
      setInbox(j.conversations || []);
      setInboxError("");
      window.dispatchEvent(new CustomEvent("mm:messages-unread", { detail: j.unread || 0 }));
    } catch {
      setInboxError("Couldn't load your conversations.");
      setInbox((x) => x || []);
    }
  }, [router]);

  useEffect(() => {
    loadInbox();
    const id = setInterval(() => !document.hidden && loadInbox(), 15000);
    return () => clearInterval(id);
  }, [loadInbox]);

  /* ---------- thread ---------- */
  const openThread = useCallback(async (matri) => {
    setThread(null);
    setThreadError("");
    setMenu(false);
    stickToBottom.current = true;
    try {
      const r = await fetch(`/api/messages?with=${encodeURIComponent(matri)}`, { cache: "no-store" });
      const j = await r.json();
      if (!r.ok) throw new Error(j.error || "Could not open this conversation.");
      setThread(j);
      setInbox((list) => list?.map((c) => (c.matri_id === matri ? { ...c, unread: 0 } : c)));
      loadInbox(); // refresh totals so the navbar badge drops straight away
    } catch (e) {
      setThreadError(e.message);
    }
  }, [loadInbox]);

  useEffect(() => {
    if (active) openThread(active);
    else setThread(null);
    setDraft("");
  }, [active, openThread]);

  // poll the open thread for new messages + read receipts
  useEffect(() => {
    if (!active || !thread) return;
    const id = setInterval(async () => {
      if (document.hidden) return;
      const real = thread.messages.filter((m) => !m.pending);
      const last = real[real.length - 1]?.at || new Date(Date.now() - 5 * 60000).toISOString();
      try {
        const r = await fetch(`/api/messages?with=${encodeURIComponent(active)}&after=${encodeURIComponent(last)}`, { cache: "no-store" });
        if (!r.ok) return;
        const j = await r.json();
        setThread((t) => {
          if (!t || t.partner.matri_id !== j.partner.matri_id) return t;
          const known = new Set(t.messages.map((m) => m.id));
          const fresh = j.messages.filter((m) => !known.has(m.id));
          if (!fresh.length && t.readUpTo === j.readUpTo && t.canMessage === j.canMessage) return t;
          return { ...t, messages: [...t.messages, ...fresh], readUpTo: j.readUpTo, canMessage: j.canMessage, reason: j.reason };
        });
      } catch { /* offline — try next tick */ }
    }, 4000);
    return () => clearInterval(id);
  }, [active, thread]);

  // keep scrolled to the newest message unless the reader scrolled up
  useLayoutEffect(() => {
    const el = bodyRef.current;
    if (el && stickToBottom.current) el.scrollTop = el.scrollHeight;
  }, [thread?.messages?.length, thread?.partner?.matri_id]);

  const onScroll = async (e) => {
    const el = e.currentTarget;
    stickToBottom.current = el.scrollHeight - el.scrollTop - el.clientHeight < 80;
    if (el.scrollTop < 60 && thread?.hasMore && !loadingOlder) {
      setLoadingOlder(true);
      const first = thread.messages[0]?.at;
      const prevH = el.scrollHeight;
      try {
        const r = await fetch(`/api/messages?with=${encodeURIComponent(active)}&before=${encodeURIComponent(first)}`, { cache: "no-store" });
        const j = await r.json();
        if (r.ok) {
          setThread((t) => ({ ...t, messages: [...j.messages, ...t.messages], hasMore: j.hasMore }));
          requestAnimationFrame(() => { el.scrollTop = el.scrollHeight - prevH; });
        }
      } finally {
        setLoadingOlder(false);
      }
    }
  };

  /* ---------- send / unsend ---------- */
  const send = async (textArg) => {
    const text = String(textArg ?? draft).trim();
    if (!text || sending || !thread?.canMessage) return;
    const tempId = `tmp-${Date.now()}`;
    const optimistic = { id: tempId, mine: true, body: text, at: new Date().toISOString(), pending: true };
    stickToBottom.current = true;
    setThread((t) => ({ ...t, messages: [...t.messages, optimistic] }));
    setDraft("");
    if (inputRef.current) inputRef.current.style.height = "auto";
    setSending(true);
    try {
      const r = await fetch("/api/messages", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ to: thread.partner.matri_id, body: text }),
      });
      const j = await r.json().catch(() => ({}));
      if (!r.ok) throw new Error(j.error || "Message not sent.");
      setThread((t) => ({ ...t, messages: t.messages.map((m) => (m.id === tempId ? j.message : m)) }));
      setInbox((list) => {
        const rest = (list || []).filter((c) => c.matri_id !== thread.partner.matri_id);
        const me = (list || []).find((c) => c.matri_id === thread.partner.matri_id);
        return me ? [{ ...me, last: { body: text, mine: true, at: j.message.at } }, ...rest] : list;
      });
    } catch (e) {
      setThread((t) => ({ ...t, messages: t.messages.map((m) => (m.id === tempId ? { ...m, pending: false, failed: true } : m)) }));
      setToast({ type: "error", text: e.message });
    } finally {
      setSending(false);
    }
  };

  const retry = (m) => {
    setThread((t) => ({ ...t, messages: t.messages.filter((x) => x.id !== m.id) }));
    send(m.body);
  };

  const unsend = async (m) => {
    const r = await fetch(`/api/messages?id=${m.id}`, { method: "DELETE" });
    if (r.ok) setThread((t) => ({ ...t, messages: t.messages.map((x) => (x.id === m.id ? { ...x, deleted: true, body: "" } : x)) }));
    else setToast({ type: "error", text: "Couldn't unsend that message." });
  };

  /* ---------- report / block ---------- */
  const doBlock = async () => {
    const r = await fetch("/api/block", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ matri_id: thread.partner.matri_id }) });
    const j = await r.json().catch(() => ({}));
    setModal(null);
    if (!r.ok) return setToast({ type: "error", text: j.error || "Could not block." });
    setToast({ type: "success", text: `${thread.partner.name.split(" ")[0]} is blocked. They can no longer contact you.` });
    router.replace("/dashboard/messages");
    loadInbox();
  };

  useEffect(() => {
    if (!toast) return;
    const t = setTimeout(() => setToast(null), 4000);
    return () => clearTimeout(t);
  }, [toast]);

  /* ---------- derived ---------- */
  const filtered = useMemo(() => {
    const n = q.trim().toLowerCase();
    return (inbox || []).filter((c) => !n || `${c.name} ${c.matri_id}`.toLowerCase().includes(n));
  }, [inbox, q]);

  const grouped = useMemo(() => {
    const out = [];
    let day = "";
    for (const m of thread?.messages || []) {
      const d = dayLabel(m.at);
      if (d !== day) { out.push({ sep: d, key: `sep-${d}-${m.id}` }); day = d; }
      out.push(m);
    }
    return out;
  }, [thread?.messages]);

  const isRead = (m) => thread?.readUpTo && new Date(m.at) <= new Date(thread.readUpTo);
  const realCount = thread?.messages?.filter((m) => !m.deleted).length || 0;

  /* ================================================================== */
  return (
    <div className="mx-page">
      <div className="container mx-shell-wrap">
        <div className={`mx-shell ${active ? "has-thread" : ""}`}>
          {/* ---------------- inbox ---------------- */}
          <aside className="mx-inbox" aria-label="Conversations">
            <div className="mx-inbox-head">
              <div>
                <span className="eyebrow" style={{ fontSize: "0.62rem" }}>Inbox</span>
                <h1 className="mx-title">Messages</h1>
              </div>
              <Link href="/matrimoney/interests?filter=accepted" className="mx-icon-btn" title="Your connections" aria-label="Your connections">
                <i className="bi bi-people" />
              </Link>
            </div>
            <div className="mx-search">
              <i className="bi bi-search" />
              <input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Search conversations" aria-label="Search conversations" />
            </div>

            <div className="mx-list">
              {inbox === null && [0, 1, 2, 3].map((i) => <div key={i} className="mx-skel" />)}
              {inboxError && <div className="mx-inline-error">{inboxError} <button onClick={loadInbox}>Retry</button></div>}

              {inbox && inbox.length === 0 && !inboxError && (
                <div className="mx-empty-list">
                  <i className="bi bi-chat-heart" />
                  <p className="fw-semibold mb-1">No conversations yet</p>
                  <p className="small text-muted mb-3">You can message members once an interest is accepted — by them or by you.</p>
                  <Link href="/matrimoney/interests" className="btn btn-primary btn-sm rounded-pill px-3">Check interests</Link>
                </div>
              )}

              {filtered.map((c) => (
                <Link key={c.matri_id} href={`/dashboard/messages?with=${c.matri_id}`} scroll={false}
                  className={`mx-conv ${active === c.matri_id ? "active" : ""} ${c.unread ? "unread" : ""}`}>
                  <span className="mx-conv-photo">
                    <Avatar src={c.photo} gender={c.gender} size={48} />
                    {!c.active && <span className="mx-paused" title="Profile paused"><i className="bi bi-pause-fill" /></span>}
                  </span>
                  <span className="mx-conv-text">
                    <span className="mx-conv-top">
                      <span className="mx-conv-name">{c.name}</span>
                      <span className="mx-conv-time">{shortWhen(c.last?.at || c.connected_at)}</span>
                    </span>
                    <span className="mx-conv-bottom">
                      <span className="mx-conv-last">
                        {c.last ? <>{c.last.mine && <span className="text-muted">You: </span>}{c.last.body}</>
                          : <span className="mx-new-conn"><i className="bi bi-stars" /> New connection — say hello</span>}
                      </span>
                      {c.unread > 0 && <span className="mx-unread">{c.unread > 9 ? "9+" : c.unread}</span>}
                    </span>
                  </span>
                </Link>
              ))}
              {inbox && inbox.length > 0 && !filtered.length && <p className="text-center text-muted small py-4">No one matches “{q}”.</p>}
            </div>
          </aside>

          {/* ---------------- thread ---------------- */}
          <section className="mx-thread" aria-label="Conversation">
            {!active && (
              <div className="mx-placeholder">
                <img src="/images/ritual-rings.svg" alt="" width={84} height={84} />
                <h2>Your conversations</h2>
                <p>Choose a connection on the left to start chatting. Messages are private between the two of you.</p>
                <ul className="mx-safety">
                  <li><i className="bi bi-shield-check" /> Never share OTPs, bank details or send money.</li>
                  <li><i className="bi bi-people" /> Involve your family before meeting in person.</li>
                  <li><i className="bi bi-flag" /> Report anything that feels wrong — we review within 24 hours.</li>
                </ul>
              </div>
            )}

            {active && threadError && (
              <div className="mx-placeholder">
                <i className="bi bi-chat-square-dots mx-big-icon" />
                <h2>Can&apos;t open this chat</h2>
                <p>{threadError}</p>
                <Link href="/dashboard/messages" className="btn btn-primary rounded-pill px-4">Back to inbox</Link>
              </div>
            )}

            {active && !thread && !threadError && (
              <div className="mx-thread-loading"><span className="spinner-border" style={{ color: "var(--gold-dark)" }} /></div>
            )}

            {active && thread && (
              <>
                <header className="mx-thread-head">
                  <Link href="/dashboard/messages" className="mx-back" aria-label="Back to conversations"><i className="bi bi-arrow-left" /></Link>
                  <Link href={`/matrimoney/profile-details/${thread.partner.matri_id}`} className="mx-partner">
                    <Avatar src={thread.partner.photo} gender={thread.partner.gender} size={44} />
                    <span>
                      <span className="mx-partner-name">{thread.partner.name}</span>
                      <span className="mx-partner-meta">
                        {[thread.partner.age && `${thread.partner.age} yrs`, thread.partner.city].filter(Boolean).join(" · ")}
                        {thread.partner.last_active && <> · <span className="mx-active">{lastActive(thread.partner.last_active)}</span></>}
                      </span>
                    </span>
                  </Link>
                  <div className="mx-head-actions">
                    <Link href={`/matrimoney/profile-details/${thread.partner.matri_id}`} className="mx-icon-btn d-none d-md-inline-flex" title="View profile"><i className="bi bi-person-vcard" /></Link>
                    <div className="position-relative">
                      <button type="button" className="mx-icon-btn" onClick={() => setMenu((m) => !m)} aria-label="More options" aria-expanded={menu}><i className="bi bi-three-dots-vertical" /></button>
                      {menu && (
                        <div className="mx-menu" role="menu" onMouseLeave={() => setMenu(false)}>
                          <Link href={`/matrimoney/profile-details/${thread.partner.matri_id}`} role="menuitem"><i className="bi bi-person" /> View profile</Link>
                          <button type="button" role="menuitem" onClick={() => { setMenu(false); setModal("report"); }}><i className="bi bi-flag" /> Report</button>
                          <button type="button" role="menuitem" className="danger" onClick={() => { setMenu(false); setModal("block"); }}><i className="bi bi-slash-circle" /> Block</button>
                        </div>
                      )}
                    </div>
                  </div>
                </header>

                <div className="mx-body" ref={bodyRef} onScroll={onScroll} aria-live="polite">
                  {loadingOlder && <div className="text-center py-2"><span className="spinner-border spinner-border-sm" /></div>}
                  {!thread.hasMore && realCount > 0 && (
                    <div className="mx-start-note"><i className="bi bi-lock" /> Messages are private between you and {thread.partner.name.split(" ")[0]}.</div>
                  )}

                  {realCount === 0 && thread.canMessage && (
                    <div className="mx-hello">
                      <Avatar src={thread.partner.photo} gender={thread.partner.gender} size={84} />
                      <h3>You&apos;re connected with {thread.partner.name.split(" ")[0]}</h3>
                      <p>Start with a warm, respectful hello. Pick one or write your own:</p>
                      <div className="mx-ice">
                        {ICEBREAKERS.map((t) => <button key={t} type="button" onClick={() => send(t)} disabled={sending}>{t}</button>)}
                      </div>
                    </div>
                  )}

                  {grouped.map((m) => m.sep ? (
                    <div key={m.key} className="mx-day"><span>{m.sep}</span></div>
                  ) : (
                    <div key={m.id} className={`mx-msg ${m.mine ? "mine" : "theirs"}`}>
                      {m.warning && (
                        <div className="mx-warning"><i className="bi bi-shield-exclamation" /> {m.warning}</div>
                      )}
                      <div className={`mx-bubble ${m.deleted ? "deleted" : ""} ${m.failed ? "failed" : ""}`}>
                        {m.deleted ? <em><i className="bi bi-slash-circle me-1" />{m.mine ? "You unsent a message" : "This message was unsent"}</em> : m.body}
                        <span className="mx-meta">
                          {clock(m.at)}
                          {m.mine && !m.deleted && (
                            m.failed ? <i className="bi bi-exclamation-circle text-danger" title="Not sent" />
                              : m.pending ? <i className="bi bi-clock" title="Sending" />
                                : isRead(m) ? <i className="bi bi-check2-all is-read" title="Read" />
                                  : <i className="bi bi-check2" title="Sent" />
                          )}
                        </span>
                      </div>
                      {m.mine && m.failed && <button type="button" className="mx-retry" onClick={() => retry(m)}>Tap to retry</button>}
                      {m.mine && !m.deleted && !m.pending && !m.failed && (
                        <button type="button" className="mx-unsend" onClick={() => unsend(m)} title="Unsend"><i className="bi bi-arrow-counterclockwise" /></button>
                      )}
                    </div>
                  ))}
                </div>

                {thread.canMessage ? (
                  <form className="mx-composer" onSubmit={(e) => { e.preventDefault(); send(); }}>
                    <textarea
                      ref={inputRef}
                      rows={1}
                      value={draft}
                      maxLength={1000}
                      placeholder={`Message ${thread.partner.name.split(" ")[0]}…`}
                      onChange={(e) => {
                        setDraft(e.target.value);
                        e.target.style.height = "auto";
                        e.target.style.height = `${Math.min(e.target.scrollHeight, 140)}px`;
                      }}
                      onKeyDown={(e) => { if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); send(); } }}
                      aria-label="Type a message"
                    />
                    {draft.length > 800 && <span className="mx-count">{1000 - draft.length}</span>}
                    <button type="submit" className="mx-send" disabled={!draft.trim() || sending} aria-label="Send"><i className="bi bi-send-fill" /></button>
                  </form>
                ) : (
                  <div className="mx-locked"><i className="bi bi-lock" /> {thread.reason}</div>
                )}
              </>
            )}
          </section>
        </div>
      </div>

      {modal && thread && (
        <div className="mx-modal-backdrop" onClick={() => setModal(null)}>
          <div className="mx-modal" role="dialog" aria-modal="true" onClick={(e) => e.stopPropagation()}>
            {modal === "block" ? (
              <>
                <h3>Block {thread.partner.name.split(" ")[0]}?</h3>
                <p>They won&apos;t be able to message you, see your profile in results or send interests. You can unblock later from Settings.</p>
                <div className="d-flex gap-2 justify-content-end">
                  <button className="btn btn-outline-secondary rounded-pill px-3" onClick={() => setModal(null)}>Cancel</button>
                  <button className="btn btn-danger rounded-pill px-3" onClick={doBlock}>Block</button>
                </div>
              </>
            ) : (
              <ReportForm partner={thread.partner} onClose={(msg) => { setModal(null); if (msg) setToast({ type: "success", text: msg }); }} />
            )}
          </div>
        </div>
      )}

      {toast && (
        <div className={`ix-toast ${toast.type === "error" ? "error" : ""}`} role="status">
          <i className={`bi ${toast.type === "error" ? "bi-exclamation-circle-fill" : "bi-check-circle-fill"}`} /> <span>{toast.text}</span>
        </div>
      )}
    </div>
  );
}

function ReportForm({ partner, onClose }) {
  const [reason, setReason] = useState(REPORT_REASONS[0]);
  const [details, setDetails] = useState("");
  const [block, setBlock] = useState(true);
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState("");
  const submit = async () => {
    setBusy(true); setErr("");
    const r = await fetch("/api/report", {
      method: "POST", headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ matri_id: partner.matri_id, reason, details: `[From chat] ${details}`, block }),
    });
    const j = await r.json().catch(() => ({}));
    setBusy(false);
    if (!r.ok) return setErr(j.error || "Could not send the report.");
    onClose(j.message || "Report sent. Thank you.");
  };
  return (
    <>
      <h3>Report {partner.name.split(" ")[0]}</h3>
      <p>Our safety team reviews every report. The member isn&apos;t told who reported them.</p>
      {err && <div className="rp-alert error">{err}</div>}
      <div className="d-flex flex-column gap-2 mb-3">
        {REPORT_REASONS.map((r) => (
          <label key={r} className={`mx-reason ${reason === r ? "on" : ""}`}>
            <input type="radio" name="reason" checked={reason === r} onChange={() => setReason(r)} /> {r}
          </label>
        ))}
      </div>
      <textarea className="form-control mb-2" rows={3} maxLength={1500} placeholder="What happened? (optional)" value={details} onChange={(e) => setDetails(e.target.value)} />
      <label className="d-flex align-items-center gap-2 small mb-3">
        <input type="checkbox" checked={block} onChange={(e) => setBlock(e.target.checked)} /> Also block this member
      </label>
      <div className="d-flex gap-2 justify-content-end">
        <button className="btn btn-outline-secondary rounded-pill px-3" onClick={() => onClose()}>Cancel</button>
        <button className="btn btn-danger rounded-pill px-3" disabled={busy} onClick={submit}>{busy ? "Sending…" : "Send report"}</button>
      </div>
    </>
  );
}

export default function MessagesPage() {
  return (
    <Suspense fallback={<div className="text-center py-5"><span className="spinner-border" /></div>}>
      <MessagesInner />
    </Suspense>
  );
}
