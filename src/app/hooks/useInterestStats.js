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

        // 1) interest stats (received + accepted)
        const r1 = await fetch("/api/interest?mode=stats", {
          credentials: "include",
          cache: "no-store",
        });
        const j1 = r1.ok ? await r1.json() : {};
        const received = Number(j1.received || 0);
        const accepted = Number(j1.accepted || 0);

        // 2) viewed profile count
        const r2 = await fetch("/api/matches/who-viewed-myprofile?count=1", {
          credentials: "include",
          cache: "no-store",
        });
        const j2 = r2.ok ? await r2.json() : {};
        const viewed =
          Number(j2.total ?? j2.count ?? 0) ||
          (Array.isArray(j2.results) ? j2.results.length : 0);

        if (!alive) return;
        setStats({ received, accepted, viewed });
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
