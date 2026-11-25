import { check, rateLimit, resetLimit, clientIp, limitOr429 } from './rate-limit';

jest.mock('next/server', () => ({
  NextResponse: {
    json: jest.fn((data, init) => ({ status: init?.status || 200, headers: init?.headers || {}, json: async () => data })),
  },
}));

describe('rate-limit', () => {
  it('allows up to the limit, then blocks with a retry time', () => {
    const key = `t:${Math.random()}`;
    expect(check(key, 2, 60_000).ok).toBe(true);
    expect(check(key, 2, 60_000).ok).toBe(true);
    const r = check(key, 2, 60_000);
    expect(r.ok).toBe(false);
    expect(r.retryAfter).toBeGreaterThan(0);
    expect(r.retryAfter).toBeLessThanOrEqual(60);
  });

  it('keeps separate buckets per key (login must not eat into register)', () => {
    const ip = `ip-${Math.random()}`;
    for (let i = 0; i < 3; i++) rateLimit(`login:${ip}`, 3, 60_000);
    expect(rateLimit(`login:${ip}`, 3, 60_000)).toBe(false);
    expect(rateLimit(`register:${ip}`, 3, 60_000)).toBe(true);
  });

  it('frees the slot once the window has passed', () => {
    jest.useFakeTimers();
    const key = `w:${Math.random()}`;
    expect(rateLimit(key, 1, 1000)).toBe(true);
    expect(rateLimit(key, 1, 1000)).toBe(false);
    jest.advanceTimersByTime(1001);
    expect(rateLimit(key, 1, 1000)).toBe(true);
    jest.useRealTimers();
  });

  it('resetLimit clears a bucket', () => {
    const key = `r:${Math.random()}`;
    rateLimit(key, 1, 60_000);
    expect(rateLimit(key, 1, 60_000)).toBe(false);
    resetLimit(key);
    expect(rateLimit(key, 1, 60_000)).toBe(true);
  });

  it('limitOr429 returns null when allowed and a 429 with Retry-After when not', async () => {
    const key = `h:${Math.random()}`;
    expect(limitOr429(key, 1, 60_000)).toBeNull();
    const res = limitOr429(key, 1, 60_000, 'custom message');
    expect(res.status).toBe(429);
    expect(res.headers['Retry-After']).toBeDefined();
    expect((await res.json()).error).toBe('custom message');
  });

  it('clientIp takes the first forwarded address', () => {
    const req = new Request('http://x', { headers: { 'x-forwarded-for': '203.0.113.9, 10.0.0.1' } });
    expect(clientIp(req)).toBe('203.0.113.9');
    expect(clientIp(new Request('http://x', { headers: { 'x-real-ip': '198.51.100.2' } }))).toBe('198.51.100.2');
    expect(clientIp(new Request('http://x'))).toBe('local');
    expect(clientIp(undefined)).toBe('local');
  });
});
