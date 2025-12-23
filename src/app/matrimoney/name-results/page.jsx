"use client";

import React, { useEffect, useMemo, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import MatriNav from "@/app/components/matrinav";
import ProfileResultCard from "@/app/components/ProfileResultCard";
import 'bootstrap/dist/css/bootstrap.min.css';

/* helpers */
const cmToFeetInches = (cm) => {
  const n = Number(cm);
  if (!n || Number.isNaN(n)) return "";
  const total = Math.round(n / 2.54);
  const ft = Math.floor(total / 12);
  const inch = total % 12;
  return `${ft}ft ${inch}in`;
};

const nameFrom = (r) =>
  (r.full_name && r.full_name.trim()) ||
  [r.first_name, r.last_name].filter(Boolean).join(" ").trim() ||
  r.matri_id ||
  "—";

export default function NameResultsPage() {
  const router = useRouter();
  const params = useSearchParams();
  const initialName = (params.get("name") || "").trim();

  const [q, setQ] = useState(initialName);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [rows, setRows] = useState([]);

  // Text-first parser so an empty body never crashes
  const parseSafely = async (res) => {
    const text = await res.text();               // read once
    if (!text || !text.trim()) return {};        // empty body -> safe
    try {
      return JSON.parse(text);
    } catch {
      console.warn("API returned non-JSON:", text.slice(0, 100));
      return {};
    }
  };

  const fetchResults = async (name) => {
    const term = (name || "").trim();
    if (!term) { setRows([]); return; }

    setLoading(true);
    setError("");
    setRows([]);

    try {
      // Try GET first
      let res = await fetch(`/api/name-search?q=${encodeURIComponent(term)}&limit=50&page=1`, {
        cache: "no-store",
      });

      // Fallback to POST if GET isn’t exported
      if (res.status === 405) {
        res = await fetch("/api/name-search", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ q: term, limit: 50, page: 1 }),
        });
      }

      const data = await parseSafely(res);
      if (!res.ok || data?.error) throw new Error(data?.error || `HTTP ${res.status}`);

      const results = Array.isArray(data.results)
        ? data.results
        : Array.isArray(data)
          ? data
          : [];
      setRows(results);
    } catch (e) {
      setError(e.message || "Something went wrong");
    } finally {
      setLoading(false);
    }
  };

  // Load when arriving with ?name=
  useEffect(() => {
    if (initialName) {
      fetchResults(initialName);
      setQ(initialName);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [initialName]);

  const submit = (e) => {
    e.preventDefault();
    const value = q.trim();
    if (!value) return;
    router.push(`/matrimoney/name-results?name=${encodeURIComponent(value)}`);
    // Router push will update searchParams, triggering the effect? 
    // Actually, useSearchParams might not trigger re-render immediately if using same route.
    // Explicit call ensures responsiveness.
    fetchResults(value);
  };

  // Map API rows -> ProfileResultCard Format
  const profiles = useMemo(() => {
    return rows.map((r) => ({
      name: nameFrom(r),
      matriId: r.matri_id || "",
      photo: r.photo_url || null,
      profileUrl: r.matri_id ? `/matrimoney/profile-details/${encodeURIComponent(r.matri_id)}` : "#",
      details: {
        Age: r.age_years != null ? String(r.age_years) : "—",
        Location: [r.city_name, r.state_name].filter(Boolean).join(", ") || r.country_name || "—",
        Religion: r.religion_name,
        Caste: r.caste_name,
      },
    }));
  }, [rows]);

  return (
    <>
      <MatriNav />
      <div style={{ height: 80 }}></div>

      <div className="container py-4 results-root">
        {/* header */}
        <div className="d-flex align-items-center justify-content-between flex-wrap gap-3 mb-4">
          <div>
            <h4 className="mb-1 text-maroon fw-bold">
              Matches Found <span className="fw-normal text-muted fs-6">({profiles.length})</span>
            </h4>
            <p className="text-muted small mb-0">Searching for: <strong>{initialName || '...'}</strong></p>
          </div>

          <button type="button" className="btn btn-outline-secondary btn-sm" onClick={() => router.back()}>
            ← Back
          </button>
        </div>

        {/* Search Bar */}
        <div className="card border-0 shadow-sm p-3 mb-4 bg-white rounded-3">
          <form onSubmit={submit} className="row g-2 align-items-center">
            <div className="col-auto"><label className="col-form-label fw-semibold text-secondary">Search Name or ID:</label></div>
            <div className="col">
              <input
                type="text"
                value={q}
                onChange={(e) => setQ(e.target.value)}
                className="form-control"
                placeholder="Type Name or Matri ID (e.g. Priyanka or DU123)"
                required
              />
            </div>
            <div className="col-auto"><button className="btn btn-primary px-4" type="submit">Search</button></div>
          </form>
        </div>

        {loading && (
          <div className="text-center py-5">
            <div className="spinner-border text-primary" role="status">
              <span className="visually-hidden">Loading...</span>
            </div>
            <p className="mt-2 text-muted">Searching profiles...</p>
          </div>
        )}

        {error && <div className="alert alert-danger shadow-sm border-0">{error}</div>}

        {!loading && !error && !initialName && (
          <div className="alert alert-light border shadow-sm text-center py-4">
            Please enter a name or Matrimony ID to start searching.
          </div>
        )}

        {/* Results Grid */}
        <div className="row row-cols-1 row-cols-md-2 row-cols-lg-3 g-4">
          {profiles.map((p, idx) => (
            <div className="col" key={p.matriId || idx}>
              <ProfileResultCard p={p} />
            </div>
          ))}
        </div>

        {!loading && !error && initialName && profiles.length === 0 && (
          <div className="text-center py-5 bg-light rounded-3">
            <p className="text-muted mb-0">No profiles found for <strong>{initialName}</strong>.</p>
            <p className="text-muted small">Try checking the spelling or searching by ID.</p>
          </div>
        )}
      </div>

      <style jsx global>{`
        .results-root {
          min-height: 80vh;
        }
        .text-maroon { color: var(--brand-maroon, #800020) !important; }
        .btn-primary {
           background-color: var(--brand-primary, #E33183);
           border-color: var(--brand-primary, #E33183);
        }
        .btn-primary:hover {
           background-color: #c21e6b;
           border-color: #c21e6b;
        }
      `}</style>
    </>
  );
}
