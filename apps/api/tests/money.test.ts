import { describe, expect, it } from 'vitest';
import {
  allocateProportional,
  quoteBooking,
  refundForCancellation,
  splitEven,
} from '../src/domain/money';

// amounts are integer tiyin, 100 tiyin = 1 som

describe('quoteBooking', () => {
  it('sums slots and adds the percent service fee', () => {
    const q = quoteBooking({
      slotPricesTiyin: [35_000_000, 35_000_000, 45_000_000],
      serviceFeePercent: 10,
    });
    expect(q.totalTiyin).toBe(115_000_000);
    expect(q.serviceFeeTiyin).toBe(11_500_000);
    expect(q.payNowTiyin).toBe(126_500_000);
  });

  it('zero percent means no fee', () => {
    const q = quoteBooking({ slotPricesTiyin: [10_000_000], serviceFeePercent: 0 });
    expect(q.serviceFeeTiyin).toBe(0);
    expect(q.payNowTiyin).toBe(10_000_000);
  });

  it('rounds the fee to whole tiyin', () => {
    const q = quoteBooking({ slotPricesTiyin: [10_000_001], serviceFeePercent: 10 });
    // 1000000.1 rounds down
    expect(q.serviceFeeTiyin).toBe(1_000_000);
    expect(q.payNowTiyin).toBe(q.totalTiyin + q.serviceFeeTiyin);
  });

  it('a negative percent never produces a negative fee', () => {
    const q = quoteBooking({ slotPricesTiyin: [10_000_000], serviceFeePercent: -5 });
    expect(q.serviceFeeTiyin).toBe(0);
  });
});

describe('splitEven', () => {
  it('splits with no remainder', () => {
    expect(splitEven(9_000_000, 3)).toEqual([3_000_000, 3_000_000, 3_000_000]);
  });

  it('hands the remainder to the first shares and keeps the exact sum', () => {
    const shares = splitEven(10_000_000, 3);
    expect(shares).toEqual([3_333_334, 3_333_333, 3_333_333]);
    expect(shares.reduce((a, b) => a + b, 0)).toBe(10_000_000);
  });

  it('keeps the exact sum for awkward numbers', () => {
    for (const [amount, parts] of [
      [15_500_000, 3],
      [1, 7],
      [999_999, 30],
      [0, 5],
    ] as const) {
      const shares = splitEven(amount, parts);
      expect(shares).toHaveLength(parts);
      expect(shares.reduce((a, b) => a + b, 0)).toBe(amount);
      // shares differ by at most one tiyin
      expect(Math.max(...shares) - Math.min(...shares)).toBeLessThanOrEqual(1);
    }
  });

  it('rejects nonsense', () => {
    expect(() => splitEven(100, 0)).toThrow();
    expect(() => splitEven(-1, 2)).toThrow();
  });
});

describe('allocateProportional', () => {
  it('splits a refund across payments proportionally and exactly', () => {
    const parts = allocateProportional(5_000_000, [6_000_000, 4_000_000]);
    expect(parts.reduce((a, b) => a + b, 0)).toBe(5_000_000);
    expect(parts[0]).toBe(3_000_000);
    expect(parts[1]).toBe(2_000_000);
  });

  it('keeps the exact sum with rounding leftovers', () => {
    const amounts = [3_333_334, 3_333_333, 3_333_333];
    const parts = allocateProportional(5_000_000, amounts);
    expect(parts.reduce((a, b) => a + b, 0)).toBe(5_000_000);
    parts.forEach((p, i) => expect(p).toBeLessThanOrEqual(amounts[i]!));
  });

  it('full refund equals the payments themselves', () => {
    const amounts = [7_750_000, 7_750_000];
    expect(allocateProportional(15_500_000, amounts)).toEqual(amounts);
  });

  it('refuses to refund more than was paid', () => {
    expect(() => allocateProportional(11, [5, 5])).toThrow();
  });

  it('handles zero refund', () => {
    expect(allocateProportional(0, [100, 200])).toEqual([0, 0]);
  });
});

describe('refundForCancellation', () => {
  // full price paid online plus a 10% fee that never comes back
  const policy = { refundEnabled: true, freeCancelHours: 12, lateRefundPercent: 50 };
  const base = { totalTiyin: 90_000_000, paidTiyin: 99_000_000 };

  it('free window returns the price but keeps the fee', () => {
    const r = refundForCancellation({ policy, hoursToStart: 28, ...base });
    expect(r).toEqual({ refundTiyin: 90_000_000, reason: 'free_window' });
  });

  it('the window boundary still counts as free', () => {
    const r = refundForCancellation({ policy, hoursToStart: 12, ...base });
    expect(r.reason).toBe('free_window');
  });

  it('late cancellation returns the policy percent of the price', () => {
    const r = refundForCancellation({ policy, hoursToStart: 3, ...base });
    expect(r).toEqual({ refundTiyin: 45_000_000, reason: 'late' });
  });

  it('late refund never exceeds what was actually paid', () => {
    const r = refundForCancellation({
      policy: { ...policy, lateRefundPercent: 100 },
      hoursToStart: 3,
      totalTiyin: 90_000_000,
      paidTiyin: 10_000_000,
    });
    expect(r.refundTiyin).toBe(10_000_000);
  });

  it('the free window refund is capped by the paid amount too', () => {
    const r = refundForCancellation({
      policy,
      hoursToStart: 48,
      totalTiyin: 90_000_000,
      paidTiyin: 40_000_000,
    });
    expect(r.refundTiyin).toBe(40_000_000);
  });

  it('no refund policy returns zero', () => {
    const r = refundForCancellation({
      policy: { refundEnabled: false, freeCancelHours: 0, lateRefundPercent: 0 },
      hoursToStart: 100,
      ...base,
    });
    expect(r).toEqual({ refundTiyin: 0, reason: 'no_refund' });
  });

  it('nothing paid means nothing back', () => {
    const r = refundForCancellation({ policy, hoursToStart: 28, ...base, paidTiyin: 0 });
    expect(r).toEqual({ refundTiyin: 0, reason: 'nothing_paid' });
  });

  it('zero percent late policy keeps everything', () => {
    const r = refundForCancellation({
      policy: { refundEnabled: true, freeCancelHours: 24, lateRefundPercent: 0 },
      hoursToStart: 5,
      ...base,
    });
    expect(r).toEqual({ refundTiyin: 0, reason: 'late' });
  });
});
