'use client';

// Mirrors the server-side rules in src/lib/password.js
export const PASSWORD_RULES = [
  { test: (p) => p.length >= 10, label: '10+ characters' },
  { test: (p) => /[A-Z]/.test(p), label: 'Uppercase' },
  { test: (p) => /[a-z]/.test(p), label: 'Lowercase' },
  { test: (p) => /[0-9]/.test(p), label: 'Number' },
  { test: (p) => /[^A-Za-z0-9]/.test(p), label: 'Symbol' },
];

export const isStrongPassword = (p = '') => !/\s/.test(p) && PASSWORD_RULES.every((r) => r.test(p));

export default function PasswordChecklist({ password = '' }) {
  return (
    <div className="d-flex flex-wrap gap-2 mt-2" aria-live="polite">
      {PASSWORD_RULES.map((r) => {
        const ok = r.test(password);
        return (
          <span key={r.label} className={`badge rounded-pill ${ok ? 'badge-gold' : 'bg-light text-muted border'}`}>
            <i className={`bi ${ok ? 'bi-check2' : 'bi-dot'} me-1`} />
            {r.label}
          </span>
        );
      })}
    </div>
  );
}
