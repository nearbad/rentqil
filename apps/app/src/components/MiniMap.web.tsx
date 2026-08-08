import React, { useEffect, useRef } from 'react';
import { tokens } from '@rentqil/shared';
import 'leaflet/dist/leaflet.css';

// leaflet + osm tiles, web only
export function MiniMap({ lat, lng }: { lat: number; lng: number; address: string }) {
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    let map: import('leaflet').Map | null = null;
    let cancelled = false;

    import('leaflet').then((L) => {
      if (cancelled || !containerRef.current) return;
      map = L.map(containerRef.current, {
        zoomControl: false,
        dragging: false,
        scrollWheelZoom: false,
        doubleClickZoom: false,
        touchZoom: false,
      }).setView([lat, lng], 15);
      L.tileLayer('https://tile.openstreetmap.org/{z}/{x}/{y}.png', {
        attribution: '&copy; OpenStreetMap',
      }).addTo(map);
      // default marker icons have bundler path issues, a plain dot fits the design anyway
      L.circleMarker([lat, lng], {
        radius: 8,
        color: tokens.colors.text,
        fillColor: tokens.colors.text,
        fillOpacity: 1,
      }).addTo(map);
    });

    return () => {
      cancelled = true;
      map?.remove();
    };
  }, [lat, lng]);

  return (
    <div
      ref={containerRef}
      style={{
        height: 160,
        borderRadius: tokens.radius.md,
        overflow: 'hidden',
        border: `1px solid ${tokens.colors.gray150}`,
      }}
    />
  );
}
