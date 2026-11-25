import { POST } from './route';
import { query } from '@/lib/db';
import { limitOr429, rateLimit } from '@/lib/rate-limit';

jest.mock('next/server', () => ({
    NextResponse: {
        json: jest.fn((data, init) => ({
            status: init?.status || 200,
            json: async () => data,
        })),
    },
}));

jest.mock('@/lib/db', () => ({
    query: jest.fn(),
}));

jest.mock('jsonwebtoken', () => ({
    sign: jest.fn(() => 'mock-token-123'),
}));

const mockSendMail = jest.fn().mockResolvedValue({});
jest.mock('nodemailer', () => ({
    createTransport: jest.fn(() => ({ sendMail: mockSendMail })),
}));

jest.mock('@/lib/rate-limit', () => ({
    clientIp: () => '1.2.3.4',
    limitOr429: jest.fn(() => null),
    rateLimit: jest.fn(() => true),
}));

const GENERIC = /If an account exists for this email/;
const req = (body) => new Request('http://localhost/api/forgot', { method: 'POST', body: JSON.stringify(body) });
const user = (over = {}) => ({ id: '123', email: 'user@example.com', first_name: 'John', password_hash: 'h', ...over });

describe('POST /api/forgot', () => {
    const originalEnv = process.env;

    beforeEach(() => {
        jest.clearAllMocks();
        limitOr429.mockReturnValue(null);
        rateLimit.mockReturnValue(true);
        process.env = {
            ...originalEnv,
            JWT_SECRET: 'test-secret',
            NEXT_PUBLIC_BASE_URL: 'http://localhost:3000',
            EMAIL_USER: 'test@gmail.com',
            EMAIL_PASS: 'test-pass',
        };
    });

    afterEach(() => {
        process.env = originalEnv;
    });

    it('returns 400 for a missing or malformed email', async () => {
        expect((await POST(req({}))).status).toBe(400);
        expect((await POST(req({ email: 'not-an-email' }))).status).toBe(400);
        expect(query).not.toHaveBeenCalled();
    });

    it('returns the limiter response when the IP is over its limit', async () => {
        limitOr429.mockReturnValue({ status: 429, json: async () => ({ error: 'slow down' }) });
        const res = await POST(req({ email: 'user@example.com' }));
        expect(res.status).toBe(429);
        expect(query).not.toHaveBeenCalled();
    });

    it('does NOT reveal whether an account exists (unknown email → same 200 reply, no email)', async () => {
        query.mockResolvedValue({ rows: [] });
        const res = await POST(req({ email: 'notfound@example.com' }));
        expect(res.status).toBe(200);
        expect((await res.json()).message).toMatch(GENERIC);
        expect(mockSendMail).not.toHaveBeenCalled();
    });

    it('quietly stops after 3 links per address (still the generic reply, no email)', async () => {
        rateLimit.mockReturnValue(false);
        const res = await POST(req({ email: 'user@example.com' }));
        expect(res.status).toBe(200);
        expect((await res.json()).message).toMatch(GENERIC);
        expect(query).not.toHaveBeenCalled();
        expect(mockSendMail).not.toHaveBeenCalled();
    });

    it('sends a single-use reset link to a known member (email normalised)', async () => {
        query.mockResolvedValue({ rows: [user()] });
        const res = await POST(req({ email: '  User@Example.com ' }));
        expect(res.status).toBe(200);
        expect((await res.json()).message).toMatch(GENERIC);
        expect(query).toHaveBeenCalledWith(expect.any(String), ['user@example.com']);
        expect(mockSendMail).toHaveBeenCalledWith(expect.objectContaining({
            to: 'user@example.com',
            html: expect.stringContaining('/matrimoney/reset-password?token=mock-token-123'),
        }));
    });

    it('escapes the member name inside the email HTML', async () => {
        query.mockResolvedValue({ rows: [user({ first_name: '<script>x</script>' })] });
        await POST(req({ email: 'user@example.com' }));
        const { html } = mockSendMail.mock.calls[0][0];
        expect(html).not.toContain('<script>');
        expect(html).toContain('&lt;script&gt;');
    });

    it('greets "there" when the member has no first name', async () => {
        query.mockResolvedValue({ rows: [user({ first_name: null })] });
        await POST(req({ email: 'user@example.com' }));
        expect(mockSendMail.mock.calls[0][0].html).toContain('Namaste there');
    });

    it('falls back to the request origin when NEXT_PUBLIC_BASE_URL is missing', async () => {
        delete process.env.NEXT_PUBLIC_BASE_URL;
        query.mockResolvedValue({ rows: [user()] });
        await POST(req({ email: 'user@example.com' }));
        expect(mockSendMail.mock.calls[0][0].html).toContain('http://localhost/matrimoney/reset-password?token=');
    });

    it('returns 503 when JWT_SECRET is missing', async () => {
        delete process.env.JWT_SECRET;
        const res = await POST(req({ email: 'user@example.com' }));
        expect(res.status).toBe(503);
    });

    it('returns 503 outside development when email is not configured', async () => {
        delete process.env.EMAIL_USER;
        query.mockResolvedValue({ rows: [user()] });
        const res = await POST(req({ email: 'user@example.com' }));
        expect(res.status).toBe(503);
        expect(mockSendMail).not.toHaveBeenCalled();
    });

    it('returns 502 when the mail server fails (outside development)', async () => {
        query.mockResolvedValue({ rows: [user()] });
        mockSendMail.mockRejectedValueOnce(new Error('smtp down'));
        const res = await POST(req({ email: 'user@example.com' }));
        expect(res.status).toBe(502);
    });
});
