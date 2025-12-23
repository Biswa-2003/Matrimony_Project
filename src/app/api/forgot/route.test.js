import { POST } from './route';
import { NextResponse } from 'next/server';
import { query } from '@/lib/db';
import jwt from 'jsonwebtoken';
import nodemailer from 'nodemailer';

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

jest.mock('nodemailer', () => ({
    createTransport: jest.fn(() => ({
        sendMail: jest.fn().mockResolvedValue({}),
    })),
}));

describe('POST /api/forgot', () => {
    const originalEnv = process.env;

    beforeEach(() => {
        jest.clearAllMocks();
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

    it('returns 400 if email is missing', async () => {
        const req = new Request('http://localhost/api/forgot', {
            method: 'POST',
            body: JSON.stringify({}),
        });

        const res = await POST(req);
        expect(res.status).toBe(400);
        const data = await res.json();
        expect(data.error).toBe('Email is required');
    });

    it('returns 500 if JWT_SECRET is missing', async () => {
        delete process.env.JWT_SECRET;

        const req = new Request('http://localhost/api/forgot', {
            method: 'POST',
            body: JSON.stringify({ email: 'test@example.com' }),
        });

        const res = await POST(req);
        expect(res.status).toBe(500);
        const data = await res.json();
        expect(data.error).toBe('Server configuration error');
    });

    it('returns 500 if BASE_URL is missing', async () => {
        delete process.env.NEXT_PUBLIC_BASE_URL;

        const req = new Request('http://localhost/api/forgot', {
            method: 'POST',
            body: JSON.stringify({ email: 'test@example.com' }),
        });

        const res = await POST(req);
        expect(res.status).toBe(500);
    });

    it('returns 500 if EMAIL credentials are missing', async () => {
        delete process.env.EMAIL_USER;

        const req = new Request('http://localhost/api/forgot', {
            method: 'POST',
            body: JSON.stringify({ email: 'test@example.com' }),
        });

        const res = await POST(req);
        expect(res.status).toBe(500);
        const data = await res.json();
        expect(data.error).toBe('Email service unavailable');
    });

    it('returns 404 if user not found', async () => {
        query.mockResolvedValue({ rows: [] });

        const req = new Request('http://localhost/api/forgot', {
            method: 'POST',
            body: JSON.stringify({ email: 'notfound@example.com' }),
        });

        const res = await POST(req);
        expect(res.status).toBe(404);
        const data = await res.json();
        expect(data.error).toBe('User not found');
    });

    it('sends reset email successfully', async () => {
        query.mockResolvedValue({
            rows: [
                {
                    id: '123',
                    email: 'user@example.com',
                    first_name: 'John',
                    last_name: 'Doe',
                },
            ],
        });

        const req = new Request('http://localhost/api/forgot', {
            method: 'POST',
            body: JSON.stringify({ email: 'User@Example.com' }), // Mixed case
        });

        const res = await POST(req);
        expect(res.status).toBe(200);

        const data = await res.json();
        expect(data.message).toMatch(/Reset link sent/i);

        // Verify email was normalized
        expect(query).toHaveBeenCalledWith(
            expect.any(String),
            ['user@example.com'] // lowercase
        );

        // Verify transporter was called
        expect(nodemailer.createTransport).toHaveBeenCalledWith(
            expect.objectContaining({
                secure: true,
                requireTLS: true,
            })
        );

        // Verify no 'secured' option (invalid)
        expect(nodemailer.createTransport).toHaveBeenCalledWith(
            expect.not.objectContaining({
                secured: expect.anything(),
            })
        );
    });

    it('handles user with no name (uses "there" fallback)', async () => {
        query.mockResolvedValue({
            rows: [
                {
                    id: '123',
                    email: 'user@example.com',
                    first_name: null,
                    last_name: null,
                },
            ],
        });

        const sendMailMock = jest.fn().mockResolvedValue({});
        nodemailer.createTransport.mockReturnValue({ sendMail: sendMailMock });

        const req = new Request('http://localhost/api/forgot', {
            method: 'POST',
            body: JSON.stringify({ email: 'user@example.com' }),
        });

        await POST(req);

        // Verify email contains "Hello there"
        expect(sendMailMock).toHaveBeenCalledWith(
            expect.objectContaining({
                html: expect.stringContaining('Hello there'),
            })
        );
    });

    it('handles user with only first_name', async () => {
        query.mockResolvedValue({
            rows: [
                {
                    id: '123',
                    email: 'user@example.com',
                    first_name: 'Jane',
                    last_name: null,
                },
            ],
        });

        const sendMailMock = jest.fn().mockResolvedValue({});
        nodemailer.createTransport.mockReturnValue({ sendMail: sendMailMock });

        const req = new Request('http://localhost/api/forgot', {
            method: 'POST',
            body: JSON.stringify({ email: 'user@example.com' }),
        });

        await POST(req);

        expect(sendMailMock).toHaveBeenCalledWith(
            expect.objectContaining({
                html: expect.stringContaining('Hello Jane'),
            })
        );
    });
});
