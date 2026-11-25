"use client";

import React, { Suspense, useCallback, useEffect, useMemo, useRef, useState } from "react";
import Select from "react-select";
import { useRouter, useSearchParams } from "next/navigation";
import MemberCard from "@/app/components/MemberCard";
import { selectTheme, selectStyles } from "@/lib/select-theme";

/* ---------------- constants ---------------- */
const AGES = Array.from({ length: 53 }, (_, i) => 18 + i);
const HEIGHTS = Array.from({ length: 37 }, (_, i) => {
  const inches = 54 + i; // 4ft 6in → 7ft 6in
  return { cm: Math.round(inches * 2.54), label: `${Math.floor(inches / 12)}ft ${inches % 12}in` };
});
const MARITAL = ["Never Married", "Divorced", "Widowed", "Awaiting Divorce"];
const DIETS = ["Vegetarian", "Non-Vegetarian", "Eggetarian", "Vegan"];
const INCOMES = [
  { v: 0, l: "Any income" },
  { v: 300000, l: "₹3 Lakh+" },
  { v: 500000, l: "₹5 Lakh+" },
  { v: 1000000, l: "₹10 Lakh+" },
  { v: 2000000, l: "₹20 Lakh+" },
  { v: 5000000, l: "₹50 Lakh+" },
];
const SORTS = [
  { v: "newest", l: "Newest members" },
  { v: "updated", l: "Recently updated" },
  { v: "age_asc", l: "Age: youngest first" },
  { v: "age_desc", l: "Age: oldest first" },
  { v: "height_desc", l: "Height: tallest first" },
];
const DEFAULTS = {
  q: "",
  ageMin: 18,
  ageMax: 70,
  heightMinCm: 0,
  heightMaxCm: 0,
  maritalStatuses: [],
  religionIds: [],
  casteIds: [],
  motherTongueIds: [],
  countryId: "",
  stateIds: [],
  cityIds: [],
  educationIds: [],
  professionIds: [],
  incomeMin: 0,
  diets: [],
  withPhoto: false,
  verifiedOnly: false,
  joinedWithinDays: 0,
  sort: "newest",
};
const PRESETS = [
  { key: "new", label: "Joined this month", icon: "bi-stars", apply: { joinedWithinDays: 30, sort: "newest" } },
  { key: "photo", label: "With photo", icon: "bi-image", apply: { withPhoto: true } },
  { key: "verified", label: "Verified only", icon: "bi-patch-check", apply: { verifiedOnly: true } },
  { key: "never", label: "Never married", icon: "bi-heart", apply: { maritalStatuses: ["Never Married"] } },
];


const json = (url) => fetch(url).then((r) => (r.ok ? r.json() : [])).catch(() => []);
const toOpts = (rows) => (Array.isArray(rows) ? rows : []).map((r) => ({ value: r.id, label: r.name }));
const pick = (opts, vals) => opts.filter((o) => vals.includes(o.value));

/* ---------------- page ---------------- */
function SearchPage() {
  const router = useRouter();
  const urlParams = useSearchParams();
  const [mode, setMode] = useState("filters"); // filters | ai | id
  const [f, setF] = useState(() => {
    const s = { ...DEFAULTS };
    const n = (k) => Number(urlParams.get(k)) || 0;
    if (n("ageMin") || n("ageFrom")) s.ageMin = n("ageMin") || n("ageFrom");
    if (n("ageMax") || n("ageTo")) s.ageMax = n("ageMax") || n("ageTo");
    if (n("casteId")) s.casteIds = [n("casteId")];
    if (n("religionId")) s.religionIds = [n("religionId")];
    if (urlParams.get("q")) s.q = urlParams.get("q");
    return s;
  });
  const set = (patch) => setF((prev) => ({ ...prev, ...patch }));

  /* lookups */
  const [lk, setLk] = useState({ religions: [], castes: [], languages: [], countries: [], states: [], cities: [], educations: [], professions: [] });
  useEffect(() => {
    Promise.all([
      json("/api/lookups/religions"),
      json("/api/lookups/languages"),
      json("/api/lookups/countries"),
      json("/api/lookups/educations"),
      json("/api/lookups/professions"),
    ]).then(([religions, languages, countries, educations, professions]) =>
      setLk((p) => ({ ...p, religions: toOpts(religions), languages: toOpts(languages), countries: toOpts(countries), educations: toOpts(educations), professions: toOpts(professions) }))
    );
  }, []);
  useEffect(() => {
    const rel = f.religionIds.length === 1 ? `?religion_id=${f.religionIds[0]}` : "";
    json(`/api/lookups/castes${rel}`).then((rows) => setLk((p) => ({ ...p, castes: toOpts(rows) })));
  }, [f.religionIds]);
  useEffect(() => {
    if (!f.countryId) return setLk((p) => ({ ...p, states: [], cities: [] }));
    json(`/api/lookups/states?country_id=${f.countryId}`).then((rows) => setLk((p) => ({ ...p, states: toOpts(rows) })));
  }, [f.countryId]);
  useEffect(() => {
    if (!f.stateIds.length) return setLk((p) => ({ ...p, cities: [] }));
    Promise.all(f.stateIds.slice(0, 5).map((id) => json(`/api/lookups/cities?state_id=${id}`))).then((lists) =>
      setLk((p) => ({ ...p, cities: toOpts(lists.flat()) }))
    );
  }, [f.stateIds]);

  /* results (debounced, cancellable) */
  const [results, setResults] = useState([]);
  const [count, setCount] = useState(0);
  const [page, setPage] = useState(1);
  const [hasMore, setHasMore] = useState(false);
  const [loading, setLoading] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const [error, setError] = useState("");
  const abortRef = useRef(null);

  const runSearch = useCallback(async (filters, pageNum = 1) => {
    abortRef.current?.abort();
    const ctrl = new AbortController();
    abortRef.current = ctrl;
    pageNum === 1 ? setLoading(true) : setLoadingMore(true);
    setError("");
    try {
      const r = await fetch("/api/advanced-search", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ...filters, page: pageNum, limit: 24 }),
        signal: ctrl.signal,
      });
      const j = await r.json().catch(() => ({}));
      if (!r.ok) throw new Error(j.error || "Search failed");
      setResults((prev) => (pageNum === 1 ? j.results : [...prev, ...j.results]));
      setCount(j.count || 0);
      setHasMore(Boolean(j.hasMore));
      setPage(pageNum);
    } catch (e) {
      if (e.name !== "AbortError") setError(e.message);
    } finally {
      if (!ctrl.signal.aborted) {
        setLoading(false);
        setLoadingMore(false);
      }
    }
  }, []);

  useEffect(() => {
    const t = setTimeout(() => runSearch(f, 1), 350);
    return () => clearTimeout(t);
  }, [f, runSearch]);

  /* toast */
  const [toast, setToast] = useState("");
  useEffect(() => {
    if (!toast) return;
    const t = setTimeout(() => setToast(""), 2400);
    return () => clearTimeout(t);
  }, [toast]);

  /* saved searches */
  const [saved, setSaved] = useState([]);
  const [saveName, setSaveName] = useState("");
  const [showSave, setShowSave] = useState(false);
  useEffect(() => {
    fetch("/api/saved-searches").then((r) => (r.ok ? r.json() : { results: [] })).then((j) => setSaved(j.results || [])).catch(() => {});
  }, []);
  const saveSearch = async () => {
    const name = saveName.trim();
    if (!name) return;
    const r = await fetch("/api/saved-searches", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ name, params: f }) });
    const j = await r.json().catch(() => ({}));
    if (r.ok) {
      setSaved((s) => [j.saved, ...s]);
      setSaveName("");
      setShowSave(false);
      setToast("Search saved");
    } else setToast(j.error || "Could not save");
  };
  const deleteSaved = async (id) => {
    setSaved((s) => s.filter((x) => x.id !== id));
    fetch(`/api/saved-searches?id=${id}`, { method: "DELETE" }).catch(() => {});
  };

  /* AI */
  const [aiText, setAiText] = useState("");
  const [aiBusy, setAiBusy] = useState(false);
  const [aiNote, setAiNote] = useState("");
  const runAi = async () => {
    const text = aiText.trim();
    if (!text || aiBusy) return;
    setAiBusy(true);
    setAiNote("");
    try {
      const r = await fetch("/api/ai-search", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ text }) });
      const j = await r.json().catch(() => ({}));
      if (!r.ok || !j.filters) throw new Error(j.error || "AI search is unavailable right now.");
      const x = j.filters;
      const next = { ...DEFAULTS, sort: f.sort };
      if (x.age_min) next.ageMin = x.age_min;
      if (x.age_max) next.ageMax = x.age_max;
      if (x.height_min_cm) next.heightMinCm = x.height_min_cm;
      if (x.height_max_cm) next.heightMaxCm = x.height_max_cm;
      if (x.marital_status) next.maritalStatuses = [x.marital_status];
      if (x.religion_id) next.religionIds = [x.religion_id];
      if (x.caste_id) next.casteIds = [x.caste_id];
      if (x.mother_tongue_id) next.motherTongueIds = [x.mother_tongue_id];
      if (x.country_id) next.countryId = x.country_id;
      if (x.state_id) next.stateIds = [x.state_id];
      if (x.city_id) next.cityIds = [x.city_id];
      setF(next);
      const understood = [x.religion_name, x.caste_name, x.city_name || x.state_name, x.mother_tongue_name, x.age_min && `${x.age_min}–${x.age_max || 70} yrs`].filter(Boolean);
      setAiNote(understood.length ? `Understood: ${understood.join(" · ")}` : "Filters applied from your description.");
      setMode("filters");
    } catch (e) {
      setAiNote(e.message);
    } finally {
      setAiBusy(false);
    }
  };

  /* by ID */
  const [idText, setIdText] = useState("");
  const goToId = (e) => {
    e.preventDefault();
    const id = idText.trim().toUpperCase();
    if (id) router.push(`/matrimoney/profile-details/${encodeURIComponent(id)}`);
  };

  /* active filter chips */
  const chips = useMemo(() => {
    const c = [];
    const nameOf = (opts, id) => opts.find((o) => o.value === id)?.label;
    if (f.q) c.push({ k: "q", l: `“${f.q}”`, clear: { q: "" } });
    if (f.ageMin !== 18 || f.ageMax !== 70) c.push({ k: "age", l: `${f.ageMin}–${f.ageMax} yrs`, clear: { ageMin: 18, ageMax: 70 } });
    if (f.heightMinCm || f.heightMaxCm) c.push({ k: "h", l: "Height", clear: { heightMinCm: 0, heightMaxCm: 0 } });
    f.maritalStatuses.forEach((m) => c.push({ k: `m${m}`, l: m, clear: { maritalStatuses: f.maritalStatuses.filter((x) => x !== m) } }));
    f.religionIds.forEach((id) => c.push({ k: `r${id}`, l: nameOf(lk.religions, id) || "Religion", clear: { religionIds: f.religionIds.filter((x) => x !== id), casteIds: [] } }));
    f.casteIds.forEach((id) => c.push({ k: `c${id}`, l: nameOf(lk.castes, id) || "Community", clear: { casteIds: f.casteIds.filter((x) => x !== id) } }));
    f.motherTongueIds.forEach((id) => c.push({ k: `l${id}`, l: nameOf(lk.languages, id) || "Language", clear: { motherTongueIds: f.motherTongueIds.filter((x) => x !== id) } }));
    if (f.countryId) c.push({ k: "co", l: nameOf(lk.countries, Number(f.countryId)) || "Country", clear: { countryId: "", stateIds: [], cityIds: [] } });
    f.stateIds.forEach((id) => c.push({ k: `s${id}`, l: nameOf(lk.states, id) || "State", clear: { stateIds: f.stateIds.filter((x) => x !== id), cityIds: [] } }));
    f.cityIds.forEach((id) => c.push({ k: `ci${id}`, l: nameOf(lk.cities, id) || "City", clear: { cityIds: f.cityIds.filter((x) => x !== id) } }));
    f.educationIds.forEach((id) => c.push({ k: `e${id}`, l: nameOf(lk.educations, id) || "Education", clear: { educationIds: f.educationIds.filter((x) => x !== id) } }));
    f.professionIds.forEach((id) => c.push({ k: `p${id}`, l: nameOf(lk.professions, id) || "Profession", clear: { professionIds: f.professionIds.filter((x) => x !== id) } }));
    if (f.incomeMin) c.push({ k: "inc", l: INCOMES.find((i) => i.v === f.incomeMin)?.l, clear: { incomeMin: 0 } });
    f.diets.forEach((d) => c.push({ k: `d${d}`, l: d, clear: { diets: f.diets.filter((x) => x !== d) } }));
    if (f.withPhoto) c.push({ k: "ph", l: "With photo", clear: { withPhoto: false } });
    if (f.verifiedOnly) c.push({ k: "v", l: "Verified", clear: { verifiedOnly: false } });
    if (f.joinedWithinDays) c.push({ k: "j", l: `Joined in ${f.joinedWithinDays} days`, clear: { joinedWithinDays: 0 } });
    return c;
  }, [f, lk]);

  const toggleIn = (key, val) => set({ [key]: f[key].includes(val) ? f[key].filter((x) => x !== val) : [...f[key], val] });
  const [filtersOpen, setFiltersOpen] = useState(false);

  /* ---------------- render ---------------- */
  const Filters = (
    <div className="search-filters">
      <div className="d-flex justify-content-between align-items-center mb-3">
        <h5 className="mb-0"><i className="bi bi-sliders2 me-2 text-gold" />Refine</h5>
        {chips.length > 0 && (
          <button type="button" className="btn btn-link btn-sm text-danger text-decoration-none p-0" onClick={() => setF({ ...DEFAULTS, sort: f.sort })}>
            Clear all
          </button>
        )}
      </div>

      <div className="sf-group">
        <label className="form-label" htmlFor="sf-q">Name</label>
        <div className="input-group">
          <span className="input-group-text"><i className="bi bi-search" /></span>
          <input id="sf-q" className="form-control" placeholder="Search by name" value={f.q} onChange={(e) => set({ q: e.target.value })} />
        </div>
      </div>

      <div className="sf-group">
        <label className="form-label">Age</label>
        <div className="d-flex align-items-center gap-2">
          <select className="form-select" value={f.ageMin} onChange={(e) => set({ ageMin: Number(e.target.value), ageMax: Math.max(f.ageMax, Number(e.target.value)) })} aria-label="Minimum age">
            {AGES.map((a) => <option key={a} value={a}>{a}</option>)}
          </select>
          <span className="text-muted small">to</span>
          <select className="form-select" value={f.ageMax} onChange={(e) => set({ ageMax: Number(e.target.value), ageMin: Math.min(f.ageMin, Number(e.target.value)) })} aria-label="Maximum age">
            {AGES.map((a) => <option key={a} value={a}>{a}</option>)}
          </select>
        </div>
      </div>

      <div className="sf-group">
        <label className="form-label">Height</label>
        <div className="d-flex align-items-center gap-2">
          <select className="form-select" value={f.heightMinCm} onChange={(e) => set({ heightMinCm: Number(e.target.value) })} aria-label="Minimum height">
            <option value={0}>Any</option>
            {HEIGHTS.map((h) => <option key={h.cm} value={h.cm}>{h.label}</option>)}
          </select>
          <span className="text-muted small">to</span>
          <select className="form-select" value={f.heightMaxCm} onChange={(e) => set({ heightMaxCm: Number(e.target.value) })} aria-label="Maximum height">
            <option value={0}>Any</option>
            {HEIGHTS.map((h) => <option key={h.cm} value={h.cm}>{h.label}</option>)}
          </select>
        </div>
      </div>

      <div className="sf-group">
        <label className="form-label">Marital status</label>
        <div className="d-flex flex-wrap gap-2">
          {MARITAL.map((m) => (
            <button key={m} type="button" className={`sf-pill ${f.maritalStatuses.includes(m) ? "on" : ""}`} onClick={() => toggleIn("maritalStatuses", m)}>{m}</button>
          ))}
        </div>
      </div>

      <div className="sf-section">Religion &amp; Community</div>
      <div className="sf-group">
        <Select isMulti placeholder="Any religion" options={lk.religions} value={pick(lk.religions, f.religionIds)}
          onChange={(v) => set({ religionIds: v.map((o) => o.value), casteIds: [] })} theme={selectTheme} styles={selectStyles} noOptionsMessage={() => "No matches"} instanceId="rel" />
      </div>
      <div className="sf-group">
        <Select isMulti placeholder="Any community" options={lk.castes} value={pick(lk.castes, f.casteIds)}
          onChange={(v) => set({ casteIds: v.map((o) => o.value) })} theme={selectTheme} styles={selectStyles} noOptionsMessage={() => "No matches"} instanceId="caste" />
      </div>
      <div className="sf-group">
        <Select isMulti placeholder="Any mother tongue" options={lk.languages} value={pick(lk.languages, f.motherTongueIds)}
          onChange={(v) => set({ motherTongueIds: v.map((o) => o.value) })} theme={selectTheme} styles={selectStyles} noOptionsMessage={() => "No matches"} instanceId="lang" />
      </div>

      <div className="sf-section">Location</div>
      <div className="sf-group">
        <select className="form-select" value={f.countryId} onChange={(e) => set({ countryId: e.target.value, stateIds: [], cityIds: [] })} aria-label="Country">
          <option value="">Any country</option>
          {lk.countries.map((c) => <option key={c.value} value={c.value}>{c.label}</option>)}
        </select>
      </div>
      {f.countryId && (
        <div className="sf-group">
          <Select isMulti placeholder="Any state" options={lk.states} value={pick(lk.states, f.stateIds)}
            onChange={(v) => set({ stateIds: v.map((o) => o.value), cityIds: [] })} theme={selectTheme} styles={selectStyles} noOptionsMessage={() => "No matches"} instanceId="state" />
        </div>
      )}
      {f.stateIds.length > 0 && (
        <div className="sf-group">
          <Select isMulti placeholder="Any city" options={lk.cities} value={pick(lk.cities, f.cityIds)}
            onChange={(v) => set({ cityIds: v.map((o) => o.value) })} theme={selectTheme} styles={selectStyles} noOptionsMessage={() => "No matches"} instanceId="city" />
        </div>
      )}

      <div className="sf-section">Education &amp; Career</div>
      <div className="sf-group">
        <Select isMulti placeholder="Any education" options={lk.educations} value={pick(lk.educations, f.educationIds)}
          onChange={(v) => set({ educationIds: v.map((o) => o.value) })} theme={selectTheme} styles={selectStyles} noOptionsMessage={() => "No matches"} instanceId="edu" />
      </div>
      <div className="sf-group">
        <Select isMulti placeholder="Any profession" options={lk.professions} value={pick(lk.professions, f.professionIds)}
          onChange={(v) => set({ professionIds: v.map((o) => o.value) })} theme={selectTheme} styles={selectStyles} noOptionsMessage={() => "No matches"} instanceId="prof" />
      </div>
      <div className="sf-group">
        <select className="form-select" value={f.incomeMin} onChange={(e) => set({ incomeMin: Number(e.target.value) })} aria-label="Annual income">
          {INCOMES.map((i) => <option key={i.v} value={i.v}>{i.l}</option>)}
        </select>
      </div>

      <div className="sf-section">Lifestyle &amp; Trust</div>
      <div className="sf-group">
        <div className="d-flex flex-wrap gap-2">
          {DIETS.map((d) => (
            <button key={d} type="button" className={`sf-pill ${f.diets.includes(d) ? "on" : ""}`} onClick={() => toggleIn("diets", d)}>{d}</button>
          ))}
        </div>
      </div>
      {[
        ["withPhoto", "Profiles with photo"],
        ["verifiedOnly", "Verified profiles only"],
      ].map(([k, l]) => (
        <div key={k} className="form-check form-switch mb-2">
          <input className="form-check-input" type="checkbox" role="switch" id={`sw-${k}`} checked={f[k]} onChange={(e) => set({ [k]: e.target.checked })} />
          <label className="form-check-label small" htmlFor={`sw-${k}`}>{l}</label>
        </div>
      ))}
      <div className="sf-group mt-2">
        <select className="form-select" value={f.joinedWithinDays} onChange={(e) => set({ joinedWithinDays: Number(e.target.value) })} aria-label="Joined within">
          <option value={0}>Joined anytime</option>
          <option value={7}>Joined in last 7 days</option>
          <option value={30}>Joined in last 30 days</option>
          <option value={90}>Joined in last 3 months</option>
        </select>
      </div>
    </div>
  );

  return (
    <div className="page-surface pb-5">
      {/* Hero */}
      <section className="header-section text-center text-white">
        <div className="container py-5 position-relative">
          <span className="eyebrow light mb-2">Partner Search</span>
          <h1 className="mb-2" style={{ fontSize: "clamp(2.3rem, 4.4vw, 3.4rem)" }}>Find Your Perfect Match</h1>
          <p className="mb-4" style={{ color: "rgba(255,255,255,.72)" }}>Search thousands of verified profiles by values, community, location and career.</p>
          <div className="search-modes mx-auto">
            {[
              ["filters", "bi-sliders2", "Smart Filters"],
              ["ai", "bi-stars", "Describe with AI"],
              ["id", "bi-person-badge", "Search by ID"],
            ].map(([k, icon, label]) => (
              <button key={k} type="button" className={`search-mode ${mode === k ? "active" : ""}`} onClick={() => setMode(k)}>
                <i className={`bi ${icon} me-2`} />{label}
              </button>
            ))}
          </div>
        </div>
      </section>

      <div className="container mt-4">
        {mode === "ai" && (
          <div className="luxe-card p-4 p-lg-5 mb-4">
            <span className="eyebrow mb-2">Describe your ideal partner</span>
            <h3 className="mb-3" style={{ fontSize: "1.9rem" }}>Tell us in your own words</h3>
            <textarea className="form-control mb-3" rows={3} value={aiText} onChange={(e) => setAiText(e.target.value)}
              placeholder="e.g. Hindu Brahmin girl from Bhubaneswar, 24 to 29 years, Odia speaking, never married"
              onKeyDown={(e) => { if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); runAi(); } }} />
            <div className="d-flex flex-wrap gap-2 align-items-center">
              <button type="button" className="btn btn-primary px-4" onClick={runAi} disabled={aiBusy || !aiText.trim()}>
                {aiBusy ? <><span className="spinner-border spinner-border-sm me-2" />Understanding…</> : <><i className="bi bi-stars me-2" />Find Matches</>}
              </button>
              {["Never married doctor in Bangalore, 26-30", "Odia speaking Hindu, 5ft 5in+", "Sikh, Punjabi, Delhi, 25-32"].map((ex) => (
                <button key={ex} type="button" className="sf-pill" onClick={() => setAiText(ex)}>{ex}</button>
              ))}
            </div>
            {aiNote && <div className="alert alert-warning small mt-3 mb-0">{aiNote}</div>}
          </div>
        )}

        {mode === "id" && (
          <form className="luxe-card p-4 p-lg-5 mb-4" onSubmit={goToId}>
            <span className="eyebrow mb-2">Know a member&apos;s ID?</span>
            <h3 className="mb-3" style={{ fontSize: "1.9rem" }}>Go straight to their profile</h3>
            <div className="input-group" style={{ maxWidth: 520 }}>
              <span className="input-group-text"><i className="bi bi-person-badge" /></span>
              <input className="form-control text-uppercase" placeholder="e.g. DU474671" value={idText} onChange={(e) => setIdText(e.target.value)} />
              <button className="btn btn-primary px-4" type="submit" disabled={!idText.trim()}>Open Profile</button>
            </div>
          </form>
        )}

        <div className="row g-4">
          {/* Sidebar */}
          <aside className="col-lg-4 col-xl-3">
            {saved.length > 0 && (
              <div className="luxe-card p-3 mb-3">
                <div className="nav-menu-label p-0 mb-2">Saved searches</div>
                <div className="d-flex flex-wrap gap-2">
                  {saved.map((s) => (
                    <span key={s.id} className="saved-chip">
                      <button type="button" onClick={() => { setF({ ...DEFAULTS, ...s.params }); setToast(`Applied “${s.name}”`); }}>{s.name}</button>
                      <button type="button" aria-label={`Delete ${s.name}`} onClick={() => deleteSaved(s.id)}><i className="bi bi-x" /></button>
                    </span>
                  ))}
                </div>
              </div>
            )}
            <button type="button" className="btn btn-outline-danger w-100 d-lg-none mb-3" onClick={() => setFiltersOpen((o) => !o)}>
              <i className="bi bi-sliders2 me-2" />{filtersOpen ? "Hide filters" : `Show filters${chips.length ? ` (${chips.length})` : ""}`}
            </button>
            <div className={`luxe-card p-4 search-sidebar ${filtersOpen ? "open" : ""}`}>{Filters}</div>
          </aside>

          {/* Results */}
          <section className="col-lg-8 col-xl-9">
            <div className="d-flex flex-wrap gap-2 mb-3">
              {PRESETS.map((p) => (
                <button key={p.key} type="button" className="sf-preset" onClick={() => set(p.apply)}>
                  <i className={`bi ${p.icon} me-1`} />{p.label}
                </button>
              ))}
            </div>

            <div className="results-bar">
              <div>
                <div className="results-count">
                  {loading ? <span className="placeholder-glow"><span className="placeholder col-12" style={{ width: 120 }} /></span> : <><b>{count.toLocaleString("en-IN")}</b> {count === 1 ? "profile" : "profiles"} found</>}
                </div>
                {aiNote && mode === "filters" && <small className="text-gold"><i className="bi bi-stars me-1" />{aiNote}</small>}
              </div>
              <div className="d-flex gap-2 align-items-center">
                <select className="form-select form-select-sm" style={{ width: 200 }} value={f.sort} onChange={(e) => set({ sort: e.target.value })} aria-label="Sort results">
                  {SORTS.map((s) => <option key={s.v} value={s.v}>{s.l}</option>)}
                </select>
                <button type="button" className="btn btn-sm btn-outline-danger text-nowrap" onClick={() => setShowSave((v) => !v)}>
                  <i className="bi bi-bookmark-plus me-1" />Save
                </button>
              </div>
            </div>

            {showSave && (
              <div className="d-flex gap-2 mb-3">
                <input className="form-control" autoFocus maxLength={60} placeholder="Name this search, e.g. Bhubaneswar doctors" value={saveName}
                  onChange={(e) => setSaveName(e.target.value)} onKeyDown={(e) => e.key === "Enter" && saveSearch()} />
                <button type="button" className="btn btn-primary px-4" onClick={saveSearch} disabled={!saveName.trim()}>Save</button>
              </div>
            )}

            {chips.length > 0 && (
              <div className="d-flex flex-wrap gap-2 mb-3">
                {chips.map((c) => (
                  <button key={c.k} type="button" className="filter-chip" onClick={() => set(c.clear)} title="Remove filter">
                    {c.l} <i className="bi bi-x" />
                  </button>
                ))}
              </div>
            )}

            {error && <div className="alert alert-danger">{error}</div>}

            {loading ? (
              <div className="row g-3">
                {[...Array(6)].map((_, i) => (
                  <div key={i} className="col-sm-6 col-xl-4"><div className="member-card loading-skeleton" style={{ height: 420 }} /></div>
                ))}
              </div>
            ) : results.length === 0 ? (
              <div className="luxe-card text-center p-5">
                <img src="/images/ritual-rings.svg" alt="" width={84} height={84} className="mb-3 p-3 rounded-circle" style={{ background: "var(--royal)" }} />
                <h3 style={{ fontSize: "1.9rem" }}>No exact matches — yet</h3>
                <p className="text-muted mb-4">Try widening the age range, removing a filter, or choosing more communities or cities.</p>
                <button type="button" className="btn btn-primary px-4" onClick={() => setF({ ...DEFAULTS, sort: f.sort })}>Reset filters</button>
              </div>
            ) : (
              <>
                <div className="row g-3">
                  {results.map((p) => (
                    <div key={p.matri_id} className="col-sm-6 col-xl-4">
                      <MemberCard p={p} onToast={setToast} />
                    </div>
                  ))}
                </div>
                {hasMore && (
                  <div className="text-center mt-4">
                    <button type="button" className="btn btn-outline-danger px-5" onClick={() => runSearch(f, page + 1)} disabled={loadingMore}>
                      {loadingMore ? <><span className="spinner-border spinner-border-sm me-2" />Loading…</> : `Show more (${count - results.length} remaining)`}
                    </button>
                  </div>
                )}
              </>
            )}
          </section>
        </div>
      </div>

      {toast && <div className="mm-toast" role="status"><i className="bi bi-check-circle me-2" />{toast}</div>}
    </div>
  );
}

export default function SearchPageWrapper() {
  return (
    <Suspense fallback={<div className="page-surface" style={{ minHeight: "80vh" }} />}>
      <SearchPage />
    </Suspense>
  );
}
