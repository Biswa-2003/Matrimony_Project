import PageBanner from '@/app/components/PageBanner';

/** Shared layout for Privacy / Terms / Safety pages. sections: [{ title, body: (string|JSX)[] }] */
export default function LegalPage({ eyebrow, title, subtitle, updated, sections, note }) {
  return (
    <div className="page-surface pb-5">
      <PageBanner eyebrow={eyebrow} title={title} subtitle={subtitle} compact />
      <div className="container py-5">
        <div className="row g-4">
          <aside className="col-lg-3 d-none d-lg-block">
            <nav className="luxe-card p-4 position-sticky" style={{ top: 100 }}>
              <span className="eyebrow mb-3" style={{ fontSize: '0.6rem' }}>Contents</span>
              <ol className="small ps-3 mb-0 d-flex flex-column gap-2">
                {sections.map((s, i) => (
                  <li key={s.title}>
                    <a href={`#s${i + 1}`} className="text-maroon">{s.title}</a>
                  </li>
                ))}
              </ol>
            </nav>
          </aside>
          <article className="col-lg-9">
            <div className="luxe-card p-4 p-lg-5">
              {updated && <p className="small text-muted mb-4">Last updated: {updated}</p>}
              {note && (
                <div className="alert py-2 small mb-4" style={{ background: 'var(--gold-pale)', border: '1px dashed var(--gold)' }}>
                  <i className="bi bi-info-circle me-1" /> {note}
                </div>
              )}
              {sections.map((s, i) => (
                <section key={s.title} id={`s${i + 1}`} className="mb-4" style={{ scrollMarginTop: 110 }}>
                  <h2 className="mb-3" style={{ fontSize: '1.7rem' }}>
                    {i + 1}. {s.title}
                  </h2>
                  {s.body.map((p, j) =>
                    typeof p === 'string' ? (
                      <p key={j} className="text-muted" style={{ lineHeight: 1.8 }}>{p}</p>
                    ) : (
                      <div key={j} className="text-muted mb-3" style={{ lineHeight: 1.8 }}>{p}</div>
                    )
                  )}
                </section>
              ))}
            </div>
          </article>
        </div>
      </div>
    </div>
  );
}
