import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Platform, Pressable, View } from 'react-native';
import { SlidersHorizontal } from 'lucide-react-native';
import type { VenueCardView } from '@rentqil/shared';
import { somToTiyin, tokens } from '@rentqil/shared';
import { api } from '@/lib/api';
import { useI18n } from '@/lib/i18n';
import { Screen } from '@/ui/Screen';
import { Input } from '@/ui/Input';
import { EmptyState, ErrorBox, Loading } from '@/ui/bits';
import { VenueCard } from '@/components/VenueCard';
import { FiltersSheet, type CatalogFilters } from '@/components/FiltersSheet';

function buildQuery(filters: CatalogFilters, q: string, geo: { lat: number; lng: number } | null): string {
  const params = new URLSearchParams();
  if (filters.sport) params.set('sport', filters.sport);
  if (filters.district) params.set('district', filters.district);
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
  const [search, setSearch] = useState('');
  const [filters, setFilters] = useState<CatalogFilters>({ sort: 'default' });
  const [sheetOpen, setSheetOpen] = useState(false);
  const [items, setItems] = useState<VenueCardView[] | null>(null);
  const [error, setError] = useState(false);
  const [geo, setGeo] = useState<{ lat: number; lng: number } | null>(null);
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const query = useMemo(() => buildQuery(filters, search, geo), [filters, search, geo]);

  const load = useCallback(async (qs: string) => {
    setError(false);
    try {
      const res = await api<{ items: VenueCardView[] }>(`/venues${qs}`);
      setItems(res.items);
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

  const filtersActive =
    filters.sport || filters.district || filters.priceMaxSom || filters.indoor || filters.date || filters.sort !== 'default';

  return (
    <Screen
      title={t('nav.catalog')}
      right={
        <Pressable onPress={() => setSheetOpen(true)} hitSlop={tokens.hitSlop}>
          <SlidersHorizontal
            size={22}
            color={filtersActive ? tokens.colors.text : tokens.colors.gray500}
            strokeWidth={filtersActive ? 2 : 1.6}
          />
        </Pressable>
      }
    >
      <View style={{ gap: tokens.spacing.md }}>
        <Input value={search} onChangeText={setSearch} placeholder={t('catalog.searchPlaceholder')} />

        {error ? <ErrorBox message={t('error.NETWORK')} /> : null}
        {items === null ? (
          <Loading />
        ) : items.length === 0 ? (
          <EmptyState title={t('catalog.empty')} />
        ) : (
          <View style={{ gap: tokens.spacing.md }}>
            {items.map((venue) => (
              <VenueCard key={venue.id} venue={venue} />
            ))}
          </View>
        )}
      </View>

      <FiltersSheet visible={sheetOpen} initial={filters} onApply={setFilters} onClose={() => setSheetOpen(false)} />
    </Screen>
  );
}
