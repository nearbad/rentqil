// loads the Yandex Maps JS API once and caches the promise.
// the key is baked into the web bundle at build time, no key means
// the app falls back to leaflet + osm tiles.

export const YANDEX_MAPS_KEY = process.env.EXPO_PUBLIC_YANDEX_MAPS_KEY ?? '';

// the api does not ship an uz locale, russian is the closest default
const LANG: Record<string, string> = { uz: 'ru_RU', ru: 'ru_RU', en: 'en_US' };

// loosely typed on purpose, we use a tiny slice of the api
export interface YmapsApi {
  Map: new (el: HTMLElement, opts: Record<string, unknown>, extra?: Record<string, unknown>) => YmapsMap;
  Placemark: new (coords: [number, number], props: Record<string, unknown>, opts: Record<string, unknown>) => unknown;
  ready: (cb: () => void) => void;
}

export interface YmapsMap {
  geoObjects: { add: (obj: unknown) => void; removeAll: () => void };
  events: { add: (name: string, cb: (e: YmapsEvent) => void) => void };
  destroy: () => void;
  setCenter: (coords: [number, number]) => void;
}

export interface YmapsEvent {
  get: (key: string) => [number, number];
}

declare global {
  interface Window {
    ymaps?: YmapsApi;
  }
}

let loader: Promise<YmapsApi | null> | null = null;

export function loadYmaps(locale: string): Promise<YmapsApi | null> {
  if (!YANDEX_MAPS_KEY) return Promise.resolve(null);
  if (window.ymaps) return Promise.resolve(window.ymaps);
  if (!loader) {
    loader = new Promise((resolve) => {
      const script = document.createElement('script');
      const lang = LANG[locale] ?? 'ru_RU';
      script.src = `https://api-maps.yandex.ru/2.1/?apikey=${encodeURIComponent(YANDEX_MAPS_KEY)}&lang=${lang}`;
      script.onload = () => {
        const api = window.ymaps;
        if (!api) return resolve(null);
        api.ready(() => resolve(api));
      };
      script.onerror = () => resolve(null);
      document.head.appendChild(script);
    });
  }
  return loader;
}
