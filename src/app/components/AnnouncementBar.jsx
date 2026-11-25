'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useSiteContent } from '@/lib/site-content-client';

/** Site-wide announcement set from Admin → Site Settings. Members can dismiss it (per announcement text). */
export default function AnnouncementBar() {
  const pathname = usePathname();
  const { announcement: a } = useSiteContent();
  const [hidden, setHidden] = useState(true);
  const key = a?.text ? `mm:announce:${a.text}` : null;

  useEffect(() => {
    if (!key) return;
    try {
      setHidden(sessionStorage.getItem(key) === '1');
    } catch {
      setHidden(false);
    }
  }, [key]);

  if (pathname?.startsWith('/admin') || !a?.enabled || !a.text || hidden) return null;

  const dismiss = () => {
    setHidden(true);
    try { sessionStorage.setItem(key, '1'); } catch {}
  };

  return (
    <div className={`announce-bar tone-${a.tone || 'gold'}`} role="region" aria-label="Announcement">
      <div className="container d-flex align-items-center justify-content-center gap-3">
        <i className="bi bi-megaphone-fill flex-shrink-0" />
        <span className="text-truncate">{a.text}</span>
        {a.linkUrl && a.linkText && (
          <Link href={a.linkUrl} className="announce-link flex-shrink-0">{a.linkText} →</Link>
        )}
        <button type="button" className="announce-close" onClick={dismiss} aria-label="Dismiss announcement"><i className="bi bi-x" /></button>
      </div>
    </div>
  );
}
