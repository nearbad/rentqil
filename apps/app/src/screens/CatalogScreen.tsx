import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Platform, View, useWindowDimensions } from 'react-native';
import type { VenueCardView } from '@rentqil/shared';
import { somToTiyin, tokens } from '@rentqil/shared';
import { api } from '@/lib/api';
import { useI18n } from '@/lib/i18n';
import { Screen } from '@/ui/Screen';
import { Input } from '@/ui/Input';
import { EmptyState, ErrorBox, Loading } from '@/ui/bits';
import { VenueCard } from '@/components/VenueCard';
import { FilterBar, type CatalogFilters } from '@/components/FilterBar';

function buildQuery(filters: CatalogFilters, q: string, geo: { lat: number; lng: number } | null): string {
  const params = new URLSearchParams();
  if (filters.sport) params.set('sport', filters.sport);
  if (filters.region) params.set('region', filters.region);
  if (filters.priceMinSom) params.set('priceMinTiyin', String(somToTiyin(filters.priceMinSom)));
  if (filters.priceMaxSom) params.set('priceMaxTiyin', String(somToTiyin(filters.priceMaxSom)));
  if (filters.indoor) params.set('indoor', '1');
  if (filters.date) params.set('date', filters.date);
  if (filters.date && filters.hour !== undefined) params.set('hour', String(filters.hour));
  if (q.trim()) params.set('q', q.trim());
  if (filters.sort !== 'default') params.set('sort', filters.sort);
  if (filters.sort === 'distance' && geo) {
    params.set('lat', String(geo.lat));
    params.set('lng', String(geo.lng));
  }
  const s = params.toString();
  return s ? `?${s}` : '';
}

export function CatalogScreen() {
  const { t } = useI18n();
  const { width } = useWindowDimensions();
  const [search, setSearch] = useState('');
  const [filters, setFilters] = useState<CatalogFilters>({ sort: 'default' });
  const [items, setItems] = useState<VenueCardView[] | null>(null);
  const [maxPriceSom, setMaxPriceSom] = useState(1_000_000);
  const [error, setError] = useState(false);
  const [geo, setGeo] = useState<{ lat: number; lng: number } | null>(null);
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const query = useMemo(() => buildQuery(filters, search, geo), [filters, search, geo]);

  const load = useCallback(async (qs: string) => {
    setError(false);
    try {
      const res = await api<{ items: VenueCardView[]; maxPriceTiyin: number }>(`/venues${qs}`);
      setItems(res.items);
      if (res.maxPriceTiyin > 0) setMaxPriceSom(Math.round(res.maxPriceTiyin / 100));
    } catch {
      setError(true);
      setItems([]);
    }
  }, []);

  useEffect(() => {
    if (debounceRef.current) clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(() => load(query), 250);
    return () => {
      if (debounceRef.current) clearTimeout(debounceRef.current);
    };
  }, [query, load]);

  // browser geolocation for the distance sort, best effort
  useEffect(() => {
    if (filters.sort !== 'distance' || geo) return;
    if (Platform.OS === 'web' && typeof navigator !== 'undefined' && navigator.geolocation) {
      navigator.geolocation.getCurrentPosition(
        (pos) => setGeo({ lat: pos.coords.latitude, lng: pos.coords.longitude }),
        () => setFilters((f) => ({ ...f, sort: 'default' }))
      );
    } else {
      setFilters((f) => ({ ...f, sort: 'default' }));
    }
  }, [filters.sort, geo]);

  // 3 columns on wide desktops, 2 on small ones, a single column on phones
  const columns = width >= 1100 ? 3 : width >= 760 ? 2 : 1;

  const desktop = width >= tokens.breakpointDesktop;

  return (
    <Screen wide>
      <View style={{ gap: tokens.spacing.lg, paddingTop: desktop ? tokens.spacing.xl : tokens.spacing.md }}>
        <View style={{ width: '100%', maxWidth: 460, alignSelf: desktop ? 'center' : 'stretch' }}>
          <Input value={search} onChangeText={setSearch} placeholder={t('catalog.searchPlaceholder')} />
        </View>
        <FilterBar filters={filters} onChange={setFilters} maxPriceSom={maxPriceSom} />

        {error ? <ErrorBox message={t('error.NETWORK')} /> : null}
        {items === null ? (
          <Loading />
        ) : items.length === 0 ? (
          <EmptyState title={t('catalog.empty')} />
        ) : columns === 1 ? (
          <View style={{ gap: tokens.spacing.md }}>
            {items.map((venue) => (
              <VenueCard key={venue.id} venue={venue} />
            ))}
          </View>
        ) : (
          <View style={{ flexDirection: 'row', flexWrap: 'wrap', marginHorizontal: -tokens.spacing.sm }}>
            {items.map((venue) => (
              <View
                key={venue.id}
                style={{
                  width: `${100 / columns}%`,
                  paddingHorizontal: tokens.spacing.sm,
                  marginBottom: tokens.spacing.lg,
                }}
              >
                <VenueCard venue={venue} />
              </View>
            ))}
          </View>
        )}
      </View>
    </Screen>
  );
}
