const toCm = (v) => {
    if (v == null || v === "") return null;
    const s = String(v).trim();
    if (/^\d+(\.\d+)?$/.test(s)) return Number(s);

    // Pattern 1: 5 ft 10 in
    let m = s.match(/^\s*(\d+)\s*ft\.?\s*(?:(\d+)\s*(?:in?\.?)?)?\s*$/i);
    if (!m) {
        // Pattern 2: 5'10"
        m = s.match(/^\s*(\d+)\s*'\s*(?:(\d+)\s*"?\s*)?$/);
    }

    if (!m) return null;
    const ft = Number(m[1] || 0);
    const inch = Number(m[2] || 0);
    return Math.round((ft * 12 + inch) * 2.54);
};

const tests = [
    "5 ft 10 in",
    "5ft10",
    "5 ft",
    "5'10\"",
    "5' 10",
    "6'",
    "170",
    "170.5",
];

tests.forEach(t => {
    console.log(`'${t}' => ${toCm(t)} cm`);
});
