import { GET } from './route';
import { NextResponse } from 'next/server';
import { getAuthUser } from '@/lib/auth';
import { buildCommonParts, runListQuery, runCountQuery, respondCountOrList } from '../_common';

// Mock NextResponse.json
jest.mock('next/server', () => ({
    NextResponse: {
        json: jest.fn((data, init) => ({
            status: init?.status || 200,
            json: async () => data,
        })),
    },
}));

// Mock Auth
jest.mock('@/lib/auth', () => ({
    getAuthUser: jest.fn(),
}));

// Mock Common Utils
jest.mock('../_common', () => ({
    SCORE_MIN: 0,
    buildCommonParts: jest.fn(),
    runListQuery: jest.fn(),
    runCountQuery: jest.fn(),
    normalizeWhereParts: jest.fn((base) => {
        if (Array.isArray(base.whereParts)) return base.whereParts;
        if (Array.isArray(base.where)) return base.where;
        return [];
    }),
    respondCountOrList: jest.fn(async ({ sp, base, whereParts }) => {
        const { NextResponse: mockRes } = require('next/server');
        const { runCountQuery: mockCount, runListQuery: mockList } = require('../_common');

        if (sp.get("count") === "1") {
            const count = await mockCount({ from: base.from, whereParts, params: base.params });
            return mockRes.json({ ok: true, count });
        }
        const results = await mockList({
            from: base.from,
            whereParts,
            params: base.params,
            limit: base.limit,
            offset: base.offset,
            orderBy: base.orderBy
        });
        return mockRes.json({ ok: true, results, page: base.page, limit: base.limit });
    })
}));

describe('GET /api/matches/yet-to-viewed-myprofile', () => {
    beforeEach(() => {
        jest.clearAllMocks();
    });

    it('should return 401 if unauthorized', async () => {
        getAuthUser.mockResolvedValue(null);
        const req = { url: 'http://localhost/api/matches/yet-to-viewed-myprofile' };

        const res = await GET(req);

        expect(res.status).toBe(401);
        const data = await res.json();
        expect(data.ok).toBe(false);
        expect(data.error).toBe('Unauthorized');
    });

    it('should return count if count=1 param is present', async () => {
        getAuthUser.mockResolvedValue({ id: 1 });
        buildCommonParts.mockReturnValue({
            from: 'users u',
            whereParts: ['u.id <> $1'],
            params: [1],
        });
        runCountQuery.mockResolvedValue(10);

        const req = { url: 'http://localhost/api/matches/yet-to-viewed-myprofile?count=1' };
        const res = await GET(req);

        expect(res.status).toBe(200);
        const data = await res.json();
        expect(data.ok).toBe(true);
        expect(data.count).toBe(10);
        expect(runCountQuery).toHaveBeenCalled();
    });

    it('should return results list if count param is not 1', async () => {
        getAuthUser.mockResolvedValue({ id: 1 });
        buildCommonParts.mockReturnValue({
            from: 'users u',
            whereParts: ['u.id <> $1'],
            params: [1],
            limit: 20,
            offset: 0,
            page: 1,
            orderBy: 'u.created_at DESC',
        });
        runListQuery.mockResolvedValue([{ id: 2, full_name: 'Test User' }]);

        const req = { url: 'http://localhost/api/matches/yet-to-viewed-myprofile' };
        const res = await GET(req);

        expect(res.status).toBe(200);
        const data = await res.json();
        expect(data.ok).toBe(true);
        expect(data.results).toHaveLength(1);
        expect(data.results[0].full_name).toBe('Test User');
        expect(runListQuery).toHaveBeenCalled();
    });

    it('should safely handle missing whereParts and where fallback', async () => {
        getAuthUser.mockResolvedValue({ id: 1 });
        buildCommonParts.mockReturnValue({
            from: 'users u',
            // neither whereParts nor where
            params: [1],
            limit: 20,
            offset: 0,
            page: 1,
            orderBy: 'u.created_at DESC',
        });
        runListQuery.mockResolvedValue([]);

        const req = { url: 'http://localhost/api/matches/yet-to-viewed-myprofile' };
        await GET(req);

        expect(runListQuery).toHaveBeenCalled();
        const callArgs = runListQuery.mock.calls[0][0];
        // Should have exactly 2 core parts (NOT EXISTS and match_score)
        expect(callArgs.whereParts).toHaveLength(2);
    });

    it('should use base.where if base.whereParts is missing', async () => {
        getAuthUser.mockResolvedValue({ id: 1 });
        buildCommonParts.mockReturnValue({
            from: 'users u',
            where: ['legacy_column = 99'],
            params: [1],
            limit: 20,
            offset: 0,
            page: 1,
            orderBy: 'u.created_at DESC',
        });
        runListQuery.mockResolvedValue([]);

        const req = { url: 'http://localhost/api/matches/yet-to-viewed-myprofile' };
        await GET(req);

        const callArgs = runListQuery.mock.calls[0][0];
        expect(callArgs.whereParts).toContain('legacy_column = 99');
        expect(callArgs.whereParts).toHaveLength(3); // 2 core + 1 legacy
    });
});
