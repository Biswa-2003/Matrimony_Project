"use client";
import { useEffect, useState } from "react";

export function useInterests({ type = "received", status = "sent", page = 1, limit = 20 } = {}) {
  const [items, setItems] = useState([]);
  const [meta, setMeta] = useState({ total: 0, page, limit });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [version, setVersion] = useState(0); // bump to refetch

  useEffect(() => {
    let alive = true;

    async function load() {
      try {
        setLoading(true);
        setError("");

        const qs = new URLSearchParams({
          type,
          status,
          page: String(page),
          limit: String(limit),
        });

        const res = await fetch(`/api/interest?${qs.toString()}`, {
          credentials: "include",
          cache: "no-store",
        });
        if (!res.ok) {
          if (!alive) return;
          setError(`Failed to load interests (${res.status})`);
          setItems([]);
          setLoading(false);
          return;
        }

        const data = await res.json().catch(() => ({}));
        if (!alive) return;

        const rows = data.results || [];

        // The API now returns enriched "partner" details directly
        const mapped = rows.map((row) => ({
          ...row,
          // helper for height label if needed (though API returns height_cm)
          // we can just pass everything through
        }));

        setItems(mapped);
        setMeta({
          total: data.total ?? rows.length,
          page: data.page ?? page,
          limit,
        });
      } catch (e) {
        if (!alive) return;
        setError("Failed to load interests");
        setItems([]);
      } finally {
        if (alive) setLoading(false);
      }
    }

    load();

    return () => {
      alive = false;
    };
  }, [type, status, page, limit, version]);

  const refetch = () => setVersion((v) => v + 1);

  return { items, meta, loading, error, refetch };
}
