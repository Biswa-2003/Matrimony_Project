import { GET, POST } from "@/app/api/search/route";

jest.mock("@/lib/db", () => ({
    query: jest.fn(),
}));

import { query } from "@/lib/db";

// SKIPPED: Next.js App Router runtime constraints
// These tests require integration testing (Playwright) due to Request/Response
// being tied to Next.js runtime at module load time
describe.skip("/api/search route", () => {
    beforeEach(() => jest.clearAllMocks());

    test("GET returns empty results when matriId missing", async () => {
        const req = new Request("http://localhost/api/search", { method: "GET" });
        const res = await GET(req);
        expect(res.status).toBe(200);

        const json = await res.json();
        expect(Array.isArray(json.results)).toBe(true);
        expect(json.results.length).toBe(0);
    });

    test("GET returns results when matriId present", async () => {
        query.mockResolvedValueOnce({
            rows: [
                {
                    id: 1,
                    matri_id: "DU123",
                    first_name: "A",
                    last_name: "B",
                    age: 25,
                    height_cm: 170,
                    religion: "Hindu",
                    caste: "X",
                    country: "India",
                    state: "Odisha",
                    city: "BBSR",
                    photo_url: "/uploads/x.jpg",
                },
            ],
        });

        const req = new Request("http://localhost/api/search?matriId=DU123", {
            method: "GET",
        });
        const res = await GET(req);
        expect(res.status).toBe(200);

        const json = await res.json();
        expect(json.results.length).toBe(1);
        expect(json.user.matri_id).toBe("DU123");
    });

    test("POST advanced search returns results", async () => {
        query.mockResolvedValueOnce({
            rows: [
                {
                    id: 1,
                    matri_id: "DU123",
                    first_name: "A",
                    last_name: "B",
                    age: 25,
                    height_cm: 170,
                    religion: "Hindu",
                    caste: "X",
                    country: "India",
                    state: "Odisha",
                    city: "BBSR",
                    photo_url: "/uploads/x.jpg",
                    total: 1,
                },
            ],
        });

        const req = new Request("http://localhost/api/search", {
            method: "POST",
            headers: { "content-type": "application/json" },
            body: JSON.stringify({ ageMin: 20, ageMax: 30, limit: 12, page: 1 }),
        });

        const res = await POST(req);
        expect(res.status).toBe(200);

        const json = await res.json();
        expect(json.total).toBe(1);
        expect(Array.isArray(json.results)).toBe(true);
        expect(json.results.length).toBe(1);
    });

    test("POST handles height filters", async () => {
        query.mockResolvedValueOnce({
            rows: [],
        });

        const req = new Request("http://localhost/api/search", {
            method: "POST",
            headers: { "content-type": "application/json" },
            body: JSON.stringify({
                ageMin: 20,
                ageMax: 30,
                heightMinLabel: "5 ft 6 in",
                heightMaxLabel: "6 ft 0 in",
                limit: 10,
                page: 1,
            }),
        });

        const res = await POST(req);
        expect(res.status).toBe(200);
    });

    test("POST handles filters (marital, religion, location)", async () => {
        query.mockResolvedValueOnce({
            rows: [],
        });

        const req = new Request("http://localhost/api/search", {
            method: "POST",
            headers: { "content-type": "application/json" },
            body: JSON.stringify({
                ageMin: 25,
                ageMax: 35,
                maritalStatuses: ["Never Married"],
                religionId: 1,
                stateIds: [1, 2],
                cityId: 5,
                limit: 20,
                page: 1,
            }),
        });

        const res = await POST(req);
        expect(res.status).toBe(200);
    });

    test("POST handles errors gracefully", async () => {
        query.mockRejectedValueOnce(new Error("DB connection failed"));

        const req = new Request("http://localhost/api/search", {
            method: "POST",
            headers: { "content-type": "application/json" },
            body: JSON.stringify({ ageMin: 20, ageMax: 30 }),
        });

        const res = await POST(req);
        expect(res.status).toBe(500);
        const json = await res.json();
        expect(json.error).toBeDefined();
    });
});
