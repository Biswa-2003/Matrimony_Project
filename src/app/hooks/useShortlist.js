"use client";
import { useCallback, useEffect, useState } from "react";

/**
 * My real shortlist (from /api/shortlist). Previously this showed "interests I sent" instead.
 * Items keep the field names the Shortlist page already uses (id, photo_url, age_years, …).
 */
export function useShortlist({ limit = 50, offset = 0 } = {}) {
  const [items, setItems] = useState([]);
  const [meta, setMeta] = useState({ total: 0, limit, offset, page: 1 });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    let alive = true;
    (async () => {
      try {
        setLoading(true);
        setError("");
        const res = await fetch("/api/shortlist", { credentials: "include", cache: "no-store" });
        const data = await res.json().catch(() => ({}));
        if (!alive) return;
        if (!res.ok) throw new Error(data.error || `Failed to load shortlist (${res.status})`);
        const rows = (data.results || []).slice(offset, offset + limit).map((r) => ({
          ...r,
          id: r.matri_id,
          photo_url: r.photo,
          age_years: r.age,
          status: "shortlisted",
        }));
        setItems(rows);
        setMeta({ total: data.total ?? rows.length, limit, offset, page: Math.floor(offset / limit) + 1 });
      } catch (e) {
        if (alive) {
          setError(e.message || "Failed to load shortlist");
          setItems([]);
        }
      } finally {
        if (alive) setLoading(false);
      }
    })();
    return () => {
      alive = false;
    };
  }, [limit, offset]);

  /** Remove a member from the shortlist (optimistic). */
  const remove = useCallback(async (matriId) => {
    let snapshot;
    setItems((prev) => {
      snapshot = prev;
      return prev.filter((it) => it.matri_id !== matriId);
    });
    setMeta((m) => ({ ...m, total: Math.max(0, m.total - 1) }));
    const r = await fetch(`/api/shortlist?matri_id=${encodeURIComponent(matriId)}`, { method: "DELETE" }).catch(() => null);
    if (!r || !r.ok) {
      setItems(snapshot);
      setMeta((m) => ({ ...m, total: m.total + 1 }));
    }
  }, []);

  return { items, meta, loading, error, remove };
}
