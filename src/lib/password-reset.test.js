import jwt from 'jsonwebtoken';
import { signResetToken, verifyResetToken, maskEmail } from './password-reset';
import { query } from '@/lib/db';

jest.mock('@/lib/db', () => ({ query: jest.fn() }));

const SECRET = 'unit-test-secret';
const member = { id: 'u-1', email: 'priya@example.com', first_name: 'Priya', password_hash: '$2a$10$hash-v1' };

describe('password-reset tokens', () => {
  const env = process.env;
  beforeEach(() => {
    process.env = { ...env, JWT_SECRET: SECRET };
    query.mockReset();
    query.mockResolvedValue({ rows: [member] });
  });
  afterEach(() => { process.env = env; });

  it('accepts a fresh token for the right member', async () => {
    const v = await verifyResetToken(signResetToken(member));
    expect(v.user).toEqual(member);
  });

  it('is single-use: once the password hash changes, the old link stops working', async () => {
    const token = signResetToken(member);
    query.mockResolvedValue({ rows: [{ ...member, password_hash: '$2a$10$hash-v2' }] });
    expect(await verifyResetToken(token)).toEqual({ error: 'invalid' });
  });

  it('rejects a normal login token used as a reset token', async () => {
    const loginToken = jwt.sign({ id: member.id, email: member.email }, SECRET, { expiresIn: '2h' });
    expect(await verifyResetToken(loginToken)).toEqual({ error: 'invalid' });
  });

  it('cannot be used as a login token (different signing key)', () => {
    const token = signResetToken(member);
    expect(() => jwt.verify(token, SECRET)).toThrow();
  });

  it('rejects a forged token with purpose set but the wrong key', async () => {
    const forged = jwt.sign({ sub: member.id, purpose: 'pwreset' }, SECRET);
    expect(await verifyResetToken(forged)).toEqual({ error: 'invalid' });
  });

  it('reports expiry separately so the page can say "expired"', async () => {
    const expired = jwt.sign(
      { sub: member.id, purpose: 'pwreset', exp: Math.floor(Date.now() / 1000) - 5 },
      `${SECRET}::pwreset::${member.password_hash}`
    );
    expect(await verifyResetToken(expired)).toEqual({ error: 'expired' });
  });

  it('handles junk input without hitting the database', async () => {
    expect(await verifyResetToken(undefined)).toEqual({ error: 'invalid' });
    expect(await verifyResetToken('not-a-jwt')).toEqual({ error: 'invalid' });
    expect(await verifyResetToken('x'.repeat(5000))).toEqual({ error: 'invalid' });
    expect(query).not.toHaveBeenCalled();
  });

  it('rejects tokens for deleted accounts', async () => {
    const token = signResetToken(member);
    query.mockResolvedValue({ rows: [] });
    expect(await verifyResetToken(token)).toEqual({ error: 'invalid' });
  });

  it('masks emails for display', () => {
    expect(maskEmail('priya@example.com')).toBe('pr•••@example.com');
    expect(maskEmail('ab@x.in')).toBe('ab•@x.in');
    expect(maskEmail('bad')).toBe('');
  });
});
