import { useEffect, useState } from 'react';
import type { SportTypeView } from '@rentqil/shared';
import { api } from './api';
import { useI18n } from './i18n';

// the sport list rarely changes, one fetch per session is enough
let cache: SportTypeView[] | null = null;
let inflight: Promise<SportTypeView[]> | null = null;

function fetchSports(): Promise<SportTypeView[]> {
  if (cache) return Promise.resolve(cache);
  if (!inflight) {
    inflight = api<{ items: SportTypeView[] }>('/sports')
      .then((res) => {
        cache = res.items;
        return res.items;
      })
      .catch(() => {
        inflight = null;
        return [];
      });
  }
  return inflight;
}

// drop the cache so the next mount refetches, used by the admin screen
export function invalidateSports() {
  cache = null;
  inflight = null;
}

export function useSports() {
  const { locale } = useI18n();
  const [sports, setSports] = useState<SportTypeView[]>(cache ?? []);

  useEffect(() => {
    let alive = true;
    fetchSports().then((items) => {
      if (alive) setSports(items);
    });
    return () => {
      alive = false;
    };
  }, []);

  const sportName = (code: string): string => {
    const found = (cache ?? sports).find((s) => s.code === code);
    return found ? found.names[locale] : code;
  };

  const sportIcon = (code: string): string => {
    const found = (cache ?? sports).find((s) => s.code === code);
    return found?.icon ?? 'generic';
  };

  return { sports, sportName, sportIcon };
}
