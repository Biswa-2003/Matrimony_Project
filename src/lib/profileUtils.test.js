import {
    num,
    safeBigInt,
    toCm,
    clean,
    asArray,
    toHeightCode,
    codeToCm,
    cmToCode,
    parseIncomeRange,
    parseIntOrNull,
    firstNonEmpty,
    HEIGHT_CODES
} from '@/lib/profileUtils';

describe('profileUtils', () => {
    describe('num', () => {
        it('returns null for empty/invalid values', () => {
            expect(num('')).toBe(null);
            expect(num(null)).toBe(null);
            expect(num(undefined)).toBe(null);
            expect(num('nan')).toBe(null);
            expect(num('null')).toBe(null);
            expect(num('-')).toBe(null);
            expect(num('.')).toBe(null);
        });

        it('parses valid numbers', () => {
            expect(num('123')).toBe(123);
            expect(num('45.67')).toBe(45.67);
            expect(num('-10')).toBe(-10);
        });

        it('strips non-numeric characters', () => {
            expect(num('$1,234.56')).toBe(1234.56);
            expect(num('Rs. 100')).toBe(100);
        });
    });

    describe('safeBigInt', () => {
        it('returns truncated integer', () => {
            expect(safeBigInt('123.99')).toBe(123);
            expect(safeBigInt(45.67)).toBe(45);
        });

        it('returns null for invalid values', () => {
            expect(safeBigInt('')).toBe(null);
            expect(safeBigInt(null)).toBe(null);
        });
    });

    describe('toCm', () => {
        it('returns null for empty values', () => {
            expect(toCm(null)).toBe(null);
            expect(toCm('')).toBe(null);
        });

        it('parses plain numbers as cm', () => {
            expect(toCm('170')).toBe(170);
            expect(toCm('165.5')).toBe(165.5);
        });

        it('converts feet/inches: "5 ft 10 in"', () => {
            expect(toCm('5 ft 10 in')).toBe(178); // (5*12+10)*2.54 = 177.8 → 178
        });

        it('converts feet only: "6 ft"', () => {
            expect(toCm('6 ft')).toBe(183); // 6*12*2.54 = 182.88 → 183
        });

        it('converts apostrophe format: "5\'10\""', () => {
            expect(toCm('5\'10"')).toBe(178);
        });

        it('returns null for invalid formats', () => {
            expect(toCm('abc')).toBe(null);
            expect(toCm('hello world')).toBe(null);
        });
    });

    describe('clean', () => {
        it('trims strings', () => {
            expect(clean('  hello  ')).toBe('hello');
            expect(clean('test')).toBe('test');
        });

        it('returns undefined for undefined', () => {
            expect(clean(undefined)).toBe(undefined);
        });

        it('converts to string', () => {
            expect(clean(123)).toBe('123');
        });
    });

    describe('asArray', () => {
        it('returns arrays as-is', () => {
            expect(asArray([1, 2, 3])).toEqual([1, 2, 3]);
        });

        it('splits comma-separated strings', () => {
            expect(asArray('a,b,c')).toEqual(['a', 'b', 'c']);
            expect(asArray('foo, bar , baz')).toEqual(['foo', 'bar', 'baz']);
        });

        it('returns empty array for null/empty', () => {
            expect(asArray(null)).toEqual([]);
            expect(asArray('')).toEqual([]);
            expect(asArray(undefined)).toEqual([]);
        });
    });

    describe('toHeightCode', () => {
        it('returns null for empty values', () => {
            expect(toHeightCode(null)).toBe(null);
            expect(toHeightCode('')).toBe(null);
        });

        it('converts cm to code', () => {
            const code = toHeightCode('170 cm');
            expect(HEIGHT_CODES).toContain(code);
        });

        it('normalizes format: "5 feet 10 inches" → "5ft10in"', () => {
            const code = toHeightCode('5 feet 10 inches');
            expect(code).toBe('5ft10in');
        });

        it('returns valid code if already in correct format', () => {
            expect(toHeightCode('6ft0in')).toBe('6ft0in');
        });
    });

    describe('codeToCm', () => {
        it('converts height code to cm', () => {
            expect(codeToCm('5ft10in')).toBe(178);
            expect(codeToCm('6ft0in')).toBe(183);
        });

        it('returns null for invalid codes', () => {
            expect(codeToCm(null)).toBe(null);
            expect(codeToCm('')).toBe(null);
            expect(codeToCm('invalid')).toBe(null);
        });
    });

    describe('cmToCode', () => {
        it('converts cm to height code', () => {
            const code = cmToCode(178);
            expect(HEIGHT_CODES).toContain(code);
        });

        it('returns null for null input', () => {
            expect(cmToCode(null)).toBe(null);
        });
    });

    describe('parseIncomeRange', () => {
        it('parses "10 - 15 Lakh"', () => {
            const result = parseIncomeRange('10 - 15 Lakh');
            expect(result.min).toBe(1000000);
            expect(result.max).toBe(1500000);
        });

        it('parses "1 Crore"', () => {
            const result = parseIncomeRange('1 Crore');
            expect(result.min).toBe(10000000);
            expect(result.max).toBe(null);
        });

        it('parses plain numbers', () => {
            const result = parseIncomeRange('1200000');
            expect(result.min).toBe(1200000);
            expect(result.max).toBe(null);
        });

        it('returns null for empty', () => {
            const result = parseIncomeRange('');
            expect(result.min).toBe(null);
            expect(result.max).toBe(null);
        });

        it('handles "Rs. 12 Lakh"', () => {
            const result = parseIncomeRange('Rs. 12 Lakh');
            expect(result.min).toBe(1200000);
        });
    });

    describe('parseIntOrNull', () => {
        it('parses valid integers', () => {
            expect(parseIntOrNull('123')).toBe(123);
            expect(parseIntOrNull(456)).toBe(456);
        });

        it('returns null for non-integers', () => {
            expect(parseIntOrNull('abc')).toBe(null);
            expect(parseIntOrNull('')).toBe(null);
            expect(parseIntOrNull(null)).toBe(null);
        });
    });

    describe('firstNonEmpty', () => {
        it('returns first non-empty value', () => {
            expect(firstNonEmpty('', '  ', 'value')).toBe('value');
            expect(firstNonEmpty(null, 'first', 'second')).toBe('first');
        });

        it('returns null if all empty', () => {
            expect(firstNonEmpty('', null, undefined)).toBe(null);
        });

        it('trims values', () => {
            expect(firstNonEmpty('', '  test  ')).toBe('test');
        });
    });
});
