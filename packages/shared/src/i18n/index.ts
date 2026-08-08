import { uz } from './uz';
import { ru } from './ru';
import { en } from './en';
import type { Locale } from '../constants';

export type TranslationKey = keyof typeof uz;

export const dictionaries: Record<Locale, Record<TranslationKey, string>> = { uz, ru, en };

export type TranslateParams = Record<string, string | number>;

export function translate(locale: Locale, key: TranslationKey, params?: TranslateParams): string {
  let text: string = dictionaries[locale][key] ?? dictionaries.uz[key] ?? key;
  if (params) {
    for (const [name, value] of Object.entries(params)) {
      text = text.split(`{${name}}`).join(String(value));
    }
  }
  return text;
}
