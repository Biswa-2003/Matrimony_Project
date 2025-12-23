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

describe('GET /api/matches/newmatches', () => {
    beforeEach(() => {
        jest.clearAllMocks();
    });

    it('should return 401 if unauthorized', async () => {
        getAuthUser.mockResolvedValue(null);
        const req = { url: 'http://localhost/api/matches/newmatches' };
        const res = await GET(req);
        expect(res.status).toBe(401);
    });

    it('should return count if count=1', async () => {
        getAuthUser.mockResolvedValue({ id: 1 });
        buildCommonParts.mockReturnValue({
            from: 'users u',
            whereParts: ['u.id <> $1'],
            params: [1],
            createdExpr: 'u.created_at',
        });
        runCountQuery.mockResolvedValue(5);
        const req = { url: 'http://localhost/api/matches/newmatches?count=1' };
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
            createdExpr: 'u.created_at',
        });
        runListQuery.mockResolvedValue([{ id: 2 }]);
        const req = { url: 'http://localhost/api/matches/newmatches' };
        const res = await GET(req);
        const data = await res.json();
        expect(data.ok).toBe(true);
        expect(data.results).toHaveLength(1);
    });

    it('should use base.where if base.whereParts is missing', async () => {
        getAuthUser.mockResolvedValue({ id: 1 });
        buildCommonParts.mockReturnValue({
            from: 'users u',
            where: ['legacy_condition = 1'],
            params: [1],
            limit: 20,
            offset: 0,
            createdExpr: 'u.created_at',
        });
        runListQuery.mockResolvedValue([]);
        const req = { url: 'http://localhost/api/matches/newmatches' };
        await GET(req);
        expect(runListQuery).toHaveBeenCalledWith(expect.objectContaining({
            whereParts: expect.arrayContaining(['legacy_condition = 1'])
        }));
    });

    it('should safely handle missing whereParts and where', async () => {
        getAuthUser.mockResolvedValue({ id: 1 });
        buildCommonParts.mockReturnValue({
            from: 'users u',
            params: [1],
            limit: 20,
            offset: 0,
            createdExpr: 'u.created_at',
        });
        runListQuery.mockResolvedValue([]);
        const req = { url: 'http://localhost/api/matches/newmatches' };
        await GET(req);
        // Should only have the createdExpr part
        const callArgs = runListQuery.mock.calls[0][0];
        expect(callArgs.whereParts).toHaveLength(1);
    });
});
