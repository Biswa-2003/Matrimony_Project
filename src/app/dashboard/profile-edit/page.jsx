'use client';

import React, { useEffect, useState } from 'react';
import Image from 'next/image';
import { useRouter } from 'next/navigation';
import { Container, Row, Col, Card, Button, Form } from 'react-bootstrap';
import { resolvePhoto } from '../myhome/myhome.utils';

/* -------------------- Height code helpers (UI) -------------------- */
const HEIGHT_CODES = [
  '4ft0in', '4ft1in', '4ft2in', '4ft3in', '4ft4in', '4ft5in', '4ft6in', '4ft7in', '4ft8in', '4ft9in', '4ft10in', '4ft11in',
  '5ft0in', '5ft1in', '5ft2in', '5ft3in', '5ft4in', '5ft5in', '5ft6in', '5ft7in', '5ft8in', '5ft9in', '5ft10in', '5ft11in',
  '6ft0in', '6ft1in', '6ft2in', '6ft3in', '6ft4in', '6ft5in', '6ft6in', '6ft7in', '6ft8in', '6ft9in', '6ft10in', '6ft11in',
  '7ft0in'
];
const HEIGHT_OPTIONS = HEIGHT_CODES.map((c) => {
  const m = c.match(/^(\d+)ft(\d+)in$/);
  return { value: c, label: `${m[1]} ft ${m[2]} in` };
});

// ranges for age, weight, siblings
const AGE_RANGE = Array.from({ length: 43 }, (_, i) => 18 + i);     // 18–60
const WEIGHT_RANGE = Array.from({ length: 61 }, (_, i) => 40 + i);  // 40–100
const SIBLING_RANGE = Array.from({ length: 6 }, (_, i) => i);       // 0–5

// accept "5ft 7in", "5'7\"", "5ft7", "170", "170 cm" -> "5ft7in"
function toHeightCodeAny(v) {
  if (v == null || v === '') return '';
  let s = String(v).toLowerCase().trim();
  const cm = s.match(/^(\d+(?:\.\d+)?)\s*cm$/i) || (/^\d+(\.\d+)?$/.test(s) ? [null, s] : null);
  if (cm) return cmToCode(Number(cm[1]));
  s = s.replace(/feet|foot/g, 'ft').replace(/inches|inch/g, 'in');
  s = s.replace(/['"]/g, '').replace(/\s+/g, '');
  if (/^\d+ft\d+$/.test(s)) s += 'in';
  return HEIGHT_CODES.includes(s) ? s : '';
}
function cmToCode(cm) {
  if (cm == null || cm === '') return '';
  const totalIn = Math.round(Number(cm) / 2.54);
  const ft = Math.floor(totalIn / 12);
  const inch = Math.max(0, totalIn - ft * 12);
  const code = `${ft}ft${inch}in`;
  return HEIGHT_CODES.includes(code) ? code : HEIGHT_CODES[0];
}
function prettyHeight(v) {
  const code = toHeightCodeAny(v);
  if (!code) return v || '-';
  const m = code.match(/^(\d+)ft(\d+)in$/);
  return `${m[1]} ft ${m[2]} in`;
}

/* ------------------------ Initial shape -------------------------- */
const INITIAL_PROFILE = {
  name: '',
  matri_id: '',
  aboutMyself: '',
  aboutFamily: '',
  height: '',
  religion: '',
  caste: '',
  mobile: '',
  verified: true,
  photo: ['default.jpg'],
  basic: {
    profileFor: '',
    bodyType: '',
    complexion: '',
    status: '',
    weight: '',
    marital: '',
    drinking: '',
    smoking: '',
    dob: '',
    time: '',
    age: 22,
    height: '',
    tongue: '',
    eating: '',
  },
  religionInfo: { religion: '', caste: '', gothram: '', rashi: '', star: '', manglik: '' },
  location: { country: '', state: '', city: '', citizenship: '' },
  professional: { education: '', college: '', detail: '', job: '', role: '', income: '' },
  family: { values: '', type: '', status: '', origin: '', location: '', father: '', mother: '', brothers: 1, sisters: 1 },
  // lifestyle: { eating: '', drinking: '', smoking: '' },
  partnerPref: {
    ageFrom: 22,
    ageTo: 26,
    heightFrom: '',
    heightTo: '',
    religion: '',
    caste: '',
    tongue: '',
    country: '',
    degree: '',
    job: '',
    status: '',
    income: '',
    physical: '',
    manglik: '',
    eating: '',
    drinking: '',
    smoking: '',
  },
};

/* ---------------------- Dropdown options map ---------------------- */
const FIELD_OPTIONS = {
  basic: {
    profileFor: [
      'Self',
      'Son',
      'Daughter',
      'Brother',
      'Sister',
      'Relative',
      'Friend',
    ],
    bodyType: ['Slim', 'Average', 'Athletic', 'Heavy'],
    complexion: ['Very Fair', 'Fair', 'Wheatish', 'Wheatish Brown', 'Dark'],
    status: ['Employed', 'Business', 'Student', 'Not Working'],
    marital: ['Never Married', 'Divorced', 'Widowed', 'Awaiting Divorce'],
    drinking: ['No', 'Yes', 'Occasionally'],
    smoking: ['No', 'Yes', 'Occasionally'],
    tongue: [
      'Odia',
      'Hindi',
      'English',
      'Bengali',
      'Telugu',
      'Tamil',
      'Kannada',
      'Marathi',
      'Gujarati',
      'Punjabi',
      'Other',
    ],
    eating: ['Veg', 'Non-Veg', 'Eggetarian', 'Jain', 'Vegan'],
    age: AGE_RANGE.map((a) => String(a)),
    weight: WEIGHT_RANGE.map((w) => `${w} kg`),
  },

  religionInfo: {
    religion: [
      'Hindu',
      'Muslim',
      'Christian',
      'Sikh',
      'Jain',
      'Buddhist',
      'Parsi',
      'No Religion',
      'Spiritual - Not Religious',
      'Other',
    ],
    caste: [
      'Khandayat',
      'Brahmin',
      'Karana',
      'Kshatriya',
      'Vaishya',
      'SC',
      'ST',
      'OBC',
      'General',
      'Other',
    ],
    manglik: ['No', 'Yes', "Doesn\'t Matter"],
    gothram: ['Don\'t know', 'Kashyap', 'Bharadwaj', 'Vashishtha', 'Other'],
    rashi: [
      'Mesh (Aries)',
      'Vrishabh (Taurus)',
      'Mithun (Gemini)',
      'Kark (Cancer)',
      'Singh (Leo)',
      'Kanya (Virgo)',
      'Tula (Libra)',
      'Vrishchik (Scorpio)',
      'Dhanu (Sagittarius)',
      'Makar (Capricorn)',
      'Kumbh (Aquarius)',
      'Meen (Pisces)',
    ],
    star: [
      'Ashwini',
      'Bharani',
      'Krittika',
      'Rohini',
      'Mrigasira',
      'Ardra',
      'Punarvasu',
      'Pushya',
      'Ashlesha',
      'Magha',
      'Purva Phalguni',
      'Uttara Phalguni',
      'Hasta',
      'Chitra',
      'Swati',
      'Vishakha',
      'Anuradha',
      'Jyeshta',
      'Moola',
      'Purvashadha',
      'Uttarashadha',
      'Shravana',
      'Dhanishta',
      'Shatabhisha',
      'Purvabhadra',
      'Uttarabhadra',
      'Revati',
    ],
  },

  location: {
    country: ['India', 'USA', 'UK', 'Canada', 'Australia', 'UAE', 'Other'],
    state: [
      'Odisha',
      'Andhra Pradesh',
      'Telangana',
      'Karnataka',
      'Tamil Nadu',
      'Maharashtra',
      'Delhi',
      'West Bengal',
      'Other',
    ],
    city: [
      'Bhubaneswar',
      'Cuttack',
      'Berhampur',
      'Rourkela',
      'Hyderabad',
      'Bangalore',
      'Chennai',
      'Mumbai',
      'Pune',
      'Kolkata',
      'Other',
    ],
    citizenship: ['India', 'OCI', 'NRI', 'Other'],
  },

  professional: {
    education: [
      '10th',
      '12th',
      'Diploma',
      'Graduate',
      'Post Graduate',
      'Doctorate',
    ],
    job: [
      'Software Engineer',
      'Developer',
      'Government Job',
      'Teacher',
      'Business / Self Employed',
      'Not Working',
      'Other',
    ],
    role: [
      'Software Engineer',
      'Frontend Developer',
      'Backend Developer',
      'Full Stack Developer',
      'Manager',
      'Team Lead',
      'Other',
    ],
    income: [
      'No Income',
      '0 - 3 LPA',
      '3 - 5 LPA',
      '5 - 7 LPA',
      '7 - 10 LPA',
      '10 - 15 LPA',
      '15 LPA and above',
    ],
  },

  family: {
    values: ['Traditional', 'Moderate', 'Liberal'],
    type: ['Joint', 'Nuclear', 'Others'],
    status: ['Middle Class', 'Upper Middle Class', 'Rich', 'Affluent'],
    origin: ['Village', 'Town', 'City', 'Metro City', 'Other'],
    location: [
      'Bhubaneswar',
      'Cuttack',
      'Berhampur',
      'Rourkela',
      'Hyderabad',
      'Bangalore',
      'Mumbai',
      'Kolkata',
      'Other',
    ],
    brothers: SIBLING_RANGE.map((n) => String(n)),
    sisters: SIBLING_RANGE.map((n) => String(n)),
  },

  // lifestyle: {
  //   eating: ['Veg', 'Non-Veg', 'Eggetarian', 'Jain', 'Vegan'],
  //   drinking: ['No', 'Yes', 'Occasionally'],
  //   smoking: ['No', 'Yes', 'Occasionally'],
  // },

  partnerPref: {
    ageFrom: AGE_RANGE.map((a) => String(a)),
    ageTo: AGE_RANGE.map((a) => String(a)),
    religion: [
      'Any',
      'Hindu',
      'Muslim',
      'Christian',
      'Sikh',
      'Jain',
      'Buddhist',
      'Other',
    ],
    // 👉 UPDATED caste options here
    caste: [
      'Any',
      'Same as mine',
      "Doesn\'t Matter",
      'Khandayat',
      'Brahmin',
      'Karana',
      'Kshatriya',
      'Vaishya',
      'SC',
      'ST',
      'OBC',
      'General',
      'Other',
    ],
    tongue: ['Any', 'Odia', 'Hindi', 'English', 'Bengali', 'Other'],
    country: ['Any', 'India', 'USA', 'UK', 'Canada', 'Australia', 'UAE'],
    degree: [
      'Any',
      '10th',
      '12th',
      'Diploma',
      'Graduate',
      'Post Graduate',
      'Doctorate',
    ],
    job: [
      'Any',
      'Software Engineer',
      'Government Job',
      'Business',
      'Private Job',
      'Not Working',
    ],
    status: ['Any', 'Middle Class', 'Upper Middle Class', 'Rich', 'Affluent'],
    income: [
      'Any',
      'No Income',
      '0 - 3 LPA',
      '3 - 5 LPA',
      '5 - 7 LPA',
      '7 - 10 LPA',
      '10 - 15 LPA',
      '15 LPA and above',
    ],
    physical: ['Any', 'Normal', 'Physically Challenged'],
    manglik: ['Any', 'Yes', 'No', "Doesn\'t Matter"],
    eating: ['Any', 'Veg', 'Non-Veg', 'Eggetarian', 'Jain', 'Vegan'],
    drinking: ['Any', 'No', 'Yes', 'Occasionally'],
    smoking: ['Any', 'No', 'Yes', 'Occasionally'],
  },
};

export default function ProfileEdit() {
  const router = useRouter();

  const [userId, setUserId] = useState(null);
  const [profile, setProfile] = useState(INITIAL_PROFILE);
  const [editSection, setEditSection] = useState(null);
  const [formData, setFormData] = useState({});
  const [loading, setLoading] = useState(true);

  // ---------- Data ----------
  const fetchUserInfo = async () => {
    try {
      const res = await fetch('/api/get-user-info', { cache: 'no-store', credentials: 'same-origin' });
      if (!res.ok) throw new Error(`get-user-info ${res.status}`);
      const data = await res.json();
      const u = data.user || {};
      setUserId(u.id ?? null);

      const uPhoto = u.photo;
      let finalPhoto = ['default.jpg'];
      if (Array.isArray(uPhoto)) {
        finalPhoto = uPhoto;
      } else if (uPhoto) {
        finalPhoto = [uPhoto];
      }

      setProfile((prev) => ({
        ...prev,
        name: u.name ?? prev.name,
        matri_id: u.matri_id ?? prev.matri_id,
        mobile: u.mobile ?? u.phone ?? '-',
        photo: finalPhoto,
        verified: u.verified ?? prev.verified,
        religion: prev.religion || u.religion || '',
        caste: prev.caste || u.caste || '',
        religionInfo: {
          ...prev.religionInfo,
          religion: prev.religionInfo?.religion || u.religion || '',
          caste: prev.religionInfo?.caste || u.caste || '',
        },
      }));
    } catch (err) {
      console.error('Failed to fetch user info:', err);
    }
  };

  const fetchProfile = async () => {
    try {
      const res = await fetch('/api/get-profile', { cache: 'no-store', credentials: 'same-origin' });
      if (!res.ok) throw new Error(`get-profile ${res.status}`);
      const { profile: p } = await res.json();
      if (!p) return;

      setProfile((prev) => ({
        ...prev,
        // merge shallow fields
        aboutMyself: p.aboutMyself || prev.aboutMyself,
        aboutFamily: p.aboutFamily || prev.aboutFamily,
        height: p.height || prev.height,
        religion: p.religion || prev.religion,
        caste: p.caste || prev.caste,
        mobile: p.mobile || prev.mobile,

        // merge nested objects
        basic: { ...INITIAL_PROFILE.basic, ...(prev.basic || {}), ...(p.basic || {}) },
        religionInfo: { ...INITIAL_PROFILE.religionInfo, ...(prev.religionInfo || {}), ...(p.religionInfo || {}) },
        location: { ...INITIAL_PROFILE.location, ...(prev.location || {}), ...(p.location || {}) },
        professional: { ...INITIAL_PROFILE.professional, ...(prev.professional || {}), ...(p.professional || {}) },
        family: { ...INITIAL_PROFILE.family, ...(prev.family || {}), ...(p.family || {}) },

        partnerPref: { ...INITIAL_PROFILE.partnerPref, ...(prev.partnerPref || {}), ...(p.partnerPref || {}) },
      }));
    } catch (err) {
      console.error('Failed to fetch full profile:', err);
    }
  };

  useEffect(() => {
    const init = async () => {
      setLoading(true);
      await fetchUserInfo();
      await fetchProfile();
      setLoading(false);
    };
    init();
  }, []);

  useEffect(() => {
    const setPadFromHeader = () => {
      const header = document.getElementById('siteHeader');
      const h = header?.offsetHeight || 72;
      document.documentElement.style.setProperty('--header-height', `${h}px`);
    };
    setPadFromHeader();
    window.addEventListener('resize', setPadFromHeader);
    return () => window.removeEventListener('resize', setPadFromHeader);
  }, []);

  // ---------- Handlers ----------
  const handleEditClick = (section) => {
    setEditSection(section);
    const isText = section === 'aboutMyself' || section === 'aboutFamily';

    // when entering edit, normalize any height fields to codes so selects pick the right value
    if (section === 'basic') {
      const src = profile.basic || {};
      setFormData({
        ...src,
        height: toHeightCodeAny(src.height),
      });
      return;
    }
    if (section === 'partnerPref') {
      const src = profile.partnerPref || {};
      setFormData({
        ...src,
        heightFrom: toHeightCodeAny(src.heightFrom),
        heightTo: toHeightCodeAny(src.heightTo),
      });
      return;
    }

    setFormData(isText ? (profile[section] ?? '') : { ...(profile[section] ?? {}) });
  };

  const handleCancel = () => {
    setEditSection(null);
    setFormData({});
  };

  const handleSave = async () => {
    if (!editSection) return;

    const mapSection = {
      religionInfo: 'religion_info',
      partnerPref: 'partner_pref',
      aboutMyself: 'about_myself',
      aboutFamily: 'about_family',
    };
    const sectionKey = mapSection[editSection] || editSection;

    // Make sure we send height in code form
    let payload = formData;
    if (editSection === 'basic') {
      payload = { ...formData, height: toHeightCodeAny(formData.height) };
    }
    if (editSection === 'partnerPref') {
      payload = {
        ...formData,
        heightFrom: toHeightCodeAny(formData.heightFrom),
        heightTo: toHeightCodeAny(formData.heightTo),
      };
    }

    try {
      const res = await fetch('/api/edit-profile', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'same-origin',
        body: JSON.stringify({ section: sectionKey, data: payload }),
      });
      const body = await res.json().catch(() => ({}));

      if (!res.ok || body?.error) {
        const msg = body?.error || `Request failed (${res.status})`;
        console.error('❌ Save failed:', msg, body);
        alert(`❌ Save failed: ${msg}`);
        return;
      }

      // update local state only
      let next = { ...profile };
      if (editSection === 'basic') {
        next.basic = { ...formData, height: payload.height };
      } else if (editSection === 'partnerPref') {
        next.partnerPref = {
          ...formData,
          heightFrom: payload.heightFrom,
          heightTo: payload.heightTo,
        };
      } else if (sectionKey === 'religion_info' && body.saved) {
        next.religionInfo = {
          ...profile.religionInfo,
          ...formData,
          gothram: body.saved.gothram ?? formData.gothram ?? '',
          rashi: body.saved.rashi ?? formData.rashi ?? '',
          star: body.saved.star ?? formData.star ?? '',
          manglik: body.saved.manglik ?? formData.manglik ?? '',
        };
      } else if (editSection === 'aboutMyself' || editSection === 'aboutFamily') {
        next[editSection] = formData || '';
      } else {
        next[editSection] = formData;
      }

      setProfile(next);
      setEditSection(null);
    } catch (error) {
      console.error('❌ Error calling backend:', error);
      alert('❌ Save failed due to a network error.');
    }
  };

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
  };

  // ---------- UI helpers ----------
  const renderTextSection = (sectionName, displayName) => (
    <Card className="mt-3 pe-card" key={sectionName}>
      <Card.Header className="d-flex justify-content-between align-items-center">
        <strong>{displayName}</strong>
        {editSection !== sectionName && (
          <Button size="sm" onClick={() => handleEditClick(sectionName)}>
            Edit
          </Button>
        )}
      </Card.Header>
      <Card.Body>
        {editSection === sectionName ? (
          <>
            <Form.Control
              as="textarea"
              rows={4}
              name={sectionName}
              value={typeof formData === 'string' ? formData : ''}
              onChange={(e) => setFormData(e.target.value)}
            />
            <div className="mt-3">
              <Button variant="secondary" className="me-2" onClick={handleCancel}>
                Cancel
              </Button>
              <Button variant="primary" onClick={handleSave}>
                Update
              </Button>
            </div>
          </>
        ) : (
          <p>{profile[sectionName] || <em>No data available.</em>}</p>
        )}
      </Card.Body>
    </Card>
  );

  const renderSection = (sectionName, displayName) => (
    <Card className="mt-3 pe-card" key={sectionName}>
      <Card.Header className="d-flex justify-content-between align-items-center">
        <strong>{displayName}</strong>
        {editSection !== sectionName && (
          <Button size="sm" onClick={() => handleEditClick(sectionName)}>
            Edit
          </Button>
        )}
      </Card.Header>
      <Card.Body>
        {editSection === sectionName ? (
          <>
            <Form>
              <Row>
                {Object.entries(formData || {}).map(([key, value]) => {
                  const label = key
                    .replace(/([A-Z])/g, ' $1')
                    .replace(/^./, (s) => s.toUpperCase());

                  // Height selectors for Basic and Partner Pref sections
                  const isBasicHeight =
                    sectionName === 'basic' && key === 'height';
                  const isPrefHeight =
                    sectionName === 'partnerPref' &&
                    (key === 'heightFrom' || key === 'heightTo');

                  // 1) Height select
                  if (isBasicHeight || isPrefHeight) {
                    return (
                      <Form.Group as={Col} md={6} key={key} className="mb-3">
                        <Form.Label>{label}</Form.Label>
                        <Form.Select
                          name={key}
                          value={toHeightCodeAny(value) || ''}
                          onChange={handleChange}
                        >
                          <option value="">-- Select --</option>
                          {HEIGHT_OPTIONS.map((opt) => (
                            <option key={opt.value} value={opt.value}>
                              {opt.label}
                            </option>
                          ))}
                        </Form.Select>
                      </Form.Group>
                    );
                  }

                  // 2) Dropdowns for configured fields
                  const optionsForField =
                    FIELD_OPTIONS?.[sectionName]?.[key] || null;

                  if (optionsForField) {
                    return (
                      <Form.Group as={Col} md={6} key={key} className="mb-3">
                        <Form.Label>{label}</Form.Label>
                        <Form.Select
                          name={key}
                          value={value || ''}
                          onChange={handleChange}
                        >
                          <option value="">-- Select --</option>
                          {optionsForField.map((opt) => (
                            <option key={opt} value={opt}>
                              {opt}
                            </option>
                          ))}
                        </Form.Select>
                      </Form.Group>
                    );
                  }

                  // 3) Default text input
                  return (
                    <Form.Group as={Col} md={6} key={key} className="mb-3">
                      <Form.Label>{label}</Form.Label>
                      <Form.Control
                        type="text"
                        name={key}
                        value={value || ''}
                        onChange={handleChange}
                      />
                    </Form.Group>
                  );
                })}
              </Row>
            </Form>
            <Button variant="secondary" className="me-2" onClick={handleCancel}>
              Cancel
            </Button>
            <Button variant="primary" onClick={handleSave}>
              Update
            </Button>
          </>
        ) : (
          <Row>
            {profile[sectionName] && typeof profile[sectionName] === 'object' ? (
              Object.entries(profile[sectionName]).map(([key, value]) => {
                // Skip nested objects
                if (typeof value === 'object' && value !== null) return null;

                const label = key
                  .replace(/([A-Z])/g, ' $1')
                  .replace(/^./, (s) => s.toUpperCase());

                let displayVal = value || '-';

                // Height formatting
                if (/height/i.test(key)) {
                  displayVal = prettyHeight(value);
                }
                // Income formatting (lookup in FIELD_OPTIONS if available)
                else if (/income/i.test(key)) {
                  const opts = FIELD_OPTIONS?.[sectionName]?.income;
                  if (opts && Array.isArray(opts)) {
                    // check if value is a valid index
                    const idx = Number(value);
                    if (!isNaN(idx) && opts[idx]) {
                      displayVal = opts[idx];
                    } else {
                      // otherwise just show value (it might be a string already)
                      displayVal = value || '-';
                    }
                  }
                }

                return (
                  <Col md={6} key={key} className="mb-2">
                    <strong>{label}:</strong>{' '}
                    {displayVal}
                  </Col>
                );
              })
            ) : (
              <Col>
                <em>No data found</em>
              </Col>
            )}
          </Row>
        )}
      </Card.Body>
    </Card>
  );

  if (loading) {
    return (
      <Container className="py-4" style={{ paddingTop: 'var(--header-height, 80px)' }}>
        <div className="text-center">
          <div className="spinner-border" role="status">
            <span className="visually-hidden">Loading...</span>
          </div>
          <p className="mt-2">Loading profile...</p>
        </div>
      </Container>
    );
  }

  const profilePhoto = resolvePhoto(profile.photo?.[0]);

  return (
    <>
      <br />
      <br />
      {/* Page surface wrapper with soft background */}
      <div className="profileedit-surface">
        <Container className="py-4" style={{ paddingTop: 'var(--header-height, 80px)' }}>
          <Card className="mb-4 pe-card">
            <Card.Body>
              <Row className="align-items-center">
                <Col md={2} className="mb-3 mb-md-0">
                  <div className="pe-avatar d-flex align-items-center justify-content-center">
                    <Image
                      src={profilePhoto}
                      alt="Profile"
                      width={160}
                      height={160}
                      className="rounded"
                      unoptimized
                      style={{ objectFit: 'cover' }}
                    />
                  </div>
                </Col>

                <Col md={8}>
                  <h5 className="text-primary fw-bold mb-1">{profile.name || 'No Name'}</h5>
                  <p className="mb-2"><strong>ID:</strong> {profile.matri_id || '-'}</p>

                  <p className="mb-2">
                    {profile.religion || profile.religionInfo?.religion || ''}<br />
                    {profile.caste || profile.religionInfo?.caste || ''}
                  </p>

                  <p className="text-success fw-bold mb-0">
                    📱 {profile.mobile || '-'} {profile.verified && '(✔ Verified)'}
                  </p>
                  <div className="d-flex flex-wrap gap-2 text-muted small mt-2">
                    <span className="badge bg-light text-dark border">Age: {profile.basic?.age || '-'}</span>
                    <span className="badge bg-light text-dark border">Height: {prettyHeight(profile.basic?.height)}</span>
                    <span className="badge bg-light text-dark border">{profile.religion || '-'}</span>
                    <span className="badge bg-light text-dark border">{profile.location?.city || '-'}, {profile.location?.state || '-'}</span>
                  </div>
                </Col>

                <Col md={2} className="text-end">
                  <Button
                    variant="outline-primary"
                    onClick={() => router.push('/dashboard/myhome')}
                    className="btn-sm fw-bold border-2"
                  >
                    Back to Board
                  </Button>
                </Col>
              </Row>
            </Card.Body>
          </Card>

          <Row>
            {/* LEFT COLUMN */}
            <Col lg={4}>
              {renderTextSection('aboutMyself', 'About Myself')}
              {renderTextSection('aboutFamily', 'About Family')}
            </Col>

            {/* RIGHT COLUMN */}
            <Col lg={8}>
              {renderSection('basic', 'Basic Information')}
              {renderSection('religionInfo', 'Religious Information')}
              {renderSection('location', 'Location Details')}
              {renderSection('professional', 'Education & Career')}
              {renderSection('family', 'Family Details')}
              {renderSection('partnerPref', 'Partner Preference')}
            </Col>
          </Row>
        </Container>
      </div>

      <style jsx global>{`
        .profileedit-surface {
          background-color: #f4f7fa;
          min-height: 100vh;
          padding-bottom: 60px;
        }
        .pe-card {
           border: 1px solid rgba(0,0,0,0.06);
           border-radius: 12px;
           box-shadow: 0 2px 8px rgba(0,0,0,0.04);
           background: #fff;
           overflow: hidden;
           margin-bottom: 24px;
        }
        .pe-card .card-header {
           background-color: #fff;
           border-bottom: 1px solid #f1f1f1;
           padding: 16px 20px;
        }
        .pe-card .card-header strong {
           font-size: 1rem;
           color: var(--brand-maroon);
           font-weight: 700;
           text-transform: uppercase;
           letter-spacing: 0.5px;
        }
        .pe-card .card-body {
           padding: 24px;
        }
        .pe-avatar {
           border: 1px solid rgba(0,0,0,0.1);
           border-radius: 8px;
           overflow: hidden;
        }
        .form-control:focus, .form-select:focus {
           box-shadow: 0 0 0 4px rgba(227, 49, 131, 0.1);
           border-color: var(--brand-primary);
        }
        .btn-primary {
           background-color: var(--brand-primary);
           border-color: var(--brand-primary);
        }
        .btn-primary:hover {
           background-color: #c21e6b; /* darker pink */
           border-color: #c21e6b;
        }
        .btn-outline-primary {
            color: var(--brand-primary);
            border-color: var(--brand-primary);
        }
        .btn-outline-primary:hover {
            background-color: var(--brand-primary);
            color: #fff;
        }
        .text-primary {
            color: var(--brand-primary) !important;
        }
      `}</style>
    </>
  );
}
