'use client';

import { Reveal } from '@/app/components/motion';

/**
 * Royal maroon banner for inner pages: eyebrow, serif title, subtitle, slow-turning mandala.
 *   <PageBanner eyebrow="Our Story" title="About MatriMoney" subtitle="..." />
 */
export default function PageBanner({ eyebrow, title, subtitle, children, compact = false }) {
  return (
    <section className="page-banner" style={compact ? { padding: '3rem 0 2.5rem' } : undefined}>
      <div className="mandala-deco light" aria-hidden="true" />
      <div className="container position-relative">
        <Reveal>
          {eyebrow && <span className="eyebrow light mb-3">{eyebrow}</span>}
          <h1 className="mb-0">{title}</h1>
          <span className="ornament" aria-hidden="true" />
          {subtitle && <p>{subtitle}</p>}
          {children}
        </Reveal>
      </div>
    </section>
  );
}
