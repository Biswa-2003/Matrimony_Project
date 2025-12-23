import { resolvePhoto, timeAgo, safeJson } from '../myhome.utils';

describe('myhome.utils', () => {
    // resolvePhoto tests
    test('resolvePhoto returns fallback for invalid inputs', () => {
        expect(resolvePhoto(null)).toBe('/uploads/default.jpg');
        expect(resolvePhoto(undefined)).toBe('/uploads/default.jpg');
        expect(resolvePhoto(123)).toBe('/uploads/default.jpg');
        expect(resolvePhoto({})).toBe('/uploads/default.jpg');
    });

    test('resolvePhoto keeps blob and data URLs', () => {
        expect(resolvePhoto('blob:http://example.com/123')).toBe('blob:http://example.com/123');
        expect(resolvePhoto('data:image/png;base64,abc')).toBe('data:image/png;base64,abc');
    });

    test('resolvePhoto handles absolute paths or urls starting with http', () => {
        // The implementation assumes if it starts with blob or data it returns it.
        // It checks if it starts with /uploads/ and returns it.
        // Otherwise prepends /uploads/. 
        // Note: The specific implementation in utils: 
        // if (p.startsWith('blob:') || p.startsWith('data:')) return p;
        // return p.startsWith('/uploads/') ? p : `/uploads/${p}`;

        expect(resolvePhoto('/uploads/myphoto.jpg')).toBe('/uploads/myphoto.jpg');
        expect(resolvePhoto('myphoto.jpg')).toBe('/uploads/myphoto.jpg');
    });

    // timeAgo tests
    test('timeAgo returns "just now" for empty/invalid', () => {
        expect(timeAgo(null)).toBe('just now');
        expect(timeAgo('')).toBe('just now');
    });

    test('timeAgo calculates time correctly', () => {
        const now = Date.now();

        const oneMinAgo = new Date(now - 60000).toISOString();
        expect(timeAgo(oneMinAgo)).toBe('1 minutes ago');

        const oneHourAgo = new Date(now - 3600000).toISOString();
        expect(timeAgo(oneHourAgo)).toBe('1 hours ago');

        const oneDayAgo = new Date(now - 86400000).toISOString();
        expect(timeAgo(oneDayAgo)).toBe('1 day ago');

        const twoDaysAgo = new Date(now - 86400000 * 2.1).toISOString();
        expect(timeAgo(twoDaysAgo)).toBe('2 days ago');

        const almostNow = new Date(now - 1000).toISOString();
        expect(timeAgo(almostNow)).toBe('just now');
    });

    // safeJson tests
    test('safeJson returns {} for empty text', async () => {
        const res = {
            text: jest.fn().mockResolvedValue(''),
            url: 'http://test.com',
            status: 200
        };
        const result = await safeJson(res);
        expect(result).toEqual({});
    });

    test('safeJson returns parsed JSON for valid json', async () => {
        const data = { foo: 'bar' };
        const res = {
            text: jest.fn().mockResolvedValue(JSON.stringify(data)),
            url: 'http://test.com',
            status: 200
        };
        const result = await safeJson(res);
        expect(result).toEqual(data);
    });

    test('safeJson catches error and returns {} for invalid json', async () => {
        // Mock console.error to avoid noise
        const spy = jest.spyOn(console, 'error').mockImplementation(() => { });

        const res = {
            text: jest.fn().mockResolvedValue('{ invalid json'),
            url: 'http://test.com',
            status: 500
        };
        const result = await safeJson(res);
        expect(result).toEqual({});
        expect(spy).toHaveBeenCalled();

        spy.mockRestore();
    });
});
