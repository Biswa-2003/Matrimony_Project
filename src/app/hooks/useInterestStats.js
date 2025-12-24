"use client";
import { useEffect, useState } from "react";

export function useInterestStats() {
  const [stats, setStats] = useState({
    received: 0,
    accepted: 0,
    viewed: 0,
  });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    let alive = true;

    async function load() {
      try {
        setLoading(true);
        setError("");

        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), 10000); // 10 second timeout

        try {
          // ⚡ Fetch BOTH APIs in parallel
          const [r1, r2] = await Promise.all([
            fetch("/api/interest?mode=stats", {
              credentials: "include",
              cache: "no-store",
              signal: controller.signal
            }),
            fetch("/api/matches/who-viewed-myprofile?count=1", {
              credentials: "include",
              cache: "no-store",
              signal: controller.signal
            })
          ]);

          clearTimeout(timeoutId);

          const j1 = r1.ok ? await r1.json() : {};
          const received = Number(j1.received || 0);
          const accepted = Number(j1.accepted || 0);

          const j2 = r2.ok ? await r2.json() : {};
          const viewed =
            Number(j2.total ?? j2.count ?? 0) ||
            (Array.isArray(j2.results) ? j2.results.length : 0);

          if (!alive) return;
          setStats({ received, accepted, viewed });
        } catch (fetchError) {
          clearTimeout(timeoutId);
          if (fetchError.name === 'AbortError') {
            console.warn('Interest stats request timed out after 10 seconds');
          }
          throw fetchError;
        }
      } catch (e) {
        if (!alive) return;
        setError("Failed to load stats");
      } finally {
        if (alive) setLoading(false);
      }
    }

    load();
    return () => {
      alive = false;
    };
  }, []);

  return { stats, loading, error };
}
