import { gunaMilan, nakshatraIndex, rashiIndex, NAKSHATRAS } from './guna-milan';

describe('guna milan', () => {
  it('parses the spellings used in our forms and data', () => {
    expect(nakshatraIndex('Mrigasira')).toBe(4);
    expect(nakshatraIndex('Mrigashira')).toBe(4);
    expect(nakshatraIndex('Purva Phalguni')).toBe(10);
    expect(nakshatraIndex('Moola')).toBe(18);
    expect(nakshatraIndex('yes')).toBeNull();
    expect(rashiIndex('Mesh (Aries)')).toBe(0);
    expect(rashiIndex('Mithun (Gemini)')).toBe(2);
    expect(rashiIndex('gemini')).toBe(2);
    expect(rashiIndex('Vrishchik (Scorpio)')).toBe(7);
    expect(rashiIndex('')).toBeNull();
  });

  it('same star + same rashi = 28/36 (everything but Nadi)', () => {
    const r = gunaMilan({ star: 'Ashwini', rashi: 'Mesh (Aries)' }, { star: 'Ashwini', rashi: 'Mesha' });
    expect(r.max).toBe(36);
    expect(r.total).toBe(28);
    expect(r.kootas.find((k) => k.key === 'nadi').got).toBe(0);
    expect(r.doshas).toEqual(['Nadi']);
  });

  it('flags Bhakoot dosha for 6/8 rashi positions', () => {
    const r = gunaMilan({ star: 'Ashwini', rashi: 'Mesha' }, { star: 'Hasta', rashi: 'Kanya' });
    expect(r.kootas.find((k) => k.key === 'bhakoot').got).toBe(0);
    expect(r.doshas).toContain('Bhakoot');
  });

  it('gives a partial score (out of 21) when rashi is missing', () => {
    const r = gunaMilan({ star: 'Rohini' }, { star: 'Hasta', rashi: 'Kanya' });
    expect(r.partial).toBe(true);
    expect(r.max).toBe(21);
    expect(r.kootas.map((k) => k.key)).toEqual(['tara', 'yoni', 'gana', 'nadi']);
  });

  it('returns null without both stars', () => {
    expect(gunaMilan({ star: 'Rohini', rashi: 'Vrishabha' }, { rashi: 'Kanya' })).toBeNull();
    expect(gunaMilan(null, null)).toBeNull();
  });

  it('stays within 0..36 for every star pair', () => {
    for (let b = 0; b < 27; b++) {
      for (let g = 0; g < 27; g += 5) {
        const r = gunaMilan({ star: NAKSHATRAS[b], rashi: 'Karka' }, { star: NAKSHATRAS[g], rashi: 'Makara' });
        expect(r.total).toBeGreaterThanOrEqual(0);
        expect(r.total).toBeLessThanOrEqual(36);
      }
    }
  });

  it('reports manglik compatibility', () => {
    expect(gunaMilan({ star: 'Rohini', manglik: 'Yes' }, { star: 'Hasta', manglik: 'No' }).manglik).toBe('mismatch');
    expect(gunaMilan({ star: 'Rohini', manglik: 'No' }, { star: 'Hasta', manglik: 'No' }).manglik).toBe('match');
    expect(gunaMilan({ star: 'Rohini', manglik: "Doesn't Matter" }, { star: 'Hasta', manglik: 'No' }).manglik).toBeNull();
  });
});
