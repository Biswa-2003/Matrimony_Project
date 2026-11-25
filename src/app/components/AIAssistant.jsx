'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { getSession } from '@/lib/session-client';
import './AIAssistant.css';

const STORE_KEY = 'mm:assistant:v2';
const GREETED_KEY = 'mm:assistant:greeted';

const GUEST_SUGGESTIONS = ['How do I register?', 'What are your plans?', 'Is my data private?', 'How do interests work?'];
const MEMBER_SUGGESTIONS = ['Find Hindu brides 24 to 30', 'What is my plan?', 'Who viewed my profile?', 'How strong is my profile?', 'My interests'];
const FOLLOW_UPS = ['Find matches for me', 'Plans & prices', 'Safety tips', 'Talk to support'];

const avatarFor = (g) => (String(g).toLowerCase() === 'male' ? '/images/avatar-male.svg' : '/images/avatar-female.svg');

/** Minimal, safe formatter: escapes HTML, then supports **bold**, *italic*, bullet/numbered lines. */
function RichText({ text }) {
  const lines = String(text || '').split('\n');
  const inline = (s, key) => {
    const parts = [];
    const re = /(\*\*[^*]+\*\*|\*[^*]+\*)/g;
    let last = 0;
    let m;
    while ((m = re.exec(s))) {
      if (m.index > last) parts.push(s.slice(last, m.index));
      const t = m[0];
      parts.push(t.startsWith('**') ? <strong key={`${key}-${m.index}`}>{t.slice(2, -2)}</strong> : <em key={`${key}-${m.index}`}>{t.slice(1, -1)}</em>);
      last = m.index + t.length;
    }
    if (last < s.length) parts.push(s.slice(last));
    return parts;
  };
  return (
    <>
      {lines.map((line, i) => {
        if (!line.trim()) return <div key={i} style={{ height: 6 }} />;
        const bullet = line.match(/^\s*[•\-]\s+(.*)$/);
        const num = line.match(/^\s*(\d+)\.\s+(.*)$/);
        if (bullet) return <div key={i} className="ai-li"><span>•</span><span>{inline(bullet[1], i)}</span></div>;
        if (num) return <div key={i} className="ai-li"><span>{num[1]}.</span><span>{inline(num[2], i)}</span></div>;
        return <div key={i}>{inline(line, i)}</div>;
      })}
    </>
  );
}

export default function AIAssistant() {
  const pathname = usePathname();
  const [open, setOpen] = useState(false);
  const [messages, setMessages] = useState([]);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const [loggedIn, setLoggedIn] = useState(false);
  const [name, setName] = useState('');
  const [greeting, setGreeting] = useState(false);
  const listRef = useRef(null);
  const inputRef = useRef(null);

  // restore this session's conversation + who is chatting
  useEffect(() => {
    try {
      const saved = JSON.parse(sessionStorage.getItem(STORE_KEY) || '[]');
      if (Array.isArray(saved)) setMessages(saved);
    } catch {}
    getSession().then((s) => {
      setLoggedIn(Boolean(s));
      setName((s?.name || '').split(' ')[0]);
    });
  }, []);

  useEffect(() => {
    try { sessionStorage.setItem(STORE_KEY, JSON.stringify(messages.slice(-30))); } catch {}
  }, [messages]);

  // gentle greeting bubble — once per session, never over a sign-in / reset form
  useEffect(() => {
    if (/^\/matrimoney\/(login|register|forgot|reset-password)/.test(pathname || '')) return;
    if (window.innerWidth < 576) return; // on phones the bubble would cover the page; the launcher is enough
    let seen = true;
    try { seen = sessionStorage.getItem(GREETED_KEY) === '1'; } catch {}
    if (seen) return;
    const t = setTimeout(() => setGreeting(true), 4000);
    const h = setTimeout(() => setGreeting(false), 16000);
    return () => { clearTimeout(t); clearTimeout(h); setGreeting(false); };
  }, [pathname]);

  const markGreeted = () => {
    setGreeting(false);
    try { sessionStorage.setItem(GREETED_KEY, '1'); } catch {}
  };

  useEffect(() => {
    listRef.current?.scrollTo({ top: listRef.current.scrollHeight, behavior: 'smooth' });
  }, [messages, loading, open]);

  useEffect(() => {
    if (!open) return;
    setTimeout(() => inputRef.current?.focus(), 150);
    const onKey = (e) => e.key === 'Escape' && setOpen(false);
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [open]);

  const send = useCallback(async (text) => {
    const message = String(text ?? input).trim();
    if (!message || loading) return;
    setInput('');
    if (inputRef.current) inputRef.current.style.height = 'auto';
    const userMsg = { role: 'user', content: message, at: Date.now() };
    const history = messages.slice(-8).map(({ role, content }) => ({ role, content }));
    setMessages((m) => [...m, userMsg]);
    setLoading(true);
    try {
      const r = await fetch('/api/assistant', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ message, history }),
      });
      const j = await r.json().catch(() => ({}));
      setMessages((m) => [...m, {
        role: 'assistant',
        content: j.reply || 'Sorry, I could not answer that right now.',
        cards: j.cards || [],
        actions: j.actions || [],
        at: Date.now(),
      }]);
      if (typeof j.loggedIn === 'boolean') setLoggedIn(j.loggedIn);
    } catch {
      setMessages((m) => [...m, { role: 'assistant', content: 'I could not reach the server. Please check your connection and try again.', at: Date.now() }]);
    } finally {
      setLoading(false);
    }
  }, [input, loading, messages]);

  const clear = () => {
    setMessages([]);
    try { sessionStorage.removeItem(STORE_KEY); } catch {}
  };

  // after all hooks (rules of hooks). Hidden in admin, and in member chat where it would cover the composer.
  if (pathname?.startsWith('/admin') || pathname?.startsWith('/dashboard/messages')) return null;

  const suggestions = loggedIn ? MEMBER_SUGGESTIONS : GUEST_SUGGESTIONS;
  const lastIsAssistant = messages.length > 0 && messages[messages.length - 1].role === 'assistant';
  const time = (t) => (t ? new Date(t).toLocaleTimeString('en-IN', { hour: 'numeric', minute: '2-digit' }) : '');

  return (
    <>
      {greeting && !open && (
        <div className="ai-greet" role="status">
          <button type="button" className="ai-greet-close" onClick={markGreeted} aria-label="Dismiss"><i className="bi bi-x" /></button>
          <div className="ai-greet-title">Namaste{name ? `, ${name}` : ''} 🙏</div>
          <div className="ai-greet-text">Need help finding a match or understanding plans? Ask me anything.</div>
          <button type="button" className="ai-greet-cta" onClick={() => { markGreeted(); setOpen(true); }}>Chat with assistant</button>
        </div>
      )}

      <button
        type="button"
        className={`ai-launcher ${open ? 'is-open' : ''}`}
        onClick={() => { markGreeted(); setOpen((o) => !o); }}
        aria-label={open ? 'Close assistant' : 'Open MatriMoney assistant'}
        aria-expanded={open}
      >
        <i className={`bi ${open ? 'bi-x-lg' : 'bi-chat-heart-fill'}`} />
        {!open && <span className="ai-launcher-badge">AI</span>}
      </button>

      {open && (
        <section className="ai-panel" role="dialog" aria-label="MatriMoney assistant">
          <header className="ai-head">
            <span className="ai-head-avatar"><span className="brand-mark" aria-hidden="true" /></span>
            <div className="flex-grow-1">
              <div className="ai-head-title">MatriMoney Assistant</div>
              <div className="ai-head-status"><span className="dot" />Online · replies instantly</div>
            </div>
            {messages.length > 0 && (
              <button type="button" className="ai-icon-btn" onClick={clear} title="Clear conversation" aria-label="Clear conversation"><i className="bi bi-arrow-counterclockwise" /></button>
            )}
            <button type="button" className="ai-icon-btn" onClick={() => setOpen(false)} title="Close" aria-label="Close"><i className="bi bi-x-lg" /></button>
          </header>

          <div className="ai-body" ref={listRef} aria-live="polite">
            {messages.length === 0 && (
              <div className="ai-welcome">
                <img src="/images/ritual-rings.svg" alt="" width={64} height={64} className="ai-welcome-icon" />
                <h3>Namaste{name ? `, ${name}` : ''}!</h3>
                <p>I can find matches for you, explain plans, and help with your profile, interests, privacy and safety.</p>
                <div className="ai-chips">
                  {suggestions.map((s) => <button key={s} type="button" className="ai-chip" onClick={() => send(s)}>{s}</button>)}
                </div>
              </div>
            )}

            {messages.map((m, i) => (
              <div key={i} className={`ai-msg ${m.role}`}>
                {m.role === 'assistant' && <span className="ai-msg-avatar"><span className="brand-mark" aria-hidden="true" /></span>}
                <div className="ai-msg-col">
                  <div className="ai-bubble"><RichText text={m.content} /></div>

                  {m.cards?.length > 0 && (
                    <div className="ai-cards">
                      {m.cards.map((c) => (
                        <Link key={c.matri_id} href={`/matrimoney/profile-details/${c.matri_id}`} className="ai-card">
                          <img src={c.photo || avatarFor(c.gender)} alt={c.name}
                            className={c.photo ? '' : 'is-avatar'}
                            onError={(e) => { e.currentTarget.onerror = null; e.currentTarget.src = avatarFor(c.gender); e.currentTarget.className = 'is-avatar'; }} />
                          <div className="ai-card-body">
                            <div className="ai-card-name">{c.name}{c.verified && <i className="bi bi-patch-check-fill ms-1" />}</div>
                            <div className="ai-card-meta">{[c.age && `${c.age} yrs`, c.city].filter(Boolean).join(' · ') || c.matri_id}</div>
                            <div className="ai-card-meta">{[c.religion, c.caste].filter(Boolean).join(' · ')}</div>
                            <span className="ai-card-cta">View profile →</span>
                          </div>
                        </Link>
                      ))}
                    </div>
                  )}

                  {m.actions?.length > 0 && (
                    <div className="ai-actions">
                      {m.actions.map((a) => (
                        <Link key={a.href + a.label} href={a.href} className="ai-action" onClick={() => setOpen(window.innerWidth >= 576)}>
                          {a.label} <i className="bi bi-arrow-right" />
                        </Link>
                      ))}
                    </div>
                  )}
                  <div className="ai-time">{time(m.at)}</div>
                </div>
              </div>
            ))}

            {loading && (
              <div className="ai-msg assistant">
                <span className="ai-msg-avatar"><span className="brand-mark" aria-hidden="true" /></span>
                <div className="ai-bubble ai-typing" aria-label="Assistant is typing"><span /><span /><span /></div>
              </div>
            )}

            {lastIsAssistant && !loading && (
              <div className="ai-chips ai-followups">
                {FOLLOW_UPS.map((s) => <button key={s} type="button" className="ai-chip" onClick={() => send(s === 'Talk to support' ? 'contact support' : s === 'Safety tips' ? 'safety' : s)}>{s}</button>)}
              </div>
            )}
          </div>

          <form className="ai-input" onSubmit={(e) => { e.preventDefault(); send(); }}>
            <textarea
              ref={inputRef}
              rows={1}
              maxLength={500}
              value={input}
              placeholder={loggedIn ? 'Try “Brides in Bhubaneswar, 24–28”' : 'Ask about registration, plans, safety…'}
              onChange={(e) => {
                setInput(e.target.value);
                e.target.style.height = 'auto';
                e.target.style.height = `${Math.min(e.target.scrollHeight, 110)}px`;
              }}
              onKeyDown={(e) => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); send(); } }}
              aria-label="Message the assistant"
            />
            <button type="submit" className="ai-send" disabled={!input.trim() || loading} aria-label="Send">
              <i className="bi bi-send-fill" />
            </button>
          </form>
          <div className="ai-foot">Answers use MatriMoney’s live data. For account issues, <Link href="/matrimoney/contactus">contact support</Link>.</div>
        </section>
      )}
    </>
  );
}
