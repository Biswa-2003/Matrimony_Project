import { POST } from './route';
import { NextResponse } from 'next/server';
import { query } from '@/lib/db';
import { getUserIdFromCookie } from '@/lib/auth';

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

jest.mock('@/lib/auth', () => ({
    getUserIdFromCookie: jest.fn(),
}));

describe('POST /api/profile/email', () => {
    beforeEach(() => {
        jest.clearAllMocks();
    });

    it('returns 400 if email is missing', async () => {
        const req = new Request('http://localhost/api/profile/email', {
            method: 'POST',
            body: JSON.stringify({}),
        });

        const res = await POST(req);
        expect(res.status).toBe(400);
        const data = await res.json();
        expect(data.error).toContain('Email is required');
    });

    it('returns 400 if email is too long', async () => {
        const longEmail = 'a'.repeat(256) + '@test.com';
        const req = new Request('http://localhost/api/profile/email', {
            method: 'POST',
            body: JSON.stringify({ email: longEmail }),
        });

        const res = await POST(req);
        expect(res.status).toBe(400);
        const data = await res.json();
        expect(data.error).toContain('less than 255 characters');
    });

    it('returns 400 if email format is invalid', async () => {
        const req = new Request('http://localhost/api/profile/email', {
            method: 'POST',
            body: JSON.stringify({ email: 'invalid-email' }),
        });

        const res = await POST(req);
        expect(res.status).toBe(400);
        const data = await res.json();
        expect(data.error).toBe('Invalid email address.');
    });

    it('returns 401 if not authenticated', async () => {
        getUserIdFromCookie.mockResolvedValue(null);

        const req = new Request('http://localhost/api/profile/email', {
            method: 'POST',
            body: JSON.stringify({ email: 'valid@example.com' }),
        });

        const res = await POST(req);
        expect(res.status).toBe(401);
        const data = await res.json();
        expect(data.error).toBe('Not authenticated.');
    });

    it('updates email successfully', async () => {
        getUserIdFromCookie.mockResolvedValue('user-123');
        query.mockResolvedValue({});

        const req = new Request('http://localhost/api/profile/email', {
            method: 'POST',
            headers: { 'content-type': 'application/json' },
            body: JSON.stringify({ email: 'newemail@example.com' }),
        });

        const res = await POST(req);
        expect(res.status).toBe(200);

        const data = await res.json();
        expect(data.message).toBe('Email updated successfully.');
        expect(query).toHaveBeenCalledWith(
            'UPDATE users SET email = $1, updated_at = NOW() WHERE id = $2',
            ['newemail@example.com', 'user-123']
        );
    });

    it('handles database errors gracefully', async () => {
        getUserIdFromCookie.mockResolvedValue('user-123');
        query.mockRejectedValue(new Error('DB error'));

        const req = new Request('http://localhost/api/profile/email', {
            method: 'POST',
            body: JSON.stringify({ email: 'test@example.com' }),
        });

        const res = await POST(req);
        expect(res.status).toBe(500);
        const data = await res.json();
        expect(data.error).toBe('Server error while updating email.');
    });

    it('accepts valid email with subdomain', async () => {
        getUserIdFromCookie.mockResolvedValue('user-123');
        query.mockResolvedValue({});

        const req = new Request('http://localhost/api/profile/email', {
            method: 'POST',
            body: JSON.stringify({ email: 'user@mail.subdomain.example.com' }),
        });

        const res = await POST(req);
        expect(res.status).toBe(200);
    });

    it('accepts valid email with special characters', async () => {
        getUserIdFromCookie.mockResolvedValue('user-123');
        query.mockResolvedValue({});

        const req = new Request('http://localhost/api/profile/email', {
            method: 'POST',
            body: JSON.stringify({ email: 'user.name+tag@example.co.uk' }),
        });

        const res = await POST(req);
        expect(res.status).toBe(200);
    });
});
