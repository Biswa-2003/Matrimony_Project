'use client';
import { useEffect } from 'react';

export default function BootstrapClientLoader() {
  useEffect(() => {
    import('bootstrap/dist/js/bootstrap.bundle.min.js')
      .then(() => {
        console.log("✅ Bootstrap JS loaded on client");
      })
      .catch((err) => {
        console.error("❌ Bootstrap JS failed:", err);
      });
  }, []);

  return null;
}
