'use client';

import { useEffect, useState } from 'react';

/** Built-in artwork, used until /api/site-content answers (and if it fails). Keep in sync with MEDIA_SLOTS. */
export const DEFAULT_MEDIA = {
  home_hero: '/images/couple-mandap.svg',
  home_welcome: '/images/couple-mandap.svg',
  auth_art: '/images/couple-mandap.svg',
  tradition_1: '/images/ritual-rings.svg',
  tradition_2: '/images/ritual-mehendi.svg',
  tradition_3: '/images/ritual-diya.svg',
  tradition_4: '/images/ritual-kalash.svg',
  story_placeholder: '/images/couple-mandap.svg',
};

let cache = null;
let inflight = null;

function load() {
  if (cache) return Promise.resolve(cache);
  if (!inflight) {
    inflight = fetch('/api/site-content')
      .then((r) => (r.ok ? r.json() : null))
      .then((j) => {
        cache = { media: { ...DEFAULT_MEDIA, ...(j?.media || {}) }, announcement: j?.announcement || { enabled: false } };
        return cache;
      })
      .catch(() => ({ media: DEFAULT_MEDIA, announcement: { enabled: false } }))
      .finally(() => {
        inflight = null;
      });
  }
  return inflight;
}

/** One shared request per page load for all admin-managed images + the announcement bar. */
export function useSiteContent() {
  const [content, setContent] = useState(cache || { media: DEFAULT_MEDIA, announcement: { enabled: false } });
  useEffect(() => {
    let alive = true;
    load().then((c) => alive && setContent(c));
    return () => {
      alive = false;
    };
  }, []);
  return content;
}

export const isCustomImage = (url) => Boolean(url) && !String(url).startsWith('/images/');
