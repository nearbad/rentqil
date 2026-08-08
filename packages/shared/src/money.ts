import type { Locale } from './constants';

// all money in the system is integer tiyin, 1 som = 100 tiyin

export const TIYIN_PER_SOM = 100;

export function somToTiyin(som: number): number {
  return Math.round(som * TIYIN_PER_SOM);
}

export function tiyinToSom(tiyin: number): number {
  return tiyin / TIYIN_PER_SOM;
}

const CURRENCY_LABEL: Record<Locale, string> = {
  uz: "so'm",
  ru: 'сум',
  en: "so'm",
};

// split an amount into n parts that sum exactly to the amount,
// first parts pick up the remainder tiyin
// lives in shared because both the api and the app show shares
export function splitEven(amountTiyin: number, parts: number): number[] {
  if (parts < 1) throw new Error('parts must be >= 1');
  if (amountTiyin < 0) throw new Error('amount must be >= 0');
  const base = Math.floor(amountTiyin / parts);
  const remainder = amountTiyin - base * parts;
  return Array.from({ length: parts }, (_, i) => base + (i < remainder ? 1 : 0));
}

// "1 200 000 so'm", tiyin remainder is dropped for display (prices are whole soms)
export function formatMoney(tiyin: number, locale: Locale = 'uz'): string {
  const negative = tiyin < 0;
  const som = Math.floor(Math.abs(tiyin) / TIYIN_PER_SOM);
  const grouped = som.toString().replace(/\B(?=(\d{3})+(?!\d))/g, ' ');
  return `${negative ? '-' : ''}${grouped} ${CURRENCY_LABEL[locale]}`;
}
