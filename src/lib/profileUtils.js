/**
 * Profile utility functions
 * These pure functions help with data transformation and validation
 */

/* ----------------------------- tiny utilities ----------------------------- */
export const num = (v) => {
    if (v === "" || v === undefined || v === null) return null;
    const s = String(v).trim().toLowerCase();
    if (s === "nan" || s === "null" || s === "undefined") return null;

    // Remove currency symbols, words, commas, and underscores
    const cleaned = s
        .replace(/rs\.?|rupees?|\$|€|£|₹/gi, '') // Remove currency
        .replace(/[,_\s]/g, '') // Remove commas, underscores, spaces
        .replace(/[^\d.-]/g, ''); // Keep only digits, dot, minus

    if (cleaned === "" || cleaned === "-" || cleaned === "." || cleaned === "-.") return null;
    const n = Number(cleaned);
    return Number.isFinite(n) ? n : null;
};

export const safeBigInt = (v) => {
    const n = num(v);
    if (n === null) return null;
    const i = Math.trunc(n);
    return Number.isFinite(i) ? i : null;
};

export function toCm(v) {
    if (v == null || v === "") return null;
    const s = String(v).trim();
    if (/^\d+(\.\d+)?$/.test(s)) return Number(s);

    // Pattern 1: 5 ft 10 in
    let m = s.match(/^\s{0,20}(\d{1,2})\s{0,20}ft\.?\s{0,20}(?:(\d{1,2})\s{0,20}(?:in?\.?)?)?\s{0,20}$/i);
    if (!m) {
        // Pattern 2: 5'10"
        m = s.match(/^\s{0,20}(\d{1,2})\s{0,20}'\s{0,20}(?:(\d{1,2})\s{0,20}"?\s{0,20})?$/);
    }

    if (!m) return null;
    const ft = Number(m[1] || 0);
    const inch = Number(m[2] || 0);
    return Math.round((ft * 12 + inch) * 2.54);
}

export const clean = (s) => (s !== undefined ? String(s).trim() : undefined);

export const asArray = (v) =>
    Array.isArray(v) ? v : v == null || v === "" ? [] : String(v).split(",").map((x) => x.trim()).filter(Boolean);

/* ---------------------- height code helpers ------------------------------- */
export const HEIGHT_CODES = [
    "4ft0in", "4ft1in", "4ft2in", "4ft3in", "4ft4in", "4ft5in", "4ft6in", "4ft7in", "4ft8in", "4ft9in", "4ft10in", "4ft11in",
    "5ft0in", "5ft1in", "5ft2in", "5ft3in", "5ft4in", "5ft5in", "5ft6in", "5ft7in", "5ft8in", "5ft9in", "5ft10in", "5ft11in",
    "6ft0in", "6ft1in", "6ft2in", "6ft3in", "6ft4in", "6ft5in", "6ft6in", "6ft7in", "6ft8in", "6ft9in", "6ft10in", "6ft11in",
    "7ft0in"
];

export function toHeightCode(v) {
    if (v == null || v === "") return null;
    let s = String(v).toLowerCase().trim();
    const cmMatch = s.match(/^(\d+(?:\.\d+)?)\s*cm$/i) || (/^\d+(\.\d+)?$/.test(s) ? [null, s] : null);
    if (cmMatch) return cmToCode(Number(cmMatch[1]));
    s = s.replace(/feet|foot/g, "ft").replace(/inches|inch/g, "in");
    s = s.replace(/['"]/g, "").replace(/\s+/g, "");
    if (/^\d+ft\d+$/.test(s)) s += "in";
    return HEIGHT_CODES.includes(s) ? s : null;
}

export function codeToCm(code) {
    if (!code) return null;
    const m = String(code).match(/^(\d+)ft(\d+)in$/i);
    if (!m) return null;
    const ft = Number(m[1]), inch = Number(m[2]);
    return Math.round((ft * 12 + inch) * 2.54);
}

export function cmToCode(cm) {
    if (cm == null) return null;
    const totalIn = Math.round(Number(cm) / 2.54);
    const ft = Math.floor(totalIn / 12);
    const inch = Math.max(0, totalIn - ft * 12);
    const code = `${ft}ft${inch}in`;
    if (HEIGHT_CODES.includes(code)) return code;
    const idx = HEIGHT_CODES.findIndex((c) => c === code);
    return idx >= 0 ? HEIGHT_CODES[idx] : HEIGHT_CODES[Math.min(HEIGHT_CODES.length - 1, Math.max(0, ft * 12 + inch - 48))];
}

/* ------------------------------ Income parsing ----------------------------- */
// Parse incomes like "Rs. 10 - 15 Lakh", "12 L", "1 Crore", "1200000"
export function parseIncomeRange(v) {
    if (!v) return { min: null, max: null };
    const s = String(v).toLowerCase();
    const nums = (s.match(/\d+(?:\.\d+)?/g) || []).map(Number);
    if (!nums.length) return { min: null, max: null };
    const unit = s.includes("crore") ? 10_000_000 : (s.includes("lakh") || s.includes("lac")) ? 100_000 : 1;
    const min = Math.round(nums[0] * unit);
    const max = nums[1] != null ? Math.round(nums[1] * unit) : null;
    return { min, max };
}

export const parseIntOrNull = (v) => {
    const s = String(v ?? "").trim();
    return /^\d+$/.test(s) ? Number(s) : null;
};

export const firstNonEmpty = (...vals) => {
    for (const v of vals) {
        const s = v == null ? "" : String(v).trim();
        if (s !== "") return s;
    }
    return null;
};
