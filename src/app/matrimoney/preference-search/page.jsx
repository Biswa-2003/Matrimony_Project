"use client";
import "bootstrap/dist/css/bootstrap.min.css";
import React, { useEffect, useRef, useState } from "react";
import { Tab, Nav, Form, Row, Col, Button } from "react-bootstrap";
import Select from "react-select";
import { useRouter } from "next/navigation";
import DashNav from "@/app/components/dashnav";

const fetcher = (url) => fetch(url).then((r) => r.json());
const STORAGE_KEY = "advSearch:payload";

export default function SearchForm() {
  const router = useRouter();
  const [key, setKey] = useState("regular");
  const formRef = useRef(null);

  // lookups
  const [countries, setCountries] = useState([]);
  const [states, setStates] = useState([]);
  const [cities, setCities] = useState([]);
  const [religions, setReligions] = useState([]);
  const [castes, setCastes] = useState([]);
  const [educations, setEducations] = useState([]);
  const [languages, setLanguages] = useState([]);

  // selections
  const [selectedCountry, setSelectedCountry] = useState("");
  const [selectedStateIds, setSelectedStateIds] = useState([]);
  const [selectedCityId, setSelectedCityId] = useState("");
  const [religionId, setReligionId] = useState("");
  const [motherTongueId, setMotherTongueId] = useState("");
  const [selectedCaste, setSelectedCaste] = useState([]);
  const [selectedEducation, setSelectedEducation] = useState([]);

  const [ageMin, setAgeMin] = useState("18");
  const [ageMax, setAgeMax] = useState("70");
  const [heightMinLabel, setHeightMinLabel] = useState("4ft 7in");
  const [heightMaxLabel, setHeightMaxLabel] = useState("7ft 0in");
  const [maritalStatuses, setMaritalStatuses] = useState([]);

  // AI Search states
  const [aiText, setAiText] = useState("");
  const [aiLoading, setAiLoading] = useState(false);
  const [aiResults, setAiResults] = useState([]);
  const [aiError, setAiError] = useState("");

  // react-select styles (using brand colors: #E33183 for primary)
  const selectStyles = {
    control: (base) => ({
      ...base,
      minHeight: 48,
      borderColor: "rgba(0,0,0,0.1)",
      borderRadius: "8px",
      boxShadow: "none",
      ":hover": { borderColor: "#E33183" }
    }),
    valueContainer: (b) => ({ ...b, padding: "2px 12px" }),
    input: (b) => ({ ...b, margin: 0 }),
    multiValue: (b) => ({ ...b, borderRadius: 12, backgroundColor: "#fff1f7" }), // bg-primary-subtle
    multiValueLabel: (b) => ({ ...b, color: "#800020", fontWeight: '600', fontSize: '0.85rem' }),
    multiValueRemove: (b) => ({ ...b, color: "#E33183", ':hover': { backgroundColor: '#E33183', color: 'white' } }),
    option: (b, s) => ({ ...b, fontSize: 15, backgroundColor: s.isSelected ? "#E33183" : s.isFocused ? "#fff1f7" : "white", color: s.isSelected ? "#fff" : "#333" }),
    placeholder: (b) => ({ ...b, fontSize: 15, color: '#6c757d' }),
  };

  // init lookups
  useEffect(() => {
    fetcher("/api/lookups/countries").then(setCountries);
    fetcher("/api/lookups/religions").then(setReligions);
    fetcher("/api/lookups/educations").then((rows) =>
      setEducations(rows.map((r) => ({ value: r.id, label: r.name })))
    );
    fetcher("/api/lookups/languages").then(setLanguages);
  }, []);

  // states for country
  useEffect(() => {
    setStates([]); setSelectedStateIds([]); setCities([]); setSelectedCityId("");
    if (!selectedCountry) return;
    fetcher(`/api/lookups/states?country_id=${selectedCountry}`).then(setStates);
  }, [selectedCountry]);

  // cities for exactly one state
  useEffect(() => {
    setCities([]); setSelectedCityId("");
    if (selectedStateIds.length !== 1) return;
    fetcher(`/api/lookups/cities?state_id=${selectedStateIds[0]}`).then(setCities);
  }, [selectedStateIds]);

  // castes for religion
  useEffect(() => {
    setSelectedCaste([]);
    if (!religionId) { setCastes([]); return; }
    fetcher(`/api/lookups/castes?religion_id=${religionId}`).then((rows) =>
      setCastes(rows.map((r) => ({ value: r.id, label: r.name })))
    );
  }, [religionId]);

  // Enter submit — only for Regular form
  const onKeyDown = (e) => {
    if (e.key !== "Enter" || e.shiftKey) return;
    if (e.target.closest('[aria-expanded="true"]')) return; // ignore open react-select
    e.preventDefault();
    formRef.current?.requestSubmit();
  };

  // height labels
  const heightOptions = [
    "4ft 0in", "4ft 1in", "4ft 2in", "4ft 3in", "4ft 4in", "4ft 5in", "4ft 6in", "4ft 7in", "4ft 8in", "4ft 9in", "4ft 10in", "4ft 11in",
    "5ft 0in", "5ft 1in", "5ft 2in", "5ft 3in", "5ft 4in", "5ft 5in", "5ft 6in", "5ft 7in", "5ft 8in", "5ft 9in", "5ft 10in", "5ft 11in",
    "6ft 0in", "6ft 1in", "6ft 2in", "6ft 3in", "6ft 4in", "6ft 5in", "6ft 6in", "6ft 7in", "6ft 8in", "6ft 9in", "6ft 10in", "6ft 11in",
    "7ft 0in",
  ];

  const toggleStatus = (val) =>
    setMaritalStatuses((prev) => (prev.includes(val) ? prev.filter((x) => x !== val) : [...prev, val]));

  // Regular search submit
  const onSubmit = (e) => {
    e.preventDefault();

    const payload = {
      ageMin: Number(ageMin) || undefined,
      ageMax: Number(ageMax) || undefined,
      heightMinLabel,
      heightMaxLabel,
      maritalStatuses,
      religionId: religionId ? Number(religionId) : undefined,
      motherTongueId: motherTongueId ? Number(motherTongueId) : undefined,
      casteId: selectedCaste[0]?.value,
      countryId: selectedCountry ? Number(selectedCountry) : undefined,
      stateIds: selectedStateIds.map(Number),
      cityId: selectedCityId ? Number(selectedCityId) : undefined,
      educationId: selectedEducation[0]?.value,
      page: 1,
      limit: 50,
    };

    try { sessionStorage.setItem(STORAGE_KEY, JSON.stringify(payload)); } catch { }
    router.push("/matrimoney/advance-search-results");
  };

  // AI Search handler
  const runAiSearch = async () => {
    const q = aiText.trim();
    if (!q || aiLoading) return;

    setAiLoading(true);
    setAiError("");
    setAiResults([]);

    try {
      const res = await fetch("/api/ai-search", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ text: q }),
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data?.error || "AI search failed");

      setAiResults(data.results || []);
    } catch (e) {
      setAiError(e.message);
      setAiResults([]);
    } finally {
      setAiLoading(false);
    }
  };

  return (
    <>
      <div className="search-page-wrapper">
        <div className="container py-5">
          <div className="search-card">
            {/* Card Header with Pattern */}
            <div className="search-header p-5 text-center position-relative overflow-hidden">
              <div className="position-absolute top-0 start-0 w-100 h-100 bg-pattern opacity-10"></div>
              <div className="position-relative z-1">
                <h2 className="fw-bold mb-2 text-white display-6">Find Your Perfect Match</h2>
                <p className="mb-0 text-white-50 fs-5">Search through thousands of verified profiles</p>
              </div>
            </div>

            <Tab.Container id="search-tabs" activeKey={key} onSelect={(k) => setKey(k)}>
              <div className="tabs-container px-4">
                <Nav variant="pills" className="tab-nav justify-content-center gap-3 flex-wrap">
                  <Nav.Item><Nav.Link eventKey="regular" className="fw-semibold px-4 py-3 shadow-sm"><i className="bi bi-sliders me-2"></i>Regular Search</Nav.Link></Nav.Item>
                  <Nav.Item><Nav.Link eventKey="ai" className="fw-semibold px-4 py-3 shadow-sm"><i className="bi bi-stars me-2"></i>AI Search</Nav.Link></Nav.Item>
                  <Nav.Item><Nav.Link eventKey="advanced" className="fw-semibold px-4 py-3 shadow-sm"><i className="bi bi-fonts me-2"></i>Keyword Search</Nav.Link></Nav.Item>
                  <Nav.Item><Nav.Link eventKey="keyword" className="fw-semibold px-4 py-3 shadow-sm"><i className="bi bi-person-badge me-2"></i>Search by ID</Nav.Link></Nav.Item>
                </Nav>
              </div>

              <Tab.Content className="p-4 p-md-5 pt-5 bg-light-subtle">
                {/* Regular Search */}
                <Tab.Pane eventKey="regular">
                  <Form ref={formRef} onSubmit={onSubmit} onKeyDown={onKeyDown}>

                    {/* Basic Preferences */}
                    <div className="preference-section fade-in-up">
                      <div className="section-header">
                        <div className="icon-box"><i className="bi bi-person-heart"></i></div>
                        <h5 className="mb-0 fw-bold text-maroon">Basic Preferences</h5>
                      </div>
                      <div className="row g-4">
                        {/* Age */}
                        <div className="col-lg-6">
                          <label className="form-label text-muted small fw-bold text-uppercase">Age Range</label>
                          <div className="d-flex align-items-center gap-3">
                            <Form.Select value={ageMin} onChange={(e) => setAgeMin(e.target.value)} className="form-select form-control-lg shadow-sm border-0 bg-light">
                              {Array.from({ length: 53 }, (_, i) => 18 + i).map(a => <option key={a} value={a}>{a}</option>)}
                            </Form.Select>
                            <span className="text-muted fw-bold">to</span>
                            <Form.Select value={ageMax} onChange={(e) => setAgeMax(e.target.value)} className="form-select form-control-lg shadow-sm border-0 bg-light">
                              {Array.from({ length: 53 }, (_, i) => 18 + i).map(a => <option key={a} value={a}>{a}</option>)}
                            </Form.Select>
                          </div>
                        </div>

                        {/* Height */}
                        <div className="col-lg-6">
                          <label className="form-label text-muted small fw-bold text-uppercase">Height Range</label>
                          <div className="d-flex align-items-center gap-3">
                            <Form.Select value={heightMinLabel} onChange={(e) => setHeightMinLabel(e.target.value)} className="form-select form-control-lg shadow-sm border-0 bg-light">
                              {heightOptions.map(h => <option key={h} value={h}>{h}</option>)}
                            </Form.Select>
                            <span className="text-muted fw-bold">to</span>
                            <Form.Select value={heightMaxLabel} onChange={(e) => setHeightMaxLabel(e.target.value)} className="form-select form-control-lg shadow-sm border-0 bg-light">
                              {heightOptions.map(h => <option key={h} value={h}>{h}</option>)}
                            </Form.Select>
                          </div>
                        </div>

                        {/* Marital Status */}
                        <div className="col-12">
                          <label className="form-label text-muted small fw-bold text-uppercase d-block mb-3">Marital Status</label>
                          <div className="d-flex flex-wrap gap-3">
                            {['Never Married', 'Divorced', 'Widowed', 'Awaiting Divorce'].map(ms => (
                              <div key={ms} className="form-check custom-check-card">
                                <input
                                  className="form-check-input"
                                  type="checkbox"
                                  id={`ms-${ms}`}
                                  checked={maritalStatuses.includes(ms)}
                                  onChange={() => toggleStatus(ms)}
                                />
                                <label className="form-check-label ms-1 fw-semibold" htmlFor={`ms-${ms}`}>{ms}</label>
                              </div>
                            ))}
                          </div>
                        </div>
                      </div>
                    </div>

                    {/* Religion Section */}
                    <div className="preference-section fade-in-up" style={{ animationDelay: '0.1s' }}>
                      <div className="section-header">
                        <div className="icon-box"><i className="bi bi-moon-stars"></i></div>
                        <h5 className="mb-0 fw-bold text-maroon">Religion & Community</h5>
                      </div>
                      <div className="row g-4">
                        <div className="col-md-6">
                          <label className="form-label text-muted small fw-bold text-uppercase">Religion</label>
                          <Form.Select size="lg" value={religionId} onChange={(e) => setReligionId(e.target.value)} className="shadow-sm border-0 bg-light">
                            <option value="">Any Religion</option>
                            {religions.map(r => <option key={r.id} value={r.id}>{r.name}</option>)}
                          </Form.Select>
                        </div>
                        <div className="col-md-6">
                          <label className="form-label text-muted small fw-bold text-uppercase">Caste</label>
                          <Select
                            instanceId="caste-select"
                            isMulti openMenuOnFocus
                            options={castes}
                            value={selectedCaste}
                            onChange={setSelectedCaste}
                            placeholder="Select Caste(s)..."
                            classNamePrefix="select"
                            styles={selectStyles}
                          />
                        </div>
                        <div className="col-md-6">
                          <label className="form-label text-muted small fw-bold text-uppercase">Mother Tongue</label>
                          <Form.Select size="lg" value={motherTongueId} onChange={(e) => setMotherTongueId(e.target.value)} className="shadow-sm border-0 bg-light">
                            <option value="">Any Language</option>
                            {languages.map((l) => <option key={l.id} value={l.id}>{l.name}</option>)}
                          </Form.Select>
                        </div>
                      </div>
                    </div>

                    {/* Location Section */}
                    <div className="preference-section fade-in-up" style={{ animationDelay: '0.2s' }}>
                      <div className="section-header">
                        <div className="icon-box"><i className="bi bi-geo-alt"></i></div>
                        <h5 className="mb-0 fw-bold text-maroon">Location</h5>
                      </div>
                      <div className="row g-4">
                        <div className="col-md-4">
                          <label className="form-label text-secondary small fw-bold">Country</label>
                          <Form.Select size="lg" value={selectedCountry} onChange={(e) => setSelectedCountry(e.target.value)} className="shadow-sm border-0 bg-light">
                            <option value="">Any Country</option>
                            {countries.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
                          </Form.Select>
                        </div>
                        <div className="col-md-4">
                          <label className="form-label text-secondary small fw-bold">State</label>
                          <Select
                            instanceId="state-select"
                            isMulti
                            options={states.map(s => ({ value: s.id, label: s.name }))}
                            value={selectedStateIds.map((id) => {
                              const s = states.find((x) => x.id === Number(id));
                              return s ? { value: s.id, label: s.name } : null;
                            }).filter(Boolean)}
                            onChange={(sel) => setSelectedStateIds(sel ? sel.map(s => String(s.value)) : [])}
                            placeholder="Select State(s)..."
                            styles={selectStyles}
                          />
                        </div>
                        <div className="col-md-4">
                          <label className="form-label text-secondary small fw-bold">City</label>
                          <Form.Select
                            size="lg"
                            value={selectedCityId}
                            onChange={(e) => setSelectedCityId(e.target.value)}
                            disabled={selectedStateIds.length !== 1}
                            className="shadow-sm border-0 bg-light"
                          >
                            <option value="">
                              {selectedStateIds.length === 1 ? "-- Select City --" : "Select 1 State First"}
                            </option>
                            {cities.map(ci => <option key={ci.id} value={ci.id}>{ci.name}</option>)}
                          </Form.Select>
                        </div>
                      </div>
                    </div>

                    {/* Education */}
                    <div className="preference-section fade-in-up" style={{ animationDelay: '0.3s' }}>
                      <div className="section-header">
                        <div className="icon-box"><i className="bi bi-mortarboard"></i></div>
                        <h5 className="mb-0 fw-bold text-maroon">Education & Career</h5>
                      </div>
                      <div>
                        <label className="form-label text-muted small fw-bold text-uppercase">Education Level</label>
                        <Select
                          instanceId="education-select"
                          isMulti={false}
                          options={educations}
                          value={selectedEducation}
                          onChange={setSelectedEducation}
                          placeholder="Any Education"
                          styles={selectStyles}
                        />
                      </div>
                    </div>

                    <div className="text-center mt-5">
                      <Button variant="primary" type="submit" size="lg" className="fw-bold px-5 py-3 rounded-pill text-uppercase shadow-lg w-100 w-md-auto hover-lift">
                        <i className="bi bi-search me-2"></i> Find Matches
                      </Button>
                    </div>
                  </Form>
                </Tab.Pane>

                {/* AI Search */}
                <Tab.Pane eventKey="ai">
                  <div className="fade-in-up">
                    <div className="bg-white p-5 rounded-4 shadow-sm mb-4">
                      <div className="d-flex align-items-center gap-3 mb-4">
                        <div className="d-inline-flex p-3 rounded-circle bg-gradient text-white" style={{ background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)' }}>
                          <i className="bi bi-stars fs-3"></i>
                        </div>
                        <div>
                          <h3 className="fw-bold text-maroon mb-1">AI-Powered Search</h3>
                          <p className="text-muted mb-0">Describe what you're looking for in plain English</p>
                        </div>
                      </div>

                      <div className="mb-4">
                        <label className="form-label fw-semibold text-muted small text-uppercase mb-3">Enter Your Search Query</label>
                        <div className="d-flex gap-2">
                          <input
                            className="form-control form-control-lg shadow-sm border-0 bg-light"
                            value={aiText}
                            onChange={(e) => setAiText(e.target.value)}
                            placeholder='Example: "Hindu Brahmin, Bhubaneswar, age 24-28"'
                            onKeyDown={(e) => { if (e.key === 'Enter') runAiSearch(); }}
                          />
                          <button
                            className={`btn btn-lg px-5 fw-bold shadow-sm position-relative overflow-hidden ${aiLoading ? 'ai-search-shimmer' : ''}`}
                            onClick={runAiSearch}
                            disabled={aiLoading}
                            style={{
                              background: aiLoading
                                ? 'linear-gradient(90deg, #667eea 0%, #764ba2 25%, #f093fb 50%, #4facfe 75%, #667eea 100%)'
                                : 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
                              backgroundSize: aiLoading ? '200% 100%' : '100% 100%',
                              color: 'white',
                              border: 'none',
                              minWidth: 150,
                              transition: 'all 0.3s ease'
                            }}
                          >
                            {aiLoading ? (
                              <>
                                <span className="spinner-border spinner-border-sm me-2"></span>
                                Searching...
                              </>
                            ) : (
                              <>
                                <i className="bi bi-search me-2"></i>
                                AI Search
                              </>
                            )}
                          </button>
                        </div>
                      </div>

                      {/* ✨ Shimmer Animation Styles */}
                      <div className="alert alert-info border-0 shadow-sm">
                        <div className="fw-bold mb-2"><i className="bi bi-lightbulb me-2"></i>Example Queries (Now with Names!):</div>
                        <div className="d-flex flex-wrap gap-2">
                          <span className="badge bg-light text-dark px-3 py-2" style={{ cursor: 'pointer' }} onClick={() => setAiText('Hindu Brahmin, Bhubaneswar, age 24-28')}>Hindu Brahmin, Bhubaneswar, 24-28</span>
                          <span className="badge bg-light text-dark px-3 py-2" style={{ cursor: 'pointer' }} onClick={() => setAiText('Never married, age 25 to 30, 5ft6 to 5ft8')}>Never married, 25-30, 5ft6-5ft8</span>
                          <span className="badge bg-light text-dark px-3 py-2" style={{ cursor: 'pointer' }} onClick={() => setAiText('Christian, Delhi, height 5ft4 to 5ft7')}>Christian, Delhi, 5ft4-5ft7</span>
                          <span className="badge bg-light text-dark px-3 py-2" style={{ cursor: 'pointer' }} onClick={() => setAiText('Muslim, Mumbai, age 22-26')}>Muslim, Mumbai, 22-26</span>
                        </div>
                      </div>
                    </div>

                    {/* Error Display */}
                    {aiError && (
                      <div className="alert alert-danger shadow-sm border-0 rounded-4 mb-4">
                        <i className="bi bi-exclamation-triangle me-2"></i>
                        {aiError}
                      </div>
                    )}

                    {/* Results Display */}
                    <div className="mt-4">
                      {aiResults.length === 0 && !aiLoading && !aiError && (
                        <div className="text-center py-5 bg-white rounded-4 shadow-sm">
                          <i className="bi bi-search text-muted" style={{ fontSize: '3rem' }}></i>
                          <p className="text-muted mt-3 mb-0">No results yet. Try searching above!</p>
                        </div>
                      )}

                      {aiResults.length > 0 && (
                        <>
                          <div className="d-flex justify-content-between align-items-center mb-3">
                            <h5 className="fw-bold text-maroon mb-0">
                              <i className="bi bi-check-circle-fill text-success me-2"></i>
                              Found {aiResults.length} Matches
                            </h5>
                          </div>
                          <div className="row g-4">
                            {aiResults.map((p) => (
                              <div key={p.id} className="col-md-6 col-lg-4">
                                <div className="card h-100 border-0 shadow-sm hover-lift" style={{ borderRadius: 16, overflow: 'hidden', transition: 'all 0.3s ease' }}>
                                  <div className="card-body p-4">
                                    <div className="d-flex align-items-start mb-3">
                                      <div className="flex-shrink-0 me-3">
                                        <img
                                          src={p.photo_url || '/uploads/default.jpg'}
                                          alt={p.first_name}
                                          className="rounded-circle shadow-sm"
                                          width={70}
                                          height={70}
                                          style={{ objectFit: 'cover' }}
                                          onError={(e) => e.target.src = '/uploads/default.jpg'}
                                        />
                                      </div>
                                      <div className="flex-grow-1">
                                        <h6 className="fw-bold text-maroon mb-1">
                                          {p.first_name} {p.last_name || ""}
                                        </h6>
                                        <p className="small text-muted mb-0">{p.matri_id}</p>
                                      </div>
                                    </div>

                                    <div className="mb-3">
                                      <div className="row g-2 small">
                                        <div className="col-6">
                                          <div className="text-muted">Age</div>
                                          <div className="fw-semibold">{p.age || 'N/A'}</div>
                                        </div>
                                        <div className="col-6">
                                          <div className="text-muted">Gender</div>
                                          <div className="fw-semibold">{p.gender}</div>
                                        </div>
                                        <div className="col-6">
                                          <div className="text-muted">Height</div>
                                          <div className="fw-semibold">{p.height_cm ? `${p.height_cm} cm` : 'N/A'}</div>
                                        </div>
                                        <div className="col-6">
                                          <div className="text-muted">Status</div>
                                          <div className="fw-semibold" style={{ fontSize: '0.75rem' }}>{p.marital_status || 'N/A'}</div>
                                        </div>
                                        {p.religion_name && (
                                          <div className="col-12">
                                            <div className="text-muted">Religion</div>
                                            <div className="fw-semibold">{p.religion_name}</div>
                                          </div>
                                        )}
                                        {p.city_name && (
                                          <div className="col-12">
                                            <div className="text-muted">Location</div>
                                            <div className="fw-semibold">{p.city_name}, {p.state_name || p.country_name}</div>
                                          </div>
                                        )}
                                      </div>
                                    </div>

                                    <a
                                      href={`/matrimoney/profile-details/${p.matri_id}`}
                                      className="btn btn-outline-primary btn-sm w-100 rounded-pill fw-semibold"
                                    >
                                      View Profile <i className="bi bi-arrow-right ms-1"></i>
                                    </a>
                                  </div>
                                </div>
                              </div>
                            ))}
                          </div>
                        </>
                      )}
                    </div>
                  </div>
                </Tab.Pane>

                {/* Keyword Search */}
                <Tab.Pane eventKey="advanced">
                  <div className="d-flex flex-column align-items-center justify-content-center py-5 fade-in-up">
                    <div className="bg-white p-5 rounded-4 shadow-sm text-center" style={{ maxWidth: 700, width: '100%' }}>
                      <div className="d-inline-flex p-3 rounded-circle bg-primary bg-opacity-10 text-primary mb-4">
                        <i className="bi bi-fonts fs-1"></i>
                      </div>
                      <h3 className="fw-bold text-maroon mb-2">Search by Name</h3>
                      <p className="text-muted mb-4 mx-auto" style={{ maxWidth: 500 }}>Looking for someone specifics? Enter their name below to find their profile.</p>
                      <KeywordSearchPane />
                    </div>
                  </div>
                </Tab.Pane>

                {/* Search by ID */}
                <Tab.Pane eventKey="keyword">
                  <Form action="/matrimoney/results" method="GET">
                    <div className="d-flex flex-column align-items-center justify-content-center py-5 fade-in-up">
                      <div className="bg-white p-5 rounded-4 shadow-sm text-center" style={{ maxWidth: 700, width: '100%' }}>
                        <div className="d-inline-flex p-3 rounded-circle bg-primary bg-opacity-10 text-primary mb-4">
                          <i className="bi bi-upc-scan fs-1"></i>
                        </div>
                        <h3 className="text-maroon fw-bold mb-2">Search by ID</h3>
                        <p className="text-muted mb-4">If you know the Profile ID of the member, simply enter it below.</p>
                        <div className="d-flex justify-content-center gap-2 mx-auto" style={{ maxWidth: 500 }}>
                          <Form.Control type="text" name="matriId" placeholder="Enter Profile ID (e.g. DU12345)" required className="form-control-lg shadow-sm border-1" style={{ borderRadius: '50px 0 0 50px' }} />
                          <Button variant="primary" type="submit" size="lg" className="px-4 fw-bold shadow-sm" style={{ borderRadius: '0 50px 50px 0' }}>Search</Button>
                        </div>
                      </div>
                    </div>
                  </Form>
                </Tab.Pane>
              </Tab.Content>
            </Tab.Container>
          </div>
        </div>

        <style jsx global>{`
        .search-page-wrapper {
            background-color: #f0f2f5;
            min-height: 100vh;
            padding-top: 80px;
            background-image: radial-gradient(#e33183 0.5px, transparent 0.5px), radial-gradient(#e33183 0.5px, #f0f2f5 0.5px);
            background-size: 20px 20px;
            background-position: 0 0, 10px 10px;
        }
        .search-card { 
            background: #fff; 
            border-radius: 24px; 
            overflow: hidden; 
            box-shadow: 0 20px 60px rgba(0,0,0,0.08); 
            border: 1px solid rgba(0,0,0,0.02);
        }
        .search-header {
            background: linear-gradient(135deg, var(--brand-maroon) 0%, #600018 100%);
        }
        .bg-pattern {
            background-image: url("data:image/svg+xml,%3Csvg width='20' height='20' viewBox='0 0 20 20' xmlns='http://www.w3.org/2000/svg'%3E%3Cg fill='%23ffffff' fill-opacity='0.1' fill-rule='evenodd'%3E%3Ccircle cx='3' cy='3' r='3'/%3E%3Ccircle cx='13' cy='13' r='3'/%3E%3C/g%3E%3C/svg%3E");
        }
        .tabs-container {
            transform: translateY(-50%);
            margin-bottom: -30px;
            position: relative;
            z-index: 10;
        }
        .tab-nav .nav-link { 
            background: #fff;
            color: #555;
            border-radius: 50px; 
            box-shadow: 0 10px 30px rgba(0,0,0,0.08);
            border: 1px solid rgba(0,0,0,0.05);
            transition: all 0.3s cubic-bezier(0.25, 0.8, 0.25, 1);
            min-width: 180px;
            text-align: center;
        }
        .tab-nav .nav-link:hover {
            transform: translateY(-5px);
             color: var(--brand-primary);
        }
        .tab-nav .nav-link.active { 
            background: var(--brand-primary); 
            color: #fff !important; 
            box-shadow: 0 10px 30px rgba(227, 49, 131, 0.4);
        }
        
        .preference-section {
            background: white;
            border-radius: 20px;
            padding: 30px;
            margin-bottom: 30px;
            border: 1px solid #f1f1f1;
            box-shadow: 0 4px 20px rgba(0,0,0,0.02);
            transition: transform 0.3s ease;
        }
        .preference-section:hover {
             transform: translateY(-2px);
             box-shadow: 0 10px 30px rgba(0,0,0,0.05);
        }
        .section-header {
            display: flex;
            align-items: center;
            gap: 15px;
            margin-bottom: 25px;
            padding-bottom: 15px;
            border-bottom: 1px solid #f8f9fa;
        }
        .icon-box {
            width: 40px;
            height: 40px;
            border-radius: 10px;
            background: var(--brand-primary);
            color: white;
            display: flex;
            align-items: center;
            justify-content: center;
            font-size: 1.2rem;
            box-shadow: 0 4px 10px rgba(227, 49, 131, 0.3);
        }
        
        .custom-check-card {
            background: #f8f9fa;
            border-radius: 30px;
            padding: 8px 16px 8px 8px;
            display: flex;
            align-items: center;
            border: 1px solid transparent;
            transition: all 0.2s;
        }
        .custom-check-card:hover {
            background: white;
            border-color: #ddd;
             box-shadow: 0 2px 8px rgba(0,0,0,0.05);
        }
        .custom-check-card .form-check-input {
            width: 1.5em;
            height: 1.5em;
            margin-top: 0;
            margin-right: 10px;
        }
        .custom-check-card .form-check-input:checked + label {
            color: var(--brand-primary);
        }

        .hover-lift:hover {
            transform: translateY(-3px);
            box-shadow: 0 15px 30px rgba(227, 49, 131, 0.4) !important;
        }
        
        .text-maroon { color: var(--brand-maroon, #800020) !important; }
        
        @keyframes fadeInUp {
            from { opacity: 0; transform: translateY(20px); }
            to { opacity: 1; transform: translateY(0); }
        }
        .fade-in-up {
            animation: fadeInUp 0.5s ease-out forwards;
        }

        /* Form Styling */
        .form-control-lg, .form-select-lg { 
            border-radius: 12px;
            font-size: 1rem;
            padding: 0.75rem 1rem;
            border: 1px solid #e2e8f0;
        }
        .form-control:focus, .form-select:focus {
            border-color: var(--brand-primary);
            box-shadow: 0 0 0 4px rgba(227, 49, 131, 0.1);
        }
        
        input::placeholder { font-size: 0.95rem; color: #a0aec0; }
        
        /* ✨ AI Search Shimmer Animation */
        @keyframes shimmer {
          0% {
            background-position: 200% 0;
          }
          100% {
            background-position: -200% 0;
          }
        }
        
        .ai-search-shimmer {
          animation: shimmer 3s linear infinite;
        }
        
        .ai-search-shimmer:before {
          content: '';
          position: absolute;
          top: 0;
          left: -100%;
          width: 100%;
          height: 100%;
          background: linear-gradient(
            90deg,
            transparent,
            rgba(255, 255, 255, 0.3),
            transparent
          );
          animation: shimmer-overlay 2s linear infinite;
        }
        
        @keyframes shimmer-overlay {
          0% {
            left: -100%;
          }
          100% {
            left: 200%;
          }
        }
      `}</style>
      </div>
    </>
  );
}

/* ---------- Keyword Search Pane (name-only) ---------- */
function KeywordSearchPane() {
  const router = useRouter();
  const [q, setQ] = useState("");

  const onSubmit = (e) => {
    e.preventDefault();
    const value = q.trim();
    if (!value) return;

    // ✅ push to the dedicated name-results page
    router.push(`/matrimoney/name-results?name=${encodeURIComponent(value)}`);
  };

  return (
    <form onSubmit={onSubmit} className="w-100" style={{ maxWidth: 600 }}>
      <div className="input-group input-group-lg shadow-sm">
        <input
          className="form-control border-end-0"
          type="text"
          value={q}
          onChange={(e) => setQ(e.target.value)}
          placeholder="Type a name (e.g., Priyanka)…"
          required
          style={{ borderTopLeftRadius: 50, borderBottomLeftRadius: 50, paddingLeft: 25 }}
        />
        <button className="btn btn-primary px-4 fw-bold" type="submit" style={{ borderTopRightRadius: 50, borderBottomRightRadius: 50 }}>
          <i className="bi bi-search me-2"></i> Search
        </button>
      </div>
    </form>
  );
}
