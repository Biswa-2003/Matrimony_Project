"use client";

import { useEffect, useRef, useState } from "react";
import { useI18n } from "@/lib/i18n/LanguageProvider";
import { LANGS } from "@/lib/i18n/dict";

export default function LanguageSwitcher({ dark = false }) {
  const { lang, setLang, t } = useI18n();
  const [open, setOpen] = useState(false);
  const ref = useRef(null);
  const current = LANGS.find((l) => l.code === lang) || LANGS[0];

  useEffect(() => {
    if (!open) return;
    const close = (e) => !ref.current?.contains(e.target) && setOpen(false);
    const esc = (e) => e.key === "Escape" && setOpen(false);
    document.addEventListener("mousedown", close);
    document.addEventListener("keydown", esc);
    return () => { document.removeEventListener("mousedown", close); document.removeEventListener("keydown", esc); };
  }, [open]);

  return (
    <div className={`lang-switch ${dark ? "dark" : ""}`} ref={ref}>
      <button type="button" className="lang-btn" onClick={() => setOpen((o) => !o)} aria-haspopup="listbox" aria-expanded={open}
        aria-label={`${t("nav.language")}: ${current.label}`}>
        <i className="bi bi-translate" /> <span>{current.short}</span>
      </button>
      {open && (
        <ul className="lang-menu" role="listbox" aria-label={t("nav.language")}>
          {LANGS.map((l) => (
            <li key={l.code}>
              <button type="button" role="option" aria-selected={l.code === lang} className={l.code === lang ? "on" : ""}
                onClick={() => { setLang(l.code); setOpen(false); }} lang={l.code}>
                {l.label} {l.code === lang && <i className="bi bi-check2 ms-auto" />}
              </button>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
