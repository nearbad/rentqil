import { formatMoney, translate, type Locale, type TranslationKey } from '@rentqil/shared';

export function money(tiyin: number, locale: Locale): string {
  return formatMoney(tiyin, locale);
}

// "Ju, 08.08" style short date from YYYY-MM-DD
export function shortDate(ymd: string, locale: Locale): string {
  const [y, m, d] = ymd.split('-').map(Number);
  const date = new Date(y ?? 1970, (m ?? 1) - 1, d ?? 1);
  const dayName = translate(locale, `day.${date.getDay()}` as TranslationKey);
  return `${dayName}, ${String(d).padStart(2, '0')}.${String(m).padStart(2, '0')}`;
}

export function hourRange(startHour: number, endHour: number): string {
  const pad = (h: number) => `${String(h).padStart(2, '0')}:00`;
  return `${pad(startHour)} - ${pad(endHour)}`;
}

export function todayYmd(): string {
  const now = new Date();
  const m = String(now.getMonth() + 1).padStart(2, '0');
  const d = String(now.getDate()).padStart(2, '0');
  return `${now.getFullYear()}-${m}-${d}`;
}

export function addDaysYmd(ymd: string, days: number): string {
  const [y, m, d] = ymd.split('-').map(Number);
  const date = new Date(y ?? 1970, (m ?? 1) - 1, d ?? 1);
  date.setDate(date.getDate() + days);
  const mm = String(date.getMonth() + 1).padStart(2, '0');
  const dd = String(date.getDate()).padStart(2, '0');
  return `${date.getFullYear()}-${mm}-${dd}`;
}

export function minutesLeft(iso: string | null): number {
  if (!iso) return 0;
  return Math.max(0, Math.round((new Date(iso).getTime() - Date.now()) / 60000));
}
