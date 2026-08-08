import React, { useEffect, useRef } from 'react';
import { tokens } from '@rentqil/shared';
import { useI18n } from '@/lib/i18n';
import { loadYmaps, YANDEX_MAPS_KEY, type YmapsMap } from '@/lib/ymaps.web';
import 'leaflet/dist/leaflet.css';

interface Props {
  lat: number;
  lng: number;
  onPick: (lat: number, lng: number) => void;
}

// clickable map for the venue form: click drops the pin and reports coords.
// yandex with a key, leaflet + osm without one
export function MapPicker({ lat, lng, onPick }: Props) {
  const containerRef = useRef<HTMLDivElement>(null);
  const { locale } = useI18n();
  // the callback changes identity on every parent render, keep the latest
  const pickRef = useRef(onPick);
  pickRef.current = onPick;

  useEffect(() => {
    if (!YANDEX_MAPS_KEY) return;
    let map: YmapsMap | null = null;
    let cancelled = false;

    loadYmaps(locale).then((ymaps) => {
      if (!ymaps || cancelled || !containerRef.current) return;
      map = new ymaps.Map(
        containerRef.current,
        { center: [lat, lng], zoom: 13, controls: ['zoomControl'] },
        { suppressMapOpenBlock: true }
      );
      const mark = new ymaps.Placemark([lat, lng], {}, { preset: 'islands#blackDotIcon' });
      map.geoObjects.add(mark);
      map.events.add('click', (e) => {
        const coords = e.get('coords');
        map?.geoObjects.removeAll();
        map?.geoObjects.add(new ymaps.Placemark(coords, {}, { preset: 'islands#blackDotIcon' }));
        pickRef.current(Number(coords[0].toFixed(6)), Number(coords[1].toFixed(6)));
      });
    });

    return () => {
      cancelled = true;
      map?.destroy();
    };
    // recreating the map on every coord change would fight the user,
    // the pin moves through the click handler instead
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [locale]);

  useEffect(() => {
    if (YANDEX_MAPS_KEY) return;
    let map: import('leaflet').Map | null = null;
    let marker: import('leaflet').CircleMarker | null = null;
    let cancelled = false;

    import('leaflet').then((L) => {
      if (cancelled || !containerRef.current) return;
      map = L.map(containerRef.current).setView([lat, lng], 13);
      L.tileLayer('https://tile.openstreetmap.org/{z}/{x}/{y}.png', {
        attribution: '&copy; OpenStreetMap',
      }).addTo(map);
      marker = L.circleMarker([lat, lng], {
        radius: 8,
        color: tokens.colors.text,
        fillColor: tokens.colors.text,
        fillOpacity: 1,
      }).addTo(map);
      map.on('click', (e: import('leaflet').LeafletMouseEvent) => {
        marker?.setLatLng(e.latlng);
        pickRef.current(Number(e.latlng.lat.toFixed(6)), Number(e.latlng.lng.toFixed(6)));
      });
    });

    return () => {
      cancelled = true;
      map?.remove();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return (
    <div
      ref={containerRef}
      style={{
        height: 260,
        borderRadius: tokens.radius.md,
        overflow: 'hidden',
        border: `1px solid ${tokens.colors.gray150}`,
      }}
    />
  );
}
