"use client";

// Registers the service worker (production only) and offers "Install the app".
// Android/desktop Chrome & Edge: native install prompt. iPhone: shows Add-to-Home-Screen steps.
import { useEffect, useState } from "react";
import { useI18n } from "@/lib/i18n/LanguageProvider";

let deferredPrompt = null;
const listeners = new Set();

if (typeof window !== "undefined") {
  window.addEventListener("beforeinstallprompt", (e) => {
    e.preventDefault();
    deferredPrompt = e;
    listeners.forEach((fn) => fn(true));
  });
  window.addEventListener("appinstalled", () => {
    deferredPrompt = null;
    listeners.forEach((fn) => fn(false));
  });
}

export function ServiceWorkerRegister() {
  useEffect(() => {
    if (process.env.NODE_ENV !== "production" || !("serviceWorker" in navigator)) return;
    navigator.serviceWorker.register("/sw.js").catch(() => {});
  }, []);
  return null;
}

export default function InstallAppButton() {
  const { t } = useI18n();
  const [canPrompt, setCanPrompt] = useState(false);
  const [installed, setInstalled] = useState(false);
  const [ios, setIos] = useState(false);
  const [showIos, setShowIos] = useState(false);

  useEffect(() => {
    setCanPrompt(Boolean(deferredPrompt));
    setInstalled(window.matchMedia?.("(display-mode: standalone)")?.matches || window.navigator.standalone === true);
    setIos(/iphone|ipad|ipod/i.test(window.navigator.userAgent));
    const fn = (v) => setCanPrompt(v);
    listeners.add(fn);
    return () => listeners.delete(fn);
  }, []);

  if (installed) return null;

  const install = async () => {
    if (deferredPrompt) {
      deferredPrompt.prompt();
      await deferredPrompt.userChoice.catch(() => {});
      deferredPrompt = null;
      setCanPrompt(false);
    } else {
      setShowIos(true);
    }
  };

  return (
    <div className="install-app">
      <button type="button" className="install-btn" onClick={install}>
        <i className="bi bi-phone" />
        <span>
          <strong>{t("footer.install")}</strong>
          <small>{t("footer.installSub")}</small>
        </span>
      </button>
      {showIos && (
        <div className="install-help" role="dialog" aria-label="How to install">
          {ios ? (
            <ol>
              <li>Tap the <i className="bi bi-box-arrow-up" /> <strong>Share</strong> button in Safari</li>
              <li>Choose <strong>Add to Home Screen</strong></li>
              <li>Tap <strong>Add</strong> — MatriMoney opens like an app</li>
            </ol>
          ) : canPrompt ? null : (
            <p className="mb-0">Open this site in Chrome or Edge and choose <strong>Install app</strong> (or <strong>Add to Home screen</strong>) from the browser menu.</p>
          )}
          <button type="button" className="install-close" onClick={() => setShowIos(false)} aria-label="Close"><i className="bi bi-x" /></button>
        </div>
      )}
    </div>
  );
}
