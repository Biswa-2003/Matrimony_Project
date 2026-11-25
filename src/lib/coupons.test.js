jest.mock('@/lib/db', () => ({ query: jest.fn(), getClient: jest.fn() }));
jest.mock('@/lib/referrals', () => ({ applyBonusDays: jest.fn(), rewardReferrer: jest.fn() }));

import { priceWithCoupon, normCode } from './coupons';

const plan = { code: 'GOLD', price_inr: 1500 };

describe('coupon pricing', () => {
  it('no coupon = base + 18% GST', () => {
    expect(priceWithCoupon(plan, null)).toEqual({ basePaise: 150000, discountPaise: 0, netPaise: 150000, totalPaise: 177000 });
  });
  it('percent off, GST on the discounted price', () => {
    const p = priceWithCoupon(plan, { kind: 'percent', value: 20 });
    expect(p.discountPaise).toBe(30000);
    expect(p.totalPaise).toBe(Math.round(120000 * 1.18));
  });
  it('percent off respects the max discount cap', () => {
    expect(priceWithCoupon(plan, { kind: 'percent', value: 50, max_discount_inr: 200 }).discountPaise).toBe(20000);
  });
  it('flat off never goes below zero', () => {
    expect(priceWithCoupon(plan, { kind: 'flat', value: 500 }).discountPaise).toBe(50000);
    const all = priceWithCoupon(plan, { kind: 'flat', value: 99999 });
    expect(all.discountPaise).toBe(150000);
    expect(all.totalPaise).toBe(0);
  });
  it('normalises codes', () => {
    expect(normCode(' diwali 25 ')).toBe('DIWALI25');
  });
});
