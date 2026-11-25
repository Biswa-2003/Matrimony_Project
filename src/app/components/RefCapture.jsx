"use client";

// Remembers an invite code from any URL like /?ref=MMAB12CD for 30 days, so it's applied at sign-up.
import { useEffect } from "react";
import { useSearchParams } from "next/navigation";

export default function RefCapture() {
  const params = useSearchParams();
  useEffect(() => {
    const ref = String(params?.get("ref") || "").toUpperCase().replace(/[^A-Z0-9]/g, "").slice(0, 12);
    if (ref.length >= 4) {
      document.cookie = `mm_ref=${ref}; path=/; max-age=${60 * 60 * 24 * 30}; samesite=lax`;
    }
  }, [params]);
  return null;
}
