"use client";

import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { Suspense, useCallback, useEffect, useMemo, useState } from "react";
import { useInterests } from "@/app/hooks/useInterests";

/* ------------------------------------------------------------------ */
const TABS = [
  { key: "received", label: "Received", icon: "bi-inbox-fill", type: "received", status: "sent",
    title: "Interests Received", subtitle: "Members who would like to connect with you. Reply quickly — families appreciate it." },
  { key: "sent", label: "Sent", icon: "bi-send-fill", type: "sent", status: "sent",
    title: "Interests Sent", subtitle: "Members you have reached out to who haven't replied yet." },
  { key: "accepted", label: "Connections", icon: "bi-hearts", type: "received", status: "accepted",
    title: "Your Connections", subtitle: "Mutual interests — you can now view contact details and take the next step." },
  { key: "declined", label: "Declined", icon: "bi-x-circle", type: "received", status: "declined",
    title: "Declined by You", subtitle: "Changed your mind? You can still accept any of these." },
];

const EMPTY = {
  received: { icon: "bi-inbox", title: "No new interests yet", text: "Profiles with clear photos and complete details get noticed far more often.", cta: [["Complete my profile", "/dashboard/profile-edit"], ["Browse matches", "/matrimoney/matches/overall"]] },
  sent: { icon: "bi-send", title: "No pending interests", text: "Browse your matches and send an interest to members you like.", cta: [["Browse matches", "/matrimoney/matches/overall"], ["Search", "/matrimoney/preference-search"]] },
  accepted: { icon: "bi-hearts", title: "No connections yet", text: "When you accept an interest — or someone accepts yours — they appear here.", cta: [["See received interests", "/matrimoney/interests?filter=received"]] },
  declined: { icon: "bi-emoji-smile", title: "Nothing declined", text: "Interests you decline are kept here in case you change your mind.", cta: [] },
};

const avatarFor = (g) => (String(g).toLowerCase() === "male" ? "/images/avatar-male.svg" : "/images/avatar-female.svg");
// capitalise short all-lowercase values ("btech", "india"); leave anything typed with care alone
const cap = (v) => { const s = String(v || "").trim(); return s && s === s.toLowerCase() && s.length <= 40 ? s.replace(/\b([a-z])/g, (c) => c.toUpperCase()) : s; };

function cmToFeetInches(cm) {
  const n = Number(cm);
  if (!n) return "";
  const total = Math.round(n / 2.54);
  return `${Math.floor(total / 12)}ft ${total % 12}in`;
}

function timeAgo(iso) {
  if (!iso) return "";
  const s = Math.max(0, (Date.now() - new Date(iso).getTime()) / 1000);
  if (s < 60) return "just now";
  if (s < 3600) return `${Math.floor(s / 60)}m ago`;
  if (s < 86400) return `${Math.floor(s / 3600)}h ago`;
  if (s < 86400 * 7) return `${Math.floor(s / 86400)}d ago`;
  return new Date(iso).toLocaleDateString("en-IN", { day: "numeric", month: "short" });
}

const fullDate = (iso) => (iso ? new Date(iso).toLocaleDateString("en-IN", { day: "numeric", month: "long", year: "numeric" }) : "");

function Photo({ it, className, style }) {
  const fallback = avatarFor(it.gender);
  const [src, setSrc] = useState(it.photo_url || fallback);
  useEffect(() => setSrc(it.photo_url || fallback), [it.photo_url, fallback]);
  return (
    <img src={src} alt={it.full_name || ""} className={`${className} ${src === fallback ? "is-avatar" : ""}`} style={style}
      onError={() => setSrc(fallback)} />
  );
}

/* ------------------------------------------------------------------ */
function Detail({ it, tab, busy, onAction, onBack }) {
  const [confirm, setConfirm] = useState("");
  useEffect(() => setConfirm(""), [it.id]);

  const location = it.location_text || [it.city_name, it.state_name, cap(it.country_name)].filter(Boolean).join(", ");
  const facts = [
    ["bi-calendar-heart", "Age", it.age_years ? `${it.age_years} yrs` : ""],
    ["bi-arrows-vertical", "Height", cmToFeetInches(it.height_cm)],
    ["bi-flower1", "Religion", cap(it.religion_name)],
    ["bi-people", "Caste", cap(it.caste_name)],
    ["bi-mortarboard", "Education", cap(it.education_name)],
    ["bi-briefcase", "Profession", cap(it.profession_name)],
    ["bi-heart", "Marital status", cap(it.marital_status)],
    ["bi-geo-alt", "Location", location],
  ].filter(([, , v]) => v);

  const timeline = {
    received: `Sent you an interest on ${fullDate(it.created_at)}`,
    sent: `You sent an interest on ${fullDate(it.created_at)}`,
    accepted: `Connected on ${fullDate(it.updated_at)}`,
    declined: `You declined on ${fullDate(it.updated_at)}`,
  }[tab];

  const profileHref = `/matrimoney/profile-details/${it.matri_id}`;
  const isBusy = busy === it.id;

  return (
    <article className="ix-detail" key={it.id}>
      <button type="button" className="ix-back d-lg-none" onClick={onBack}><i className="bi bi-arrow-left" /> All interests</button>

      <div className="ix-detail-top">
        <div className="ix-photo-wrap">
          <Photo it={it} className="ix-photo" />
          <span className="ix-id">{it.matri_id}</span>
        </div>

        <div className="ix-detail-main">
          <span className={`ix-status s-${tab}`}>
            <i className={`bi ${TABS.find((t) => t.key === tab)?.icon}`} />
            {{ received: "Wants to connect", sent: "Awaiting reply", accepted: "Connected", declined: "Declined" }[tab]}
          </span>
          <h2 className="ix-name">{cap(it.full_name) || "Member"}</h2>
          <p className="ix-sub">
            {[it.age_years && `${it.age_years} yrs`, cmToFeetInches(it.height_cm), location].filter(Boolean).join(" · ") || "—"}
          </p>
          <p className="ix-timeline"><i className="bi bi-clock-history" /> {timeline}</p>

          <div className="ix-facts">
            {facts.map(([icon, k, v]) => (
              <div className="ix-fact" key={k}>
                <i className={`bi ${icon}`} />
                <div><small>{k}</small><span>{v}</span></div>
              </div>
            ))}
          </div>
        </div>
      </div>

      <div className="ix-actions">
        {tab === "received" && (confirm === "decline" ? (
          <div className="ix-confirm">
            <span>Decline {it.full_name?.split(" ")[0] || "this member"}&apos;s interest? They won&apos;t be told the reason.</span>
            <button className="btn btn-sm btn-outline-secondary rounded-pill px-3" onClick={() => setConfirm("")}>Keep</button>
            <button className="btn btn-sm btn-danger rounded-pill px-3" disabled={isBusy} onClick={() => onAction(it, "decline")}>Yes, decline</button>
          </div>
        ) : (
          <>
            <button className="btn btn-primary rounded-pill px-4 fw-semibold" disabled={isBusy} onClick={() => onAction(it, "accept")}>
              {isBusy ? <span className="spinner-border spinner-border-sm me-2" /> : <i className="bi bi-check2-circle me-1" />} Accept
            </button>
            <button className="btn btn-outline-secondary rounded-pill px-4 fw-semibold" disabled={isBusy} onClick={() => setConfirm("decline")}>
              Decline
            </button>
          </>
        ))}

        {tab === "sent" && (confirm === "withdraw" ? (
          <div className="ix-confirm">
            <span>Withdraw your interest? You can send it again later.</span>
            <button className="btn btn-sm btn-outline-secondary rounded-pill px-3" onClick={() => setConfirm("")}>Keep</button>
            <button className="btn btn-sm btn-danger rounded-pill px-3" disabled={isBusy} onClick={() => onAction(it, "withdraw")}>Withdraw</button>
          </div>
        ) : (
          <button className="btn btn-outline-secondary rounded-pill px-4 fw-semibold" disabled={isBusy} onClick={() => setConfirm("withdraw")}>
            <i className="bi bi-arrow-counterclockwise me-1" /> Withdraw
          </button>
        ))}

        {tab === "accepted" && (
          <>
            <Link href={`/dashboard/messages?with=${it.matri_id}`} className="btn btn-primary rounded-pill px-4 fw-semibold">
              <i className="bi bi-chat-heart-fill me-1" /> Message
            </Link>
            <Link href={profileHref} className="btn btn-outline-primary rounded-pill px-4 fw-semibold">
              <i className="bi bi-telephone me-1" /> View contact
            </Link>
          </>
        )}

        {tab === "declined" && (
          <button className="btn btn-primary rounded-pill px-4 fw-semibold" disabled={isBusy} onClick={() => onAction(it, "accept")}>
            {isBusy ? <span className="spinner-border spinner-border-sm me-2" /> : <i className="bi bi-arrow-repeat me-1" />} Accept after all
          </button>
        )}

        {!confirm && (
          <Link href={profileHref} className="btn btn-outline-primary rounded-pill px-4 fw-semibold ms-lg-auto">
            View full profile <i className="bi bi-arrow-right ms-1" />
          </Link>
        )}
      </div>

      {tab === "received" && (
        <p className="ix-hint"><i className="bi bi-lightbulb" /> Accepting lets you both see contact details. Declining is private.</p>
      )}
    </article>
  );
}

/* ------------------------------------------------------------------ */
function InterestsInner() {
  const router = useRouter();
  const params = useSearchParams();
  const tabKey = TABS.some((t) => t.key === params.get("filter")) ? params.get("filter") : "received";
  const tab = TABS.find((t) => t.key === tabKey);

  const { items, loading, error, refetch } = useInterests({ type: tab.type, status: tab.status, page: 1, limit: 50 });

  const [counts, setCounts] = useState(null);
  const [selectedId, setSelectedId] = useState(null);
  const [mobileDetail, setMobileDetail] = useState(false);
  const [q, setQ] = useState("");
  const [busy, setBusy] = useState(null);
  const [toast, setToast] = useState(null);

  const loadCounts = useCallback(() => {
    fetch("/api/interest?mode=stats", { credentials: "include", cache: "no-store" })
      .then((r) => (r.ok ? r.json() : null))
      .then((j) => j && setCounts(j))
      .catch(() => {});
  }, []);
  useEffect(loadCounts, [loadCounts]);

  useEffect(() => { setSelectedId(null); setMobileDetail(false); setQ(""); }, [tabKey]);

  const filtered = useMemo(() => {
    const needle = q.trim().toLowerCase();
    if (!needle) return items;
    return items.filter((it) =>
      [it.full_name, it.matri_id, it.city_name, it.religion_name, it.caste_name].filter(Boolean).join(" ").toLowerCase().includes(needle));
  }, [items, q]);

  useEffect(() => {
    if (!filtered.length) return;
    if (!filtered.some((it) => it.id === selectedId)) setSelectedId(filtered[0].id);
  }, [filtered, selectedId]);

  useEffect(() => {
    if (!toast) return;
    const t = setTimeout(() => setToast(null), 3500);
    return () => clearTimeout(t);
  }, [toast]);

  const selected = filtered.find((it) => it.id === selectedId);

  const onAction = async (it, action) => {
    setBusy(it.id);
    try {
      const res = await fetch("/api/interest", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({ id: it.id, action }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        setToast({ type: "error", text: data.error || "Could not update this interest." });
        return;
      }
      const first = (it.full_name || "Member").split(" ")[0];
      setToast({
        type: "success",
        text: { accept: `You're now connected with ${first}! 🎉`, decline: "Interest declined.", withdraw: "Interest withdrawn." }[action],
        link: action === "accept" ? ["Say hello", `/dashboard/messages?with=${it.matri_id}`] : null,
      });
      setSelectedId(null);
      setMobileDetail(false);
      refetch();
      loadCounts();
    } catch {
      setToast({ type: "error", text: "Network problem — please try again." });
    } finally {
      setBusy(null);
    }
  };

  const countFor = (k) => (counts ? { received: counts.received, sent: counts.sent, accepted: counts.accepted, declined: counts.declined }[k] : null);
  const empty = EMPTY[tabKey];

  return (
    <div className="ix-page">
      <header className="ix-hero">
        <div className="container">
          <span className="eyebrow text-gold mb-2">Interests</span>
          <h1 className="ix-title">{tab.title}</h1>
          <p className="ix-subtitle">{tab.subtitle}</p>

          <nav className="ix-tabs" role="tablist" aria-label="Interest folders">
            {TABS.map((t) => {
              const n = countFor(t.key);
              return (
                <button key={t.key} type="button" role="tab" aria-selected={t.key === tabKey}
                  className={`ix-tab ${t.key === tabKey ? "active" : ""}`}
                  onClick={() => router.replace(`/matrimoney/interests?filter=${t.key}`, { scroll: false })}>
                  <i className={`bi ${t.icon}`} />
                  <span>{t.label}</span>
                  {n > 0 && <span className="ix-count">{n > 99 ? "99+" : n}</span>}
                </button>
              );
            })}
          </nav>
        </div>
      </header>

      <div className="container ix-body">
        {loading && (
          <div className="row g-4">
            <div className="col-lg-4">
              {[0, 1, 2, 3].map((i) => <div key={i} className="ix-skel-row" />)}
            </div>
            <div className="col-lg-8 d-none d-lg-block"><div className="ix-skel-detail" /></div>
          </div>
        )}

        {error && !loading && (
          <div className="ix-empty">
            <div className="ix-empty-icon is-warn"><i className="bi bi-wifi-off" /></div>
            <h3>We couldn&apos;t load your interests</h3>
            <p>Please check your connection and try again.</p>
            <button className="btn btn-primary rounded-pill px-4" onClick={() => { refetch(); loadCounts(); }}>
              <i className="bi bi-arrow-clockwise me-1" /> Retry
            </button>
          </div>
        )}

        {!loading && !error && !items.length && (
          <div className="ix-empty">
            <div className="ix-empty-icon"><i className={`bi ${empty.icon}`} /></div>
            <h3>{empty.title}</h3>
            <p>{empty.text}</p>
            <div className="d-flex flex-wrap justify-content-center gap-2">
              {empty.cta.map(([label, href], i) => (
                <Link key={href} href={href} className={`btn rounded-pill px-4 ${i === 0 ? "btn-primary" : "btn-outline-primary"}`}>{label}</Link>
              ))}
            </div>
          </div>
        )}

        {!loading && !error && items.length > 0 && (
          <div className="row g-4">
            <aside className={`col-lg-4 ${mobileDetail ? "d-none d-lg-block" : ""}`}>
              <div className="ix-list-card">
                <div className="ix-list-head">
                  <span>{filtered.length} {filtered.length === 1 ? "member" : "members"}</span>
                  {items.length > 4 && (
                    <div className="ix-search">
                      <i className="bi bi-search" />
                      <input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Filter by name, city…" aria-label="Filter interests" />
                    </div>
                  )}
                </div>
                <div className="ix-list">
                  {filtered.map((it) => (
                    <button key={it.id} type="button"
                      className={`ix-row ${it.id === selectedId ? "active" : ""}`}
                      onClick={() => { setSelectedId(it.id); setMobileDetail(true); }}>
                      <Photo it={it} className="ix-row-photo" />
                      <span className="ix-row-text">
                        <span className="ix-row-name">{cap(it.full_name) || "Member"}</span>
                        <span className="ix-row-meta">{[it.age_years && `${it.age_years} yrs`, it.city_name].filter(Boolean).join(" · ") || it.matri_id}</span>
                      </span>
                      <span className="ix-row-time">{timeAgo(tabKey === "sent" || tabKey === "received" ? it.created_at : it.updated_at)}</span>
                    </button>
                  ))}
                  {!filtered.length && <p className="text-muted small text-center py-4 mb-0">No one matches “{q}”.</p>}
                </div>
              </div>
            </aside>

            <section className={`col-lg-8 ${mobileDetail ? "" : "d-none d-lg-block"}`}>
              {selected
                ? <Detail it={selected} tab={tabKey} busy={busy} onAction={onAction} onBack={() => setMobileDetail(false)} />
                : <div className="ix-skel-detail" />}
            </section>
          </div>
        )}
      </div>

      {toast && (
        <div className={`ix-toast ${toast.type}`} role="status">
          <i className={`bi ${toast.type === "error" ? "bi-exclamation-circle-fill" : "bi-check-circle-fill"}`} />
          <span>{toast.text}</span>
          {toast.link && <Link href={toast.link[1]} onClick={() => setToast(null)}>{toast.link[0]}</Link>}
        </div>
      )}
    </div>
  );
}

export default function InterestsPage() {
  return (
    <Suspense fallback={<div className="text-center py-5"><span className="spinner-border" /></div>}>
      <InterestsInner />
    </Suspense>
  );
}
