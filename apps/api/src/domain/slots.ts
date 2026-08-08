// slot math shared by availability, booking validation and the seed
// hours are plain integers in venue local time, see docs/DECISIONS.md 03

export interface ScheduleRuleLike {
  dayOfWeek: number;
  openHour: number;
  closeHour: number;
}

export interface PriceRuleLike {
  dayOfWeek: number | null;
  startHour: number;
  endHour: number;
  priceTiyin: number;
}

export interface BusyRangeLike {
  startHour: number;
  endHour: number;
}

// open hours for one weekday, sorted, deduped
export function openHoursForDay(rules: ScheduleRuleLike[], dayOfWeek: number): number[] {
  const hours = new Set<number>();
  for (const rule of rules) {
    if (rule.dayOfWeek !== dayOfWeek) continue;
    for (let h = rule.openHour; h < rule.closeHour; h++) hours.add(h);
  }
  return [...hours].sort((a, b) => a - b);
}

// a rule for the exact weekday beats a generic (null) one,
// among equal specificity the narrowest hour range wins
export function priceForHour(
  rules: PriceRuleLike[],
  dayOfWeek: number,
  hour: number
): number | null {
  let best: PriceRuleLike | null = null;
  for (const rule of rules) {
    if (hour < rule.startHour || hour >= rule.endHour) continue;
    if (rule.dayOfWeek !== null && rule.dayOfWeek !== dayOfWeek) continue;
    if (!best) {
      best = rule;
      continue;
    }
    const bestSpecific = best.dayOfWeek !== null;
    const ruleSpecific = rule.dayOfWeek !== null;
    if (ruleSpecific && !bestSpecific) {
      best = rule;
    } else if (ruleSpecific === bestSpecific) {
      const bestWidth = best.endHour - best.startHour;
      const ruleWidth = rule.endHour - rule.startHour;
      if (ruleWidth < bestWidth) best = rule;
    }
  }
  return best ? best.priceTiyin : null;
}

export function rangesOverlap(aStart: number, aEnd: number, bStart: number, bEnd: number): boolean {
  return aStart < bEnd && bStart < aEnd;
}

export function rangeIsFree(busy: BusyRangeLike[], startHour: number, endHour: number): boolean {
  return !busy.some((b) => rangesOverlap(startHour, endHour, b.startHour, b.endHour));
}

// every hour of [startHour, endHour) must be inside working hours
export function rangeIsOpen(openHours: number[], startHour: number, endHour: number): boolean {
  const set = new Set(openHours);
  for (let h = startHour; h < endHour; h++) {
    if (!set.has(h)) return false;
  }
  return true;
}

// date helpers, all in server local time which is pinned to Asia/Tashkent

// prisma @db.Date columns are UTC anchored, a local midnight Date would
// shift one day back when serialized, so DB reads and writes go through these two
export function dbDate(value: string): Date {
  const [y, m, d] = value.split('-').map(Number);
  return new Date(Date.UTC(y ?? 1970, (m ?? 1) - 1, d ?? 1));
}

export function ymdFromDb(date: Date): string {
  const y = date.getUTCFullYear();
  const m = String(date.getUTCMonth() + 1).padStart(2, '0');
  const d = String(date.getUTCDate()).padStart(2, '0');
  return `${y}-${m}-${d}`;
}

export function ymd(date: Date): string {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, '0');
  const d = String(date.getDate()).padStart(2, '0');
  return `${y}-${m}-${d}`;
}

export function parseYmd(value: string): Date {
  const [y, m, d] = value.split('-').map(Number);
  return new Date(y ?? 1970, (m ?? 1) - 1, d ?? 1);
}

export function addDays(date: Date, days: number): Date {
  const copy = new Date(date);
  copy.setDate(copy.getDate() + days);
  return copy;
}

// weekday of a YYYY-MM-DD in local time
export function weekdayOf(value: string): number {
  return parseYmd(value).getDay();
}

// booking start as a Date in local time
export function slotStartDate(date: string, hour: number): Date {
  const d = parseYmd(date);
  d.setHours(hour, 0, 0, 0);
  return d;
}

export function hoursUntil(target: Date, now: Date): number {
  return (target.getTime() - now.getTime()) / 3_600_000;
}
