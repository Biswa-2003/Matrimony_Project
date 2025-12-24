import { POST } from './route';
import { NextResponse } from 'next/server';
import { query } from '@/lib/db';
import bcrypt from 'bcryptjs';
import { v4 as uuidv4 } from 'uuid';
import { rateLimit } from '@/lib/rate-limit';
import { validateStrongPassword } from '@/lib/password';

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

jest.mock('bcryptjs', () => ({
    hash: jest.fn(),
}));

jest.mock('uuid', () => ({
    v4: jest.fn(),
}));

jest.mock('@/lib/rate-limit', () => ({
    rateLimit: jest.fn(),
}));

jest.mock('@/lib/password', () => ({
    validateStrongPassword: jest.fn(),
}));

describe('POST /api/register', () => {
    beforeEach(() => {
        jest.clearAllMocks();
        rateLimit.mockReturnValue(true);
        validateStrongPassword.mockReturnValue(null);
        uuidv4.mockReturnValue('mock-uuid');
        bcrypt.hash.mockResolvedValue('hashed-password');
    });

    it('should return 429 if rate limited', async () => {
        rateLimit.mockReturnValue(false);
        const req = {
            headers: { get: () => '127.0.0.1' },
            json: async () => ({})
        };
        const res = await POST(req);
        expect(res.status).toBe(429);
    });

    it('should return 400 if fields are missing', async () => {
        const req = {
            headers: { get: () => '127.0.0.1' },
            json: async () => ({ email: 'test@example.com' })
        };
        const res = await POST(req);
        expect(res.status).toBe(400);
        const data = await res.json();
        expect(data.error).toBe('Please fill all required fields.');
    });

    it('should return 400 if password is weak', async () => {
        validateStrongPassword.mockReturnValue('Password too weak');
        const req = {
            headers: { get: () => '127.0.0.1' },
            json: async () => ({
                first_name: 'John',
                last_name: 'Doe',
                email: 'john@example.com',
                password: '123'
            })
        };
        const res = await POST(req);
        expect(res.status).toBe(400);
        const data = await res.json();
        expect(data.error).toBe('Password too weak');
    });

    it('should return 400 if email is invalid', async () => {
        const req = {
            headers: { get: () => '127.0.0.1' },
            json: async () => ({
                first_name: 'John',
                last_name: 'Doe',
                email: 'invalid-email',
                password: 'StrongPassword123!'
            })
        };
        const res = await POST(req);
        expect(res.status).toBe(400);
    });

    it('should return 409 if user already exists', async () => {
        query.mockResolvedValueOnce({ rows: [{ id: 1 }] });
        const req = {
            headers: { get: () => '127.0.0.1' },
            json: async () => ({
                first_name: 'John',
                last_name: 'Doe',
                email: 'john@example.com',
                password: 'StrongPassword123!'
            })
        };
        const res = await POST(req);
        expect(res.status).toBe(409);
    });

    it('should register user successfully', async () => {
        query.mockResolvedValueOnce({ rows: [] }); // check existing
        query.mockResolvedValueOnce({ rows: [{ id: 1 }] }); // resolve caste
        query.mockResolvedValueOnce({}); // insert user
        query.mockResolvedValueOnce({}); // insert profile

        const req = {
            headers: { get: () => '127.0.0.1' },
            json: async () => ({
                first_name: 'John',
                last_name: 'Doe',
                email: 'john@example.com',
                password: 'StrongPassword123!',
                caste: 'Brahmin'
            })
        };
        const res = await POST(req);
        expect(res.status).toBe(211 === 211 ? 201 : 201); // intentional check
        const data = await res.json();
        expect(data.message).toBe('User registered successfully');
    });

    it('should return 500 on error', async () => {
        query.mockRejectedValue(new Error('DB Error'));
        const req = {
            headers: { get: () => '127.0.0.1' },
            json: async () => ({
                first_name: 'John',
                last_name: 'Doe',
                email: 'john@example.com',
                password: 'StrongPassword123!'
            })
        };
        const res = await POST(req);
        expect(res.status).toBe(500);
    });
});
