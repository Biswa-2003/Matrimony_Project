"use client";

import { useEffect, useState } from "react";
import MemberCard from "@/app/components/MemberCard";

/** "You may also like" — members similar to the one being viewed (same religion, nearby age). */
export default function SimilarProfiles({ matriId, religionId, age }) {
  const [items, setItems] = useState([]);
  const [toast, setToast] = useState("");

  useEffect(() => {
    const body = { limit: 5, sort: "updated" };
    if (religionId) body.religionIds = [religionId];
    if (age) {
      body.ageMin = Math.max(18, age - 3);
      body.ageMax = age + 3;
    }
    fetch("/api/advanced-search", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(body) })
      .then((r) => (r.ok ? r.json() : { results: [] }))
      .then((j) => setItems((j.results || []).filter((p) => p.matri_id !== matriId).slice(0, 4)))
      .catch(() => {});
  }, [matriId, religionId, age]);

  useEffect(() => {
    if (!toast) return;
    const t = setTimeout(() => setToast(""), 2400);
    return () => clearTimeout(t);
  }, [toast]);

  if (!items.length) return null;

  return (
    <section className="mt-5">
      <div className="d-flex justify-content-between align-items-end mb-3">
        <div>
          <span className="eyebrow mb-1" style={{ fontSize: "0.62rem" }}>You may also like</span>
          <h2 className="mb-0" style={{ fontSize: "2rem" }}>Similar Profiles</h2>
        </div>
        <a href="/matrimoney/preference-search" className="btn btn-outline-danger btn-sm px-3">Search more <i className="bi bi-arrow-right ms-1" /></a>
      </div>
      <div className="row g-3">
        {items.map((p) => (
          <div key={p.matri_id} className="col-sm-6 col-lg-3">
            <MemberCard p={p} onToast={setToast} />
          </div>
        ))}
      </div>
      {toast && <div className="mm-toast" role="status"><i className="bi bi-check-circle me-2" />{toast}</div>}
    </section>
  );
}
