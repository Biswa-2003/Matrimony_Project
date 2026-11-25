"use client";

// Lightweight i18n: the chosen language lives in a `mm_lang` cookie (1 year) and React context.
// Pages stay statically rendered in English; the saved language is applied right after load.
import { createContext, useCallback, useContext, useEffect, useMemo, useState } from "react";
import { DICT, LANGS } from "./dict";

const Ctx = createContext({ lang: "en", setLang: () => {}, t: (k, fb) => DICT.en[k] ?? fb ?? k });
const VALID = new Set(LANGS.map((l) => l.code));

function readCookie() {
  if (typeof document === "undefined") return "en";
  const m = document.cookie.match(/(?:^|;\s*)mm_lang=([a-z]{2})/);
  return m && VALID.has(m[1]) ? m[1] : "en";
}

export function LanguageProvider({ children }) {
  const [lang, setLangState] = useState("en");

  useEffect(() => {
    const saved = readCookie();
    if (saved !== "en") setLangState(saved);
  }, []);

  useEffect(() => {
    document.documentElement.lang = lang === "or" ? "or" : lang;
  }, [lang]);

  const setLang = useCallback((code) => {
    if (!VALID.has(code)) return;
    document.cookie = `mm_lang=${code}; path=/; max-age=${60 * 60 * 24 * 365}; samesite=lax`;
    setLangState(code);
  }, []);

  const t = useCallback((key, fallback) => DICT[lang]?.[key] ?? DICT.en[key] ?? fallback ?? key, [lang]);
  const value = useMemo(() => ({ lang, setLang, t }), [lang, setLang, t]);
  return <Ctx.Provider value={value}>{children}</Ctx.Provider>;
}

export const useI18n = () => useContext(Ctx);
