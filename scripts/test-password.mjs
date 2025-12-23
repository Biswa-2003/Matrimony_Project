
import { validateStrongPassword } from '../src/lib/password.js';

console.log("🔥 Starting Password Validation Unit Test...\n");

const tests = [
    { input: "weak", expected: "Password must be at least 10 characters" },
    { input: "nouppercase123!", expected: "Add at least 1 uppercase letter" },
    { input: "NOLOWERCASE123!", expected: "Add at least 1 lowercase letter" },
    { input: "NoNumberHere!", expected: "Add at least 1 number" },
    { input: "NoSpecialChar1", expected: "Add at least 1 special character" },
    { input: "StrongPass1!", expected: null }, // Valid
    { input: "AnotherStrong!2", expected: null } // Valid
];

let passed = 0;
let failed = 0;

tests.forEach(({ input, expected }, index) => {
    const result = validateStrongPassword(input);
    if (result === expected) {
        passed++;
    } else {
        console.error(`❌ Test ${index + 1} Failed: Input '${input}'`);
        console.error(`   Expected: '${expected}'`);
        console.error(`   Got:      '${result}'`);
        failed++;
    }
});

console.log(`\n🎉 Test Summary: ${passed} Passed, ${failed} Failed`);

if (failed > 0) process.exit(1);
