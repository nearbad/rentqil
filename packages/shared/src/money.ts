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

// "1 200 000 so'm", tiyin remainder is dropped for display (prices are whole soms)
export function formatMoney(tiyin: number, locale: Locale = 'uz'): string {
  const negative = tiyin < 0;
  const som = Math.floor(Math.abs(tiyin) / TIYIN_PER_SOM);
  const grouped = som.toString().replace(/\B(?=(\d{3})+(?!\d))/g, ' ');
  return `${negative ? '-' : ''}${grouped} ${CURRENCY_LABEL[locale]}`;
}
