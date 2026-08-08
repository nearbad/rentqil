import type { Locale } from './constants';

// all money in the system is integer tiyin, 1 som = 100 tiyin

export const TIYIN_PER_SOM = 100;

export function somToTiyin(som: number): number {
  return Math.round(som * TIYIN_PER_SOM);
}

export function tiyinToSom(tiyin: number): number {
  return tiyin / TIYIN_PER_SOM;
}

// the site shows one currency code everywhere
const CURRENCY_LABEL: Record<Locale, string> = {
  uz: 'UZS',
  ru: 'UZS',
  en: 'UZS',
};

// split an amount into n parts that sum exactly to the amount.
// everyone but the creator pays a share rounded to whole soms, the creator
// (index 0) absorbs the difference: 100 000 / 3 -> 33 334 + 33 333 + 33 333
// lives in shared because both the api and the app show shares
export function splitEven(amountTiyin: number, parts: number): number[] {
  if (parts < 1) throw new Error('parts must be >= 1');
  if (amountTiyin < 0) throw new Error('amount must be >= 0');
  if (parts === 1) return [amountTiyin];
  let other = Math.round(amountTiyin / parts / TIYIN_PER_SOM) * TIYIN_PER_SOM;
  let creator = amountTiyin - other * (parts - 1);
  if (creator < 0) {
    other = Math.floor(amountTiyin / parts / TIYIN_PER_SOM) * TIYIN_PER_SOM;
    creator = amountTiyin - other * (parts - 1);
  }
  return [creator, ...Array.from({ length: parts - 1 }, () => other)];
}

// "1 200 000 UZS", tiyin remainder is dropped for display (prices are whole soms)
export function formatMoney(tiyin: number, locale: Locale = 'uz'): string {
  const negative = tiyin < 0;
  const som = Math.floor(Math.abs(tiyin) / TIYIN_PER_SOM);
  const grouped = som.toString().replace(/\B(?=(\d{3})+(?!\d))/g, ' ');
  return `${negative ? '-' : ''}${grouped} ${CURRENCY_LABEL[locale]}`;
}
