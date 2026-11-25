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
  const [saving, setSaving] = useState(false);
  const [toast, setToast] = useState('');

  useEffect(() => {
    if (!toast) return;
    const t = setTimeout(() => setToast(''), 2600);
    return () => clearTimeout(t);
  }, [toast]);

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

    setSaving(true);
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
        setToast(`Could not save: ${msg}`);
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
      setToast('Saved — your profile is updated');
    } catch (error) {
      console.error('❌ Error calling backend:', error);
      setToast('Save failed due to a network error.');
    } finally {
      setSaving(false);
    }
  };

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
  };

  // ---------- UI helpers ----------
  const FIELD_LABELS = {
    profileFor: 'Profile created for', bodyType: 'Body type', complexion: 'Complexion', status: 'Employment status',
    weight: 'Weight', marital: 'Marital status', drinking: 'Drinking', smoking: 'Smoking', dob: 'Date of birth',
    time: 'Time of birth', age: 'Age', height: 'Height', tongue: 'Mother tongue', eating: 'Diet',
    religion: 'Religion', caste: 'Community / Caste', gothram: 'Gothram', rashi: 'Rashi (Moon sign)', star: 'Nakshatra (Star)', manglik: 'Manglik',
    country: 'Country', state: 'State', city: 'City', citizenship: 'Citizenship',
    education: 'Highest education', college: 'College / University', detail: 'Education details', job: 'Occupation', role: 'Job role', income: 'Annual income',
    values: 'Family values', type: 'Family type', origin: 'Native place type', location: 'Family location',
    father: "Father's occupation", mother: "Mother's occupation", brothers: 'Brothers', sisters: 'Sisters',
    ageFrom: 'Age from', ageTo: 'Age to', heightFrom: 'Height from', heightTo: 'Height to', degree: 'Education',
    physical: 'Physical status',
  };
  const labelFor = (key) => FIELD_LABELS[key] || key.replace(/([A-Z])/g, ' $1').replace(/^./, (s) => s.toUpperCase());

  const SECTIONS = [
    { key: 'aboutMyself', title: 'About Myself', icon: 'bi-person-heart', text: true, hint: 'Share your personality, values, hobbies and what makes you happy. Profiles with a warm introduction get far more interests.' },
    { key: 'basic', title: 'Basic Information', icon: 'bi-person-vcard' },
    { key: 'religionInfo', title: 'Religion & Horoscope', icon: 'bi-flower1' },
    { key: 'location', title: 'Location', icon: 'bi-geo-alt' },
    { key: 'professional', title: 'Education & Career', icon: 'bi-mortarboard' },
    { key: 'aboutFamily', title: 'About My Family', icon: 'bi-house-heart', text: true, hint: 'Describe your family — parents, siblings, traditions and the values you grew up with.' },
    { key: 'family', title: 'Family Details', icon: 'bi-people' },
    { key: 'partnerPref', title: 'Partner Preferences', icon: 'bi-hearts' },
  ];

  const isFilled = (v) => v !== undefined && v !== null && String(v).trim() !== '' && String(v).trim() !== '-';
  const sectionStats = (key) => {
    const v = profile[key];
    if (typeof v === 'string' || v == null) return { done: isFilled(v) && String(v).trim().length >= 30 ? 1 : 0, total: 1 };
    const entries = Object.entries(v).filter(([, x]) => typeof x !== 'object' || x === null);
    return { done: entries.filter(([, x]) => isFilled(x)).length, total: entries.length || 1 };
  };
  const completion = (() => {
    const s = SECTIONS.map((x) => sectionStats(x.key));
    const pct = Math.round((s.reduce((a, b) => a + b.done / b.total, 0) / s.length) * 100);
    return Math.min(100, pct + (profile.photo?.[0] && !/default\.jpg$/.test(profile.photo[0]) ? 0 : -5));
  })();
  const tips = SECTIONS.filter((x) => sectionStats(x.key).done / sectionStats(x.key).total < 0.6).slice(0, 3);

  const formatValue = (sectionName, key, value) => {
    if (!isFilled(value)) return null;
    if (/height/i.test(key)) return prettyHeight(value);
    if (/income/i.test(key)) {
      const opts = FIELD_OPTIONS?.[sectionName]?.income;
      const idx = Number(value);
      if (Array.isArray(opts) && !Number.isNaN(idx) && opts[idx]) return opts[idx];
    }
    if (key === 'dob') {
      const d = new Date(value);
      return Number.isNaN(d.getTime()) ? String(value) : d.toLocaleDateString('en-IN', { day: 'numeric', month: 'long', year: 'numeric' });
    }
    return String(value);
  };

  const EditActions = (
    <div className="d-flex gap-2 justify-content-end mt-3 pt-3" style={{ borderTop: '1px solid #f1e6d4' }}>
      <button type="button" className="btn btn-outline-secondary px-4" onClick={handleCancel} disabled={saving}>Cancel</button>
      <button type="button" className="btn btn-primary px-4" onClick={handleSave} disabled={saving}>
        {saving ? <><span className="spinner-border spinner-border-sm me-2" />Saving…</> : <><i className="bi bi-check2 me-1" />Save changes</>}
      </button>
    </div>
  );

  const SectionShell = ({ s, children }) => { // called as a function, not <SectionShell/>
    const st = sectionStats(s.key);
    const complete = st.done / st.total >= 0.99;
    return (
      <section key={s.key} id={`sec-${s.key}`} className={`pe-section ${editSection === s.key ? 'editing' : ''}`}>
        <header className="pe-section-head">
          <span className="pe-section-icon"><i className={`bi ${s.icon}`} /></span>
          <div className="flex-grow-1">
            <h3>{s.title}</h3>
            <small className={complete ? 'text-success' : 'text-muted'}>
              {complete ? <><i className="bi bi-check-circle-fill me-1" />Complete</> : s.text ? 'Not written yet' : `${st.done} of ${st.total} filled`}
            </small>
          </div>
          {editSection !== s.key && (
            <button type="button" className="btn btn-sm btn-outline-danger px-3" onClick={() => handleEditClick(s.key)} disabled={Boolean(editSection)}>
              <i className="bi bi-pencil me-1" />Edit
            </button>
          )}
        </header>
        <div className="pe-section-body">{children}</div>
      </section>
    );
  };

  const renderTextSection = (s) => (
    SectionShell({ s, children: (<>
      {editSection === s.key ? (
        <>
          <p className="small text-muted mb-2"><i className="bi bi-lightbulb me-1 text-gold" />{s.hint}</p>
          <textarea
            className="form-control"
            rows={6}
            maxLength={1500}
            value={typeof formData === 'string' ? formData : ''}
            onChange={(e) => setFormData(e.target.value)}
            autoFocus
          />
          <div className="small text-muted text-end mt-1">{(typeof formData === 'string' ? formData : '').length}/1500</div>
          {EditActions}
        </>
      ) : profile[s.key] ? (
        <p className="mb-0 pe-prose">{profile[s.key]}</p>
      ) : (
        <button type="button" className="pe-empty" onClick={() => handleEditClick(s.key)} disabled={Boolean(editSection)}>
          <i className="bi bi-plus-circle me-2" />Write a few lines — {s.hint.split('.')[0].toLowerCase()}.
        </button>
      )}
    </>) })
  );

  const renderSection = (s) => (
    SectionShell({ s, children: (<>
      {editSection === s.key ? (
        <>
          <div className="row g-3">
            {Object.entries(formData || {}).map(([key, value]) => {
              const isHeight = (s.key === 'basic' && key === 'height') || (s.key === 'partnerPref' && (key === 'heightFrom' || key === 'heightTo'));
              const options = FIELD_OPTIONS?.[s.key]?.[key] || null;
              return (
                <div className="col-md-6" key={key}>
                  <label className="form-label" htmlFor={`f-${s.key}-${key}`}>{labelFor(key)}</label>
                  {isHeight ? (
                    <select id={`f-${s.key}-${key}`} className="form-select" name={key} value={toHeightCodeAny(value) || ''} onChange={handleChange}>
                      <option value="">Select</option>
                      {HEIGHT_OPTIONS.map((opt) => <option key={opt.value} value={opt.value}>{opt.label}</option>)}
                    </select>
                  ) : options ? (
                    <select id={`f-${s.key}-${key}`} className="form-select" name={key} value={value || ''} onChange={handleChange}>
                      <option value="">Select</option>
                      {options.map((opt) => <option key={opt} value={opt}>{opt}</option>)}
                    </select>
                  ) : (
                    <input
                      id={`f-${s.key}-${key}`}
                      type={key === 'dob' ? 'date' : key === 'time' ? 'time' : 'text'}
                      className="form-control"
                      name={key}
                      value={key === 'dob' && value ? String(value).slice(0, 10) : value || ''}
                      onChange={handleChange}
                    />
                  )}
                </div>
              );
            })}
          </div>
          {EditActions}
        </>
      ) : (
        <div className="row g-3">
          {Object.entries(profile[s.key] || {})
            .filter(([, v]) => typeof v !== 'object' || v === null)
            .map(([key, value]) => {
              const shown = formatValue(s.key, key, value);
              return (
                <div className="col-6 col-md-4" key={key}>
                  <div className="pe-fact">
                    <small>{labelFor(key)}</small>
                    <div className={shown ? '' : 'missing'}>{shown || 'Not added'}</div>
                  </div>
                </div>
              );
            })}
        </div>
      )}
    </>) })
  );

  if (loading) {
    return (
      <div className="profileedit-surface py-5">
        <div className="container">
          <div className="luxe-card loading-skeleton mb-4" style={{ height: 220 }} />
          <div className="row g-4">
            <div className="col-lg-3"><div className="luxe-card loading-skeleton" style={{ height: 360 }} /></div>
            <div className="col-lg-9"><div className="luxe-card loading-skeleton" style={{ height: 520 }} /></div>
          </div>
        </div>
      </div>
    );
  }

  const profilePhoto = resolvePhoto(profile.photo?.[0]);
  const hasPhoto = profile.photo?.[0] && !/default\.jpg$/.test(profile.photo[0]);
  const chips = [
    profile.basic?.age && `${profile.basic.age} yrs`,
    profile.basic?.height && prettyHeight(profile.basic.height),
    profile.religionInfo?.religion || profile.religion,
    profile.religionInfo?.caste || profile.caste,
    [profile.location?.city, profile.location?.state].filter(Boolean).join(', '),
    profile.professional?.job,
  ].filter((x) => isFilled(x));

  return (
    <div className="profileedit-surface pb-5">
      {/* Header band */}
      <section className="pe-hero">
        <div className="mandala-deco light" style={{ width: 520, height: 520, right: -140, top: -200 }} aria-hidden="true" />
      </section>

      <div className="container pe-head">
        <div className="luxe-card p-4 p-lg-5">
          <div className="row g-4 align-items-center">
            <div className="col-auto">
              <div className="pe-photo">
                <img
                  src={hasPhoto ? profilePhoto : '/images/avatar-male.svg'}
                  alt="Your profile"
                  onError={(e) => { e.currentTarget.onerror = null; e.currentTarget.src = '/images/avatar-male.svg'; }}
                />
                <a href="/dashboard/upload-photo" className="pe-photo-btn" title="Change photo"><i className="bi bi-camera" /></a>
              </div>
            </div>
            <div className="col">
              <span className="eyebrow" style={{ fontSize: '0.62rem' }}>My Profile · {profile.matri_id || '—'}</span>
              <h1 className="mb-2" style={{ fontSize: 'clamp(2rem, 3.6vw, 2.8rem)' }}>
                {profile.name || 'Your Name'}
                {profile.verified && <span className="verified-chip position-static ms-2 align-middle" style={{ fontSize: '0.72rem' }}><i className="bi bi-patch-check-fill" /> Verified</span>}
              </h1>
              <div className="d-flex flex-wrap gap-2 mb-3">
                {chips.map((c) => <span key={c} className="profile-chip">{c}</span>)}
              </div>
              <div className="d-flex flex-wrap gap-2">
                {profile.matri_id && (
                  <a href={`/matrimoney/profile-details/${profile.matri_id}`} className="btn btn-primary btn-sm px-3">
                    <i className="bi bi-eye me-1" />Preview as others see it
                  </a>
                )}
                <a href="/dashboard/upload-photo" className="btn btn-outline-danger btn-sm px-3"><i className="bi bi-images me-1" />Manage photos</a>
                <a href="/dashboard/profile-setting" className="btn btn-outline-secondary btn-sm px-3"><i className="bi bi-shield-lock me-1" />Privacy</a>
              </div>
            </div>
            <div className="col-12 col-lg-3">
              <div className="pe-strength">
                <div className="d-flex justify-content-between align-items-end mb-2">
                  <span className="small fw-semibold" style={{ color: 'var(--maroon-900)' }}>Profile strength</span>
                  <span className="stat-num" style={{ fontSize: '2rem' }}>{Math.max(0, completion)}%</span>
                </div>
                <div className="progress" style={{ height: 8 }}>
                  <div className="progress-bar" style={{ width: `${Math.max(0, completion)}%`, background: completion >= 80 ? 'var(--foil)' : 'var(--royal)' }} />
                </div>
                <small className="text-muted d-block mt-2">
                  {completion >= 80 ? 'Excellent! Your profile stands out.' : 'Complete profiles receive noticeably more interests.'}
                </small>
              </div>
            </div>
          </div>
        </div>
      </div>

      <div className="container mt-4">
        <div className="row g-4">
          <aside className="col-lg-3">
            <nav className="luxe-card p-3 pe-nav">
              <div className="nav-menu-label p-0 px-2 mb-2">Sections</div>
              {SECTIONS.map((s) => {
                const st = sectionStats(s.key);
                const pct = st.done / st.total;
                return (
                  <a key={s.key} href={`#sec-${s.key}`} className="pe-nav-link">
                    <i className={`bi ${s.icon}`} />
                    <span className="flex-grow-1">{s.title}</span>
                    {pct >= 0.99 ? <i className="bi bi-check-circle-fill text-success" /> : <span className="pe-nav-pct">{Math.round(pct * 100)}%</span>}
                  </a>
                );
              })}
              {tips.length > 0 && (
                <div className="pe-tips mt-3">
                  <div className="small fw-semibold mb-2" style={{ color: 'var(--maroon-900)' }}><i className="bi bi-stars me-1 text-gold" />Next best steps</div>
                  {tips.map((t) => (
                    <button key={t.key} type="button" className="pe-tip" onClick={() => { document.getElementById(`sec-${t.key}`)?.scrollIntoView({ behavior: 'smooth', block: 'start' }); if (!editSection) handleEditClick(t.key); }}>
                      Complete “{t.title}” <i className="bi bi-arrow-right" />
                    </button>
                  ))}
                </div>
              )}
            </nav>
          </aside>

          <div className="col-lg-9 d-flex flex-column gap-4">
            {SECTIONS.map((s) => (s.text ? renderTextSection(s) : renderSection(s)))}
          </div>
        </div>
      </div>

      {toast && <div className="mm-toast" role="status"><i className="bi bi-check-circle me-2" />{toast}</div>}

      <style jsx global>{`
        .profileedit-surface { background: url('/images/paisley.svg') repeat, var(--ivory); min-height: 100vh; }
        .pe-hero {
          position: relative; overflow: hidden; height: 170px;
          background: url('/images/paisley-light.svg') repeat, radial-gradient(120% 140% at 30% 0%, #7a1530 0%, #3b0a16 60%, #1c030b 100%);
          border-bottom: 1px solid rgba(232, 207, 142, 0.4);
        }
        .pe-head { margin-top: -110px; position: relative; z-index: 2; }
        .pe-photo { position: relative; width: 150px; height: 170px; border-radius: 20px; padding: 4px; background: var(--foil); box-shadow: var(--shadow-md); }
        .pe-photo img { width: 100%; height: 100%; object-fit: cover; border-radius: 16px; background: #f6ead0; }
        .pe-photo-btn {
          position: absolute; right: -8px; bottom: -8px; width: 40px; height: 40px; border-radius: 50%;
          display: flex; align-items: center; justify-content: center;
          color: var(--gold-light); background: var(--royal); border: 3px solid #fffdf9; box-shadow: var(--shadow-sm);
        }
        .pe-strength { padding: 16px; border-radius: 18px; background: #fffdf9; border: 1px solid rgba(201, 162, 74, 0.3); }
        .pe-nav { position: sticky; top: 96px; }
        .pe-nav-link {
          display: flex; align-items: center; gap: 10px; padding: 9px 10px; border-radius: 12px;
          font-size: 0.88rem; color: var(--ink); transition: background 0.2s ease;
        }
        .pe-nav-link > i:first-child { color: var(--gold-dark); width: 18px; text-align: center; }
        .pe-nav-link:hover { background: var(--gold-pale); }
        .pe-nav-pct { font-size: 0.7rem; font-weight: 600; color: var(--muted); background: #f3ece0; border-radius: 20px; padding: 1px 8px; }
        .pe-tips { padding: 12px; border-radius: 14px; background: var(--gold-pale); border: 1px dashed var(--gold); }
        .pe-tip { display: flex; justify-content: space-between; width: 100%; border: 0; background: transparent; padding: 6px 0; font-size: 0.82rem; color: var(--maroon-800); text-align: left; }
        .pe-tip:hover { color: var(--ruby); }
        .pe-section {
          scroll-margin-top: 100px;
          border-radius: 22px; background: #fff;
          border: 1px solid rgba(201, 162, 74, 0.28);
          box-shadow: var(--shadow-sm);
          transition: box-shadow 0.3s ease, border-color 0.3s ease;
        }
        .pe-section.editing { border-color: var(--gold); box-shadow: 0 0 0 4px rgba(201, 162, 74, 0.15), var(--shadow-md); }
        .pe-section-head { display: flex; align-items: center; gap: 14px; padding: 18px 22px; border-bottom: 1px solid #f1e6d4; background: linear-gradient(180deg, #fffdf9, #fbf4e8); border-radius: 22px 22px 0 0; }
        .pe-section-head h3 { font-size: 1.45rem; margin: 0; }
        .pe-section-icon { width: 44px; height: 44px; border-radius: 50%; display: inline-flex; align-items: center; justify-content: center; color: var(--gold-light); background: var(--royal); flex-shrink: 0; }
        .pe-section-body { padding: 20px 22px; }
        .pe-fact { padding: 10px 12px; border-radius: 12px; background: #fffdf9; border: 1px solid #f1e6d4; height: 100%; }
        .pe-fact small { display: block; font-size: 0.66rem; letter-spacing: 0.1em; text-transform: uppercase; color: var(--muted); margin-bottom: 2px; }
        .pe-fact div { font-weight: 600; color: var(--ink); font-size: 0.92rem; word-break: break-word; }
        .pe-fact div.missing { font-weight: 400; color: #b3a3a7; font-style: italic; }
        .pe-prose { line-height: 1.8; color: var(--ink); white-space: pre-wrap; }
        .pe-empty { width: 100%; text-align: left; padding: 16px; border-radius: 14px; border: 1px dashed var(--gold); background: var(--gold-pale); color: var(--maroon-800); font-size: 0.9rem; }
        .pe-empty:hover { background: #f3e3c4; }
        @media (max-width: 991.98px) { .pe-nav { position: static; } }
      `}</style>
    </div>
  );
}
