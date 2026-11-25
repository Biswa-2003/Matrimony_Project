'use client';

import { useEffect, useRef } from 'react';

/**
 * <img> that swaps to a fallback when the file is missing.
 * Usable from Server Components (which can't attach onError themselves).
 *
 * Server-rendered images can fail to load BEFORE React hydrates and attaches
 * onError, so we also check on mount whether the browser already gave up.
 */
export default function SafeImage({ src, fallback, fallbackStyle, style, alt = '', ...rest }) {
  const ref = useRef(null);

  const applyFallback = (img) => {
    if (!img || !fallback || img.dataset.fallback) return;
    img.dataset.fallback = '1';
    img.src = fallback;
    Object.assign(img.style, fallbackStyle || {});
  };

  useEffect(() => {
    const img = ref.current;
    if (img && img.complete && img.naturalWidth === 0 && src) applyFallback(img);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [src]);

  return (
    <img
      ref={ref}
      src={src || fallback}
      alt={alt}
      style={src ? style : { ...style, ...fallbackStyle }}
      onError={(e) => applyFallback(e.currentTarget)}
      {...rest}
    />
  );
}
