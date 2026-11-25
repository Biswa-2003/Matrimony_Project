'use client';

/**
 * Scene3D — safe wrapper around the WebGL LoveScene.
 *  - Loaded client-side only (no SSR for WebGL).
 *  - Falls back to a CSS gradient/glow if WebGL is unavailable or the user prefers reduced motion.
 *  - Pauses rendering when scrolled out of view to save battery/CPU.
 */

import dynamic from 'next/dynamic';
import { useEffect, useRef, useState } from 'react';

const LoveScene = dynamic(() => import('./LoveScene'), { ssr: false, loading: () => null });

function supportsWebGL() {
  try {
    const c = document.createElement('canvas');
    return !!(window.WebGLRenderingContext && (c.getContext('webgl2') || c.getContext('webgl')));
  } catch {
    return false;
  }
}

export default function Scene3D({ variant = 'hero', className = '', style }) {
  const ref = useRef(null);
  const [enabled, setEnabled] = useState(false);
  const [visible, setVisible] = useState(true);

  useEffect(() => {
    const reduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    setEnabled(!reduced && supportsWebGL());
  }, []);

  useEffect(() => {
    if (!ref.current) return;
    const io = new IntersectionObserver(([e]) => setVisible(e.isIntersecting), { threshold: 0 });
    io.observe(ref.current);
    return () => io.disconnect();
  }, []);

  return (
    <div ref={ref} className={`scene3d ${className}`} style={style} aria-hidden="true">
      {enabled ? <LoveScene variant={variant} paused={!visible} /> : <div className="scene3d-fallback" />}
    </div>
  );
}
