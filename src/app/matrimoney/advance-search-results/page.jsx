"use client";
import "bootstrap/dist/css/bootstrap.min.css";
import React, { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { Button, Container, Row, Col, Card } from "react-bootstrap";
import DashNav from "@/app/components/dashnav";

// Duplicate ProfileCard logic from results/page.jsx for consistency, 
// or nicer if we made a shared component, but copying is safer for now.
function ProfileCard({ p }) {
  const [hover, setHover] = useState(false);

  return (
    <div
      className="card border-0 mb-4"
      onMouseEnter={() => setHover(true)}
      onMouseLeave={() => setHover(false)}
      style={{
        borderRadius: 16,
        overflow: 'hidden',
        borderTop: '4px solid transparent',
        backgroundClip: 'padding-box, border-box',
        backgroundImage:
          'linear-gradient(#fff, #fff), linear-gradient(90deg, var(--brand-primary), var(--brand-secondary))',
        boxShadow: hover
          ? '0 20px 40px rgba(0,0,0,.20), 0 8px 16px rgba(0,0,0,.10)'
          : '0 8px 20px rgba(0,0,0,.10), 0 2px 8px rgba(0,0,0,.06)',
        transform: hover ? 'translateY(-6px)' : 'translateY(0)',
        transition: 'transform 220ms ease, box-shadow 220ms ease',
      }}
    >
      <div
        style={{
          position: 'absolute',
          width: hover ? 12 : 8,
          background: 'linear-gradient(180deg, var(--brand-primary), var(--brand-secondary))',
          transition: 'width 220ms ease',
        }}
      />

      <div className="card-body">
        <h5 className="text-maroon fw-bold mb-1">{p.full_name || "Unknown"}</h5>
        <div className="small text-muted mb-3">
          <span className="fw-semibold">{p.matri_id}</span> | {p.gender} | Age: {p.age_years}
        </div>

        <div className="row g-4 align-items-start">
          <div className="col-12 col-md-4 col-lg-3">
            <div
              className="d-flex align-items-center justify-content-center bg-light"
              style={{
                width: 200,
                height: 250,
                borderRadius: 12,
                overflow: 'hidden',
                border: '1px solid rgba(13,110,253,.15)',
              }}
            >
              <img
                src={p.photo_url || "/uploads/default.jpg"}
                alt={p.full_name}
                style={{
                  width: '100%',
                  height: '100%',
                  objectFit: 'cover',
                  transform: hover ? 'scale(1.06)' : 'scale(1)',
                  transition: 'transform 240ms ease',
                }}
                onError={(e) => { e.target.src = "/uploads/default.jpg"; }}
              />
            </div>
          </div>

          <div className="col-12 col-md-8 col-lg-9">
            <div className="row gy-2">
              <KeyVal label="Age" val={p.age_years + " Yrs"} />
              <KeyVal label="Height" val={p.height_label} />
              <KeyVal label="Religion" val={p.religion_name} />
              <KeyVal label="Caste" val={p.caste_name} />
              <KeyVal label="Language" val={p.mother_tongue_name} />
              <KeyVal label="Location" val={p.location_text} />
              <KeyVal label="Education" val={p.education_name} />
              <KeyVal label="Marital Status" val={p.marital_status} />
            </div>

            <div className="mt-3">
              <a
                href={`/matrimoney/view-profile/${encodeURIComponent(p.matri_id)}`}
                className="fw-semibold text-decoration-none"
              >
                View Full Profile →
              </a>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

const KeyVal = ({ label, val }) => (
  <div className="col-12 col-sm-6 d-flex">
    <div className="me-2 fw-semibold" style={{ minWidth: 120, color: '#536387' }}>{label}:</div>
    <div>{val || "-"}</div>
  </div>
);


export default function AdvanceSearchResults() {
  const router = useRouter();
  const [results, setResults] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [count, setCount] = useState(0);

  useEffect(() => {
    const runSearch = async () => {
      setLoading(true);
      setError("");
      try {
        const raw = sessionStorage.getItem("advSearch:payload");
        if (!raw) {
          setLoading(false);
          return; // No criteria
        }
        const payload = JSON.parse(raw);
        console.log("Searching with:", payload);

        const res = await fetch("/api/advanced-search", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(payload),
        });
        if (!res.ok) throw new Error("Search API failed");

        const data = await res.json();
        setResults(data.results || []);
        setCount(data.count || 0);

      } catch (err) {
        console.error(err);
        setError("Failed to load search results.");
      } finally {
        setLoading(false);
      }
    };

    runSearch();
  }, []);

  return (
    <div style={{ backgroundColor: "#f8f9fa", minHeight: "100vh" }}>

      <div className="container py-5">
        <div className="d-flex align-items-center justify-content-between mb-4">
          <div>
            <h4 className="fw-bold text-primary mb-1">Search Results</h4>
            <p className="text-muted mb-0">Found {count} profiles matching your criteria</p>
          </div>
          <Button variant="outline-primary" onClick={() => router.push("/matrimoney/preference-search")}>
            Modify Search
          </Button>
        </div>

        {loading && (
          <div className="text-center py-5">
            <div className="spinner-border text-primary" role="status" />
            <p className="mt-2 text-muted">Searching matches...</p>
          </div>
        )}

        {error && (
          <div className="alert alert-danger">{error}</div>
        )}

        {!loading && !error && results.length === 0 && (
          <div className="text-center py-5 bg-white rounded shadow-sm">
            <h5>No matches found</h5>
            <p className="text-muted">Try relaxing your search criteria.</p>
            <Button variant="primary" onClick={() => router.push("/matrimoney/preference-search")}>
              Back to Filter
            </Button>
          </div>
        )}

        {!loading && results.map((p) => (
          <ProfileCard key={p.id} p={p} />
        ))}
      </div>
    </div>
  );
}
