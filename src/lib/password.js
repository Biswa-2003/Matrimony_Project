
// src/lib/password.js

// Strong password rules (practical + interview-ready)
export function validateStrongPassword(password) {
    if (typeof password !== "string") return "Password is required";

    const pw = password.trim();

    if (pw.length < 10) return "Password must be at least 10 characters";
    if (pw.length > 72) return "Password must be at most 72 characters"; // bcrypt limit safety
    if (/\s/.test(pw)) return "Password must not contain spaces";
    if (!/[a-z]/.test(pw)) return "Add at least 1 lowercase letter";
    if (!/[A-Z]/.test(pw)) return "Add at least 1 uppercase letter";
    if (!/[0-9]/.test(pw)) return "Add at least 1 number";
    if (!/[^A-Za-z0-9]/.test(pw)) return "Add at least 1 special character";

    // Optional: block common weak passwords
    const weak = new Set(["password", "password123", "qwerty", "admin123", "12345678"]);
    if (weak.has(pw.toLowerCase())) return "Password is too common. Choose a stronger one";

    return null; // valid
}
