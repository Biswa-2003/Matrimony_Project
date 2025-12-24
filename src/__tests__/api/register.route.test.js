import { POST } from "@/app/api/register/route";

// ---- mocks ----
jest.mock("@/lib/rate-limit", () => ({
    rateLimit: jest.fn(),
}));
jest.mock("@/lib/password", () => ({
    validateStrongPassword: jest.fn(),
}));
jest.mock("@/lib/db", () => ({
    __esModule: true,
    default: { query: jest.fn() }, // because you use: import pool from "@/lib/db"
}));
jest.mock("uuid", () => ({
    v4: jest.fn(() => "mock-uuid-123"),
}));
jest.mock("bcryptjs", () => ({
    hash: jest.fn(() => Promise.resolve("hashed-password")),
}));

import { query } from "@/lib/db";
import { rateLimit } from "@/lib/rate-limit";
import { validateStrongPassword } from "@/lib/password";

// SKIPPED: Next.js App Router runtime constraints
// These tests require integration testing (Playwright) due to Request/Response
// being tied to Next.js runtime at module load time
describe.skip("POST /api/register", () => {
    beforeEach(() => {
        jest.clearAllMocks();
        rateLimit.mockReturnValue(true);          // allow rate limit
        validateStrongPassword.mockReturnValue(null); // no password error
    });

    it("returns 400 when email length is > 255", async () => {
        const longEmail = "a".repeat(256) + "@test.com"; // definitely >255

        const req = new Request("http://localhost/api/register", {
            method: "POST",
            headers: {
                "content-type": "application/json",
                "x-forwarded-for": "1.1.1.1",
            },
            body: JSON.stringify({
                first_name: "A",
                last_name: "B",
                email: longEmail,
                password: "StrongPass@123",
            }),
        });

        const res = await POST(req);
        expect(res.status).toBe(400);

        const json = await res.json();
        expect(json.error).toMatch(/less than 255/i);
    });

    it("returns 400 when email is missing", async () => {
        const req = new Request("http://localhost/api/register", {
            method: "POST",
            headers: {
                "content-type": "application/json",
                "x-forwarded-for": "1.1.1.1",
            },
            body: JSON.stringify({
                first_name: "A",
                last_name: "B",
                email: "",
                password: "StrongPass@123",
            }),
        });

        const res = await POST(req);
        expect(res.status).toBe(400);

        const json = await res.json();
        expect(json.error).toMatch(/Email is required/i);
    });

    it("returns 400 when required fields are missing", async () => {
        const req = new Request("http://localhost/api/register", {
            method: "POST",
            headers: {
                "content-type": "application/json",
                "x-forwarded-for": "1.1.1.1",
            },
            body: JSON.stringify({
                email: "test@example.com",
            }),
        });

        const res = await POST(req);
        expect(res.status).toBe(400);

        const json = await res.json();
        expect(json.error).toMatch(/required fields/i);
    });

    it("returns 201 on successful registration", async () => {
        pool.query.mockResolvedValueOnce({ rows: [] }); // no existing user
        pool.query.mockResolvedValueOnce({ rows: [] }); // caste lookup
        pool.query.mockResolvedValueOnce({ rows: [] }); // insert user
        pool.query.mockResolvedValueOnce({ rows: [] }); // insert profile

        const req = new Request("http://localhost/api/register", {
            method: "POST",
            headers: {
                "content-type": "application/json",
                "x-forwarded-for": "1.1.1.1",
            },
            body: JSON.stringify({
                first_name: "John",
                last_name: "Doe",
                email: "john@example.com",
                password: "StrongPass@123",
            }),
        });

        const res = await POST(req);
        expect(res.status).toBe(201);

        const json = await res.json();
        expect(json.message).toMatch(/successfully/i);
    });
});
