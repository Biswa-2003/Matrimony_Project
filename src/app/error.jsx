'use client';

import { useEffect } from 'react';
import Link from 'next/link';

/** Route-level error boundary: a crash in one page shows this instead of a blank screen. */
export default function Error({ error, reset }) {
  useEffect(() => {
    console.error('[page error]', error);
    // report to the admin health view (no personal data: message + path only)
    fetch('/api/client-error', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ message: String(error?.message || error).slice(0, 500), path: window.location.pathname, digest: error?.digest }),
      keepalive: true,
    }).catch(() => {});
  }, [error]);

  return (
    <div className="d-flex align-items-center justify-content-center py-5 paisley-bg" style={{ minHeight: '70vh' }}>
      <div className="luxe-card p-5 text-center" style={{ maxWidth: 500 }}>
        <div className="why-icon"><i className="bi bi-flower1" /></div>
        <h1 className="mb-2" style={{ fontSize: '2.2rem' }}>Something went wrong</h1>
        <p className="text-muted mb-4">
          We hit an unexpected problem loading this page. Please try again — your data is safe.
        </p>
        <div className="d-flex gap-2 justify-content-center">
          <button className="btn btn-primary px-4" onClick={() => reset()}>Try again</button>
          <Link href="/" className="btn btn-outline-danger px-4">Go home</Link>
        </div>
      </div>
    </div>
  );
}
