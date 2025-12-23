const feetInToCm = (label) => {
    if (!label) return null;
    const m = String(label).match(/^\s*(\d+)\s*ft\.?\s*(?:(\d+)\s*(?:in?\.?)?)?\s*$/i);
    if (!m) return null;
    const feet = Number(m[1] || 0);
    const inch = Number(m[2] || 0);
    return Math.round((feet * 12 + inch) * 2.54);
};

const tests = [
    "5 ft 10 in",
    "5ft10",
    "5 ft",
    "5ft",
    " 5 ft 1 in ",
    "6ft . 2in", // This might fail because of the dot?
    "6ft. 2",
    "5ft 10in.",
];

tests.forEach(t => {
    console.log(`'${t}' => ${feetInToCm(t)} cm`);
});
