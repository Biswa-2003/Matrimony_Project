import Link from 'next/link';

export const metadata = { title: 'Page not found — MatriMoney' };

export default function NotFound() {
  return (
    <div className="d-flex align-items-center justify-content-center py-5 paisley-bg" style={{ minHeight: '70vh' }}>
      <div className="luxe-card p-5 text-center" style={{ maxWidth: 520 }}>
        <div className="stat-num gold-text" style={{ fontSize: '5rem' }}>404</div>
        <h1 className="mb-2" style={{ fontSize: '2.2rem' }}>This page wandered off</h1>
        <p className="text-muted mb-4">The page you&apos;re looking for doesn&apos;t exist or has moved.</p>
        <div className="d-flex gap-2 justify-content-center flex-wrap">
          <Link href="/" className="btn btn-primary px-4">Back to Home</Link>
          <Link href="/matrimoney/matches/overall" className="btn btn-outline-danger px-4">Browse Matches</Link>
        </div>
      </div>
    </div>
  );
}
