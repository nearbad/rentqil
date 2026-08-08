import { describe, expect, it } from 'vitest';
import {
  dbDate,
  openHoursForDay,
  priceForHour,
  rangeIsFree,
  rangeIsOpen,
  rangesOverlap,
  weekdayOf,
  ymdFromDb,
} from '../src/domain/slots';

describe('openHoursForDay', () => {
  const rules = [
    { dayOfWeek: 1, openHour: 8, closeHour: 12 },
    { dayOfWeek: 1, openHour: 14, closeHour: 17 },
    { dayOfWeek: 2, openHour: 6, closeHour: 23 },
  ];

  it('collects hours for the day, split shifts included', () => {
    expect(openHoursForDay(rules, 1)).toEqual([8, 9, 10, 11, 14, 15, 16]);
  });

  it('is empty for a closed day', () => {
    expect(openHoursForDay(rules, 0)).toEqual([]);
  });

  it('dedupes overlapping rules', () => {
    const overlapping = [
      { dayOfWeek: 3, openHour: 8, closeHour: 12 },
      { dayOfWeek: 3, openHour: 10, closeHour: 14 },
    ];
    expect(openHoursForDay(overlapping, 3)).toEqual([8, 9, 10, 11, 12, 13]);
  });
});

describe('priceForHour', () => {
  const rules = [
    { dayOfWeek: null, startHour: 8, endHour: 23, priceTiyin: 35_000_000 },
    { dayOfWeek: null, startHour: 18, endHour: 23, priceTiyin: 45_000_000 },
    { dayOfWeek: 0, startHour: 8, endHour: 23, priceTiyin: 50_000_000 },
  ];

  it('picks the generic base price during the day', () => {
    expect(priceForHour(rules, 3, 10)).toBe(35_000_000);
  });

  it('narrower generic rule wins in the evening', () => {
    expect(priceForHour(rules, 3, 19)).toBe(45_000_000);
  });

  it('specific day beats any generic rule', () => {
    expect(priceForHour(rules, 0, 19)).toBe(50_000_000);
  });

  it('start hour is inclusive, end hour exclusive', () => {
    expect(priceForHour(rules, 3, 18)).toBe(45_000_000);
    expect(priceForHour(rules, 3, 23)).toBeNull();
    expect(priceForHour(rules, 3, 7)).toBeNull();
  });

  it('returns null when nothing matches', () => {
    expect(priceForHour([], 1, 12)).toBeNull();
  });
});

describe('range helpers', () => {
  it('rangesOverlap treats touching ranges as free', () => {
    expect(rangesOverlap(8, 10, 10, 12)).toBe(false);
    expect(rangesOverlap(8, 11, 10, 12)).toBe(true);
    expect(rangesOverlap(10, 12, 8, 11)).toBe(true);
  });

  it('rangeIsFree checks against every busy range', () => {
    const busy = [
      { startHour: 8, endHour: 10 },
      { startHour: 14, endHour: 16 },
    ];
    expect(rangeIsFree(busy, 10, 14)).toBe(true);
    expect(rangeIsFree(busy, 9, 11)).toBe(false);
    expect(rangeIsFree([], 0, 24)).toBe(true);
  });

  it('rangeIsOpen wants every hour inside working hours', () => {
    const open = [8, 9, 10, 11, 14, 15];
    expect(rangeIsOpen(open, 8, 12)).toBe(true);
    expect(rangeIsOpen(open, 10, 15)).toBe(false); // 12 and 13 are closed
    expect(rangeIsOpen(open, 14, 16)).toBe(true);
  });
});

describe('date helpers', () => {
  it('db dates survive the round trip regardless of server timezone', () => {
    const stored = dbDate('2026-08-09');
    expect(ymdFromDb(stored)).toBe('2026-08-09');
  });

  it('weekdayOf follows Date.getDay', () => {
    // 2026-08-09 is a Sunday
    expect(weekdayOf('2026-08-09')).toBe(0);
    expect(weekdayOf('2026-08-10')).toBe(1);
  });
});
