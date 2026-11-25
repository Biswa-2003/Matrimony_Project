// src/lib/guna-milan.js
// Ashtakoota guna milan (36 points) from the bride's and groom's Moon nakshatra (star) and rashi.
// Uses the standard North-Indian tables. This is an indicative score for browsing — the UI
// always recommends consulting a family astrologer before decisions.

export const NAKSHATRAS = [
  "Ashwini", "Bharani", "Krittika", "Rohini", "Mrigashira", "Ardra", "Punarvasu", "Pushya", "Ashlesha",
  "Magha", "Purva Phalguni", "Uttara Phalguni", "Hasta", "Chitra", "Swati", "Vishakha", "Anuradha", "Jyeshtha",
  "Mula", "Purva Ashadha", "Uttara Ashadha", "Shravana", "Dhanishta", "Shatabhisha", "Purva Bhadrapada",
  "Uttara Bhadrapada", "Revati",
];
export const RASHIS = ["Mesha", "Vrishabha", "Mithuna", "Karka", "Simha", "Kanya", "Tula", "Vrishchika", "Dhanu", "Makara", "Kumbha", "Meena"];

/* ------------------------------ parsing ------------------------------ */
const norm = (s) => String(s || "").toLowerCase().normalize("NFKD").replace(/[^a-z]/g, "");

const NAK_ALIASES = {
  ashwini: 0, ashvini: 0, aswini: 0, asvini: 0,
  bharani: 1,
  krittika: 2, kritika: 2, krithika: 2, karthigai: 2, kartika: 2,
  rohini: 3,
  mrigashira: 4, mrigasira: 4, mrigashirsha: 4, mrigasheersha: 4, mrigshira: 4, mrigasheersham: 4,
  ardra: 5, arudra: 5, aridra: 5, thiruvathirai: 5,
  punarvasu: 6, punarpoosam: 6,
  pushya: 7, pushyami: 7, poosam: 7, pooya: 7,
  ashlesha: 8, aslesha: 8, ashlesa: 8, ayilyam: 8,
  magha: 9, makha: 9, magam: 9,
  purvaphalguni: 10, poorvaphalguni: 10, purvaphalgun: 10, pubba: 10, pooram: 10,
  uttaraphalguni: 11, uttarphalguni: 11, utharaphalguni: 11, uttara: 11, uthiram: 11,
  hasta: 12, hastha: 12, hastham: 12,
  chitra: 13, chithra: 13, chitta: 13, chithirai: 13,
  swati: 14, svati: 14, swathi: 14,
  vishakha: 15, visakha: 15, vishaka: 15, visakam: 15,
  anuradha: 16, anusham: 16,
  jyeshtha: 17, jyeshta: 17, jyestha: 17, kettai: 17,
  mula: 18, moola: 18, moolam: 18,
  purvaashadha: 19, poorvashada: 19, purvashadha: 19, purvaashada: 19, pooradam: 19,
  uttaraashadha: 20, uttarashadha: 20, uttarashada: 20, uthradam: 20,
  shravana: 21, sravana: 21, shravan: 21, thiruvonam: 21,
  dhanishta: 22, dhanishtha: 22, dhanista: 22, avittam: 22,
  shatabhisha: 23, satabhisha: 23, shatabhishak: 23, sathayam: 23,
  purvabhadrapada: 24, poorvabhadrapada: 24, purvabhadra: 24, poorattathi: 24,
  uttarabhadrapada: 25, uttarabhadra: 25, utharabhadra: 25, uthrattathi: 25,
  revati: 26, revathi: 26,
};

const RASHI_ALIASES = {
  mesha: 0, mesh: 0, aries: 0, mesham: 0,
  vrishabha: 1, vrishabh: 1, vrushabh: 1, taurus: 1, rishabam: 1,
  mithuna: 2, mithun: 2, gemini: 2, mithunam: 2,
  karka: 3, kark: 3, karkataka: 3, cancer: 3, kadagam: 3,
  simha: 4, singh: 4, simh: 4, leo: 4, simham: 4,
  kanya: 5, virgo: 5, kanni: 5,
  tula: 6, tulaa: 6, libra: 6, thulam: 6,
  vrishchika: 7, vrishchik: 7, vrischika: 7, scorpio: 7, viruchigam: 7,
  dhanu: 8, dhanus: 8, sagittarius: 8, dhanush: 8,
  makara: 9, makar: 9, capricorn: 9, makaram: 9,
  kumbha: 10, kumbh: 10, aquarius: 10, kumbham: 10,
  meena: 11, meen: 11, pisces: 11, meenam: 11,
};

export function nakshatraIndex(v) {
  const n = norm(v);
  if (!n) return null;
  if (n in NAK_ALIASES) return NAK_ALIASES[n];
  return null;
}

/** Accepts "Mesh (Aries)", "Mithun (Gemini)", "gemini", "Mesha" … */
export function rashiIndex(v) {
  const raw = String(v || "");
  for (const part of [raw, ...raw.split(/[()\/,-]/)]) {
    const n = norm(part);
    if (n && n in RASHI_ALIASES) return RASHI_ALIASES[n];
  }
  return null;
}

/* ------------------------------ tables ------------------------------ */
// 1. Varna (by rashi): 3 Brahmin, 2 Kshatriya, 1 Vaishya, 0 Shudra
const VARNA = [2, 1, 0, 3, 2, 1, 0, 3, 2, 1, 0, 3];
const VARNA_NAMES = ["Shudra", "Vaishya", "Kshatriya", "Brahmin"];

// 2. Vashya (by rashi): 0 Chatushpada, 1 Manava, 2 Jalachara, 3 Vanachara, 4 Keeta
const VASHYA = [0, 0, 1, 2, 3, 1, 1, 4, 1, 0, 1, 2];
const VASHYA_PTS = [ // [groom][bride]
  [2, 1, 1, 0.5, 1],
  [1, 2, 0.5, 0, 1],
  [1, 0.5, 2, 1, 1],
  [0.5, 0, 1, 2, 0],
  [1, 1, 1, 0, 2],
];

// 4. Yoni (by nakshatra)
const YONI_NAMES = ["Horse", "Elephant", "Sheep", "Serpent", "Dog", "Cat", "Rat", "Cow", "Buffalo", "Tiger", "Deer", "Monkey", "Mongoose", "Lion"];
const YONI = [0, 1, 2, 3, 3, 4, 5, 2, 5, 6, 6, 7, 8, 9, 8, 9, 10, 10, 4, 11, 12, 11, 13, 0, 13, 7, 1];
const YONI_PTS = [
  [4, 2, 2, 3, 2, 2, 2, 1, 0, 1, 3, 3, 2, 1],
  [2, 4, 3, 3, 2, 2, 2, 2, 3, 1, 2, 3, 2, 0],
  [2, 3, 4, 2, 1, 2, 1, 3, 3, 1, 2, 0, 3, 1],
  [3, 3, 2, 4, 2, 1, 1, 1, 1, 2, 2, 2, 0, 2],
  [2, 2, 1, 2, 4, 2, 1, 2, 2, 1, 0, 2, 1, 1],
  [2, 2, 2, 1, 2, 4, 0, 2, 2, 1, 3, 3, 2, 1],
  [2, 2, 1, 1, 1, 0, 4, 2, 2, 2, 2, 2, 1, 2],
  [1, 2, 3, 1, 2, 2, 2, 4, 3, 0, 3, 2, 2, 1],
  [0, 3, 3, 1, 2, 2, 2, 3, 4, 1, 2, 2, 2, 1],
  [1, 1, 1, 2, 1, 1, 2, 0, 1, 4, 1, 1, 2, 1],
  [3, 2, 2, 2, 0, 3, 2, 3, 2, 1, 4, 2, 2, 1],
  [3, 3, 0, 2, 2, 3, 2, 2, 2, 1, 2, 4, 3, 2],
  [2, 2, 3, 0, 1, 2, 1, 2, 2, 2, 2, 3, 4, 2],
  [1, 0, 1, 2, 1, 1, 2, 1, 1, 1, 1, 2, 2, 4],
];

// 5. Graha maitri: rashi lords and natural friendships
const PLANETS = ["Sun", "Moon", "Mars", "Mercury", "Jupiter", "Venus", "Saturn"];
const LORD = [2, 5, 3, 1, 0, 3, 5, 2, 4, 6, 6, 4];
// REL[a][b]: how planet a regards planet b → 2 friend, 1 neutral, 0 enemy
const REL = [
  /* Sun     */ [2, 2, 2, 1, 2, 0, 0],
  /* Moon    */ [2, 2, 1, 2, 1, 1, 1],
  /* Mars    */ [2, 2, 2, 0, 2, 1, 1],
  /* Mercury */ [2, 0, 1, 2, 1, 2, 1],
  /* Jupiter */ [2, 2, 2, 0, 2, 0, 1],
  /* Venus   */ [0, 0, 1, 2, 1, 2, 2],
  /* Saturn  */ [0, 0, 0, 2, 1, 2, 2],
];
function maitriPoints(a, b) {
  if (a === b) return 5;
  const x = REL[a][b], y = REL[b][a];
  const pair = [x, y].sort().join("");
  return { "22": 5, "12": 4, "11": 3, "02": 1, "01": 0.5, "00": 0 }[pair];
}

// 6. Gana (by nakshatra): 0 Deva, 1 Manushya, 2 Rakshasa
const GANA = [0, 1, 2, 1, 0, 1, 0, 0, 2, 2, 1, 1, 0, 2, 0, 2, 0, 2, 2, 1, 1, 0, 2, 2, 1, 1, 0];
const GANA_NAMES = ["Deva", "Manushya", "Rakshasa"];
const GANA_PTS = [ // [groom][bride]
  [6, 6, 1],
  [5, 6, 0],
  [1, 0, 6],
];

// 8. Nadi (by nakshatra): 0 Aadi, 1 Madhya, 2 Antya
const NADI = [0, 1, 2, 2, 1, 0, 0, 1, 2, 2, 1, 0, 0, 1, 2, 2, 1, 0, 0, 1, 2, 2, 1, 0, 0, 1, 2];
const NADI_NAMES = ["Aadi", "Madhya", "Antya"];

/* ------------------------------ scoring ------------------------------ */
const taraOk = (from, to) => ![3, 5, 7].includes(((((to - from + 27) % 27) + 1) % 9) || 9);

/**
 * bride / groom: { star, rashi, manglik? }
 * Returns null when there isn't enough data, else
 *   { total, max, kootas: [{ key, name, got, max, note }], verdict, partial, manglik }
 */
export function gunaMilan(bride, groom) {
  const bn = nakshatraIndex(bride?.star), gn = nakshatraIndex(groom?.star);
  const br = rashiIndex(bride?.rashi), gr = rashiIndex(groom?.rashi);
  if (bn === null || gn === null) return null; // stars are the minimum we need

  const kootas = [];
  const add = (key, name, max, got, note) => kootas.push({ key, name, max, got, note });
  const haveRashi = br !== null && gr !== null;

  if (haveRashi) {
    add("varna", "Varna", 1, VARNA[gr] >= VARNA[br] ? 1 : 0, `${VARNA_NAMES[gr]} & ${VARNA_NAMES[br]} — work & ego compatibility`);
    add("vashya", "Vashya", 2, VASHYA_PTS[VASHYA[gr]][VASHYA[br]], "Mutual attraction & influence");
  }
  const tara = (taraOk(bn, gn) ? 1.5 : 0) + (taraOk(gn, bn) ? 1.5 : 0);
  add("tara", "Tara", 3, tara, "Destiny & well-being");
  add("yoni", "Yoni", 4, YONI_PTS[YONI[gn]][YONI[bn]], `${YONI_NAMES[YONI[gn]]} & ${YONI_NAMES[YONI[bn]]} — intimacy & temperament`);
  if (haveRashi) {
    add("maitri", "Graha Maitri", 5, maitriPoints(LORD[gr], LORD[br]), `${PLANETS[LORD[gr]]} & ${PLANETS[LORD[br]]} — friendship & outlook`);
  }
  add("gana", "Gana", 6, GANA_PTS[GANA[gn]][GANA[bn]], `${GANA_NAMES[GANA[gn]]} & ${GANA_NAMES[GANA[bn]]} — nature & behaviour`);
  if (haveRashi) {
    const d = ((gr - br + 12) % 12) + 1; // counted from bride's rashi to groom's
    const bad = [2, 12, 5, 9, 6, 8].includes(d) || [2, 12, 5, 9, 6, 8].includes(((br - gr + 12) % 12) + 1);
    add("bhakoot", "Bhakoot", 7, bad ? 0 : 7, bad ? "Rashi positions are not favourable (Bhakoot dosha)" : "Family welfare & prosperity");
  }
  const sameNadi = NADI[gn] === NADI[bn];
  add("nadi", "Nadi", 8, sameNadi ? 0 : 8, sameNadi ? `Both ${NADI_NAMES[NADI[gn]]} nadi (Nadi dosha)` : "Health & progeny");

  const total = kootas.reduce((n, k) => n + k.got, 0);
  const max = kootas.reduce((n, k) => n + k.max, 0);
  const pct = total / max;
  const verdict = pct >= 0.89 ? "Excellent" : pct >= 0.69 ? "Very good" : pct >= 0.5 ? "Good" : "Below recommended";

  const m = (v) => {
    const s = String(v ?? "").toLowerCase();
    if (!s || s.includes("doesn") || s.includes("not sure") || s.includes("don't")) return null;
    return s.startsWith("y") || s === "true" || s.includes("partial") ? true : s.startsWith("n") || s === "false" ? false : null;
  };
  const bm = m(bride?.manglik), gm = m(groom?.manglik);
  const manglik = bm === null || gm === null ? null : bm === gm ? "match" : "mismatch";

  return {
    total: Math.round(total * 2) / 2,
    max,
    partial: !haveRashi,
    verdict,
    kootas,
    manglik,
    doshas: kootas.filter((k) => (k.key === "nadi" || k.key === "bhakoot") && k.got === 0).map((k) => k.name),
  };
}
