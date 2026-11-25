// Public community landing pages for search engines (e.g. /matrimony/odia-matrimony).
// Static content + FAQ structured data. No member data is shown here.
import Link from "next/link";
import { notFound } from "next/navigation";
import { COMMUNITIES, COMMUNITY_FAQ, SITE_URL } from "@/lib/seo";

export const dynamicParams = false;

export function generateStaticParams() {
  return Object.keys(COMMUNITIES).map((slug) => ({ slug }));
}

export async function generateMetadata({ params }) {
  const { slug } = await params;
  const c = COMMUNITIES[slug];
  if (!c) return {};
  const url = `${SITE_URL}/matrimony/${slug}`;
  return {
    title: `${c.title} | MatriMoney`,
    description: c.intro,
    alternates: { canonical: url },
    openGraph: { title: c.title, description: c.intro, url, type: "website", siteName: "MatriMoney" },
  };
}

export default async function CommunityPage({ params }) {
  const { slug } = await params;
  const c = COMMUNITIES[slug];
  if (!c) notFound();
  const faq = COMMUNITY_FAQ(c.name);
  const jsonLd = {
    "@context": "https://schema.org",
    "@type": "FAQPage",
    mainEntity: faq.map((f) => ({ "@type": "Question", name: f.q, acceptedAnswer: { "@type": "Answer", text: f.a } })),
  };
  const others = Object.entries(COMMUNITIES).filter(([s]) => s !== slug);

  return (
    <div className="cm-page">
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }} />
      <section className="cm-hero">
        <div className="container">
          <span className="eyebrow light mb-3">MatriMoney · {c.name}</span>
          <h1 className="cm-title">{c.title}</h1>
          <p className="cm-lead">{c.intro}</p>
          <div className="d-flex flex-wrap gap-3">
            <Link href="/#join" className="btn btn-gold btn-lg">Register free <i className="bi bi-arrow-right ms-1" /></Link>
            <Link href={c.search} className="btn btn-glass btn-lg">Search {c.name} profiles</Link>
          </div>
        </div>
      </section>

      <section className="container py-5">
        <div className="row g-4">
          {c.points.map((p, i) => (
            <div key={p} className="col-md-4">
              <div className="cm-point">
                <span className="cm-num">{i + 1}</span>
                <p className="mb-0">{p}</p>
              </div>
            </div>
          ))}
        </div>

        <div className="row g-4 mt-2">
          <div className="col-lg-7">
            <h2 className="cm-h2">Frequently asked questions</h2>
            <div className="cm-faq">
              {faq.map((f) => (
                <details key={f.q}>
                  <summary>{f.q}</summary>
                  <p>{f.a}</p>
                </details>
              ))}
            </div>
          </div>
          <div className="col-lg-5">
            <div className="cm-side">
              <h2 className="cm-h2" style={{ fontSize: "1.6rem" }}>Explore more</h2>
              <ul>
                {others.map(([s, o]) => <li key={s}><Link href={`/matrimony/${s}`}>{o.name} matrimony</Link></li>)}
              </ul>
              <Link href="/matrimoney/safety" className="small fw-semibold text-danger"><i className="bi bi-shield-check me-1" />Read our safety guide</Link>
            </div>
          </div>
        </div>
      </section>
    </div>
  );
}
