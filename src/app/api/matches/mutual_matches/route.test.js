import { GET } from './route';
import { NextResponse } from 'next/server';
import { getAuthUser } from '@/lib/auth';
import { buildCommonParts, runListQuery, runCountQuery, respondCountOrList } from '../_common';

jest.mock('next/server', () => ({
    NextResponse: {
        json: jest.fn((data, init) => ({
            status: init?.status || 200,
            json: async () => data,
        })),
    },
}));

jest.mock('@/lib/auth', () => ({
    getAuthUser: jest.fn(),
}));

jest.mock('../_common', () => ({
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

describe('GET /api/matches/mutual_matches', () => {
    beforeEach(() => {
        jest.clearAllMocks();
    });

    it('should return 401 if unauthorized', async () => {
        getAuthUser.mockResolvedValue(null);
        const req = { url: 'http://localhost/api/matches/mutual_matches' };
        const res = await GET(req);
        expect(res.status).toBe(401);
    });

    it('should return count if count=1', async () => {
        getAuthUser.mockResolvedValue({ id: 1 });
        buildCommonParts.mockReturnValue({
            from: 'users u',
            whereParts: ['u.id <> $1'],
            params: [1],
        });
        runCountQuery.mockResolvedValue(5);
        const req = { url: 'http://localhost/api/matches/mutual_matches?count=1' };
        const res = await GET(req);
        const data = await res.json();
        expect(data.ok).toBe(true);
        expect(data.count).toBe(5);
    });

    it('should return list results', async () => {
        getAuthUser.mockResolvedValue({ id: 1 });
        buildCommonParts.mockReturnValue({
            from: 'users u',
            whereParts: ['u.id <> $1'],
            params: [1],
            limit: 20,
            offset: 0,
        });
        runListQuery.mockResolvedValue([{ id: 2 }]);
        const req = { url: 'http://localhost/api/matches/mutual_matches' };
        const res = await GET(req);
        const data = await res.json();
        expect(data.ok).toBe(true);
        expect(data.results).toHaveLength(1);
    });

    it('should handle missing whereParts safely', async () => {
        getAuthUser.mockResolvedValue({ id: 1 });
        buildCommonParts.mockReturnValue({ from: 'test', params: [] });
        runListQuery.mockResolvedValue([]);
        const req = { url: 'http://localhost/api/matches/mutual_matches' };
        await GET(req);
        // Should have at least 1 part (the EXISTS clause)
        expect(runListQuery).toHaveBeenCalledWith(expect.objectContaining({
            whereParts: expect.arrayContaining([expect.stringContaining('EXISTS')])
        }));
    });
});
