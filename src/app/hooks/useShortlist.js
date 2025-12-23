"use client";
import { useEffect, useState } from "react";

export function useShortlist({ limit = 20, offset = 0 } = {}) {
  const [items, setItems] = useState([]);
  const [meta, setMeta] = useState({ total: 0, limit, offset, page: 1 });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    let alive = true;

    async function load() {
      try {
        setLoading(true);
        setError("");

        const page = Math.floor(offset / limit) + 1;
        const qs = new URLSearchParams({
          type: "sent",           // "my shortlist" = interests I sent
          page: String(page),
          limit: String(limit),
        });

        const res = await fetch(`/api/interest?${qs.toString()}`, {
          credentials: "include",
          cache: "no-store",
        });

        if (!res.ok) {
          if (!alive) return;
          setError(`Failed to load shortlist (${res.status})`);
          setItems([]);
          setMeta((m) => ({ ...m, total: 0 }));
          setLoading(false);
          return;
        }

        const data = await res.json().catch(() => ({}));
        if (!alive) return;

        const rows = data.results || [];

        const mapped = rows.map((row) => ({
          ...row, // pass through all enriched fields (full_name, photo_url, etc.)
          // ensures we have a fallback for critical fields if needed, but API should provide them
        }));

        setItems(mapped);
        setMeta({
          total: data.total ?? rows.length,
          limit,
          offset,
          page: data.page ?? page,
        });
      } catch (e) {
        if (!alive) return;
        setError("Failed to load shortlist");
        setItems([]);
      } finally {
        if (alive) setLoading(false);
      }
    }

    load();
    return () => {
      alive = false;
    };
  }, [limit, offset]);

  return { items, meta, loading, error };
}
