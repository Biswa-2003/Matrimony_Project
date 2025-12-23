// src/lib/profileCompletion.js
const PATHS = [
  "photo",
  "first_name",
  "gender",
  "basic.dob",
  "basic.height",
  "basic.tongue",
  "religionInfo.religion",
  "religionInfo.caste",
  "location.city",
  "location.state",
  "location.country",
  "professional.education",
  "professional.job",
  "professional.income",
  "aboutMyself", // >= 30 chars
];

const get = (obj, path) => path.split(".").reduce((o, k) => (o ? o[k] : undefined), obj);

const isFilled = (path, profile) => {
  const v = get(profile, path);
  if (path === "photo") {
    // treat as filled if not default
    return !!v && typeof v === "string" && !v.includes("default");
  }
  if (path === "aboutMyself") {
    return !!v && String(v).trim().length >= 30;
  }
  if (v === null || v === undefined) return false;
  if (typeof v === "string") return v.trim() !== "";
  if (typeof v === "number") return !Number.isNaN(v);
  if (Array.isArray(v)) return v.length > 0;
  if (typeof v === "object") return Object.keys(v).length > 0;
  return !!v;
};

export function computeProfileCompletion(profile = {}) {
  const checks = PATHS.map((p) => [p, isFilled(p, profile)]);
  const completed = checks.filter(([, ok]) => ok).length;
  const total = checks.length || 1;
  const percent = Math.round((completed / total) * 100);
  const missing = checks.filter(([, ok]) => !ok).map(([p]) => p);
  return { percent, completed, total, missing };
}

// also export default so either import style works
export default computeProfileCompletion;
