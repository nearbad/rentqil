import React from 'react';
import { ScrollView, View, useWindowDimensions } from 'react-native';
import { REGIONS, tokens, type Region } from '@rentqil/shared';
import { useI18n } from '@/lib/i18n';
import { useSports } from '@/lib/sports';
import { addDaysYmd, todayYmd } from '@/lib/format';
import { AppText } from '@/ui/AppText';
import { Button } from '@/ui/Button';
import { Chip } from '@/ui/bits';
import { Select } from '@/ui/Select';
import { PriceSlider } from '@/ui/RangeSlider';
import { SportIcon } from './SportIcon';

export interface CatalogFilters {
  sport?: string;
  region?: Region;
  priceMaxSom?: number;
  indoor?: boolean;
  date?: string;
  hour?: number;
  sort: 'default' | 'price' | 'distance';
}

interface Props {
  filters: CatalogFilters;
  onChange: (filters: CatalogFilters) => void;
  // ceiling for the price slider, comes from the catalog response
  maxPriceSom: number;
}

const PRICE_STEP = 10_000;

// always visible filter rows, every control applies instantly
export function FilterBar({ filters, onChange, maxPriceSom }: Props) {
  const { t, locale } = useI18n();
  const { sports } = useSports();
  const { width } = useWindowDimensions();
  const desktop = width >= tokens.breakpointDesktop;

  const patch = (part: Partial<CatalogFilters>) => onChange({ ...filters, ...part });

  const ceiling = Math.max(Math.ceil(maxPriceSom / PRICE_STEP) * PRICE_STEP, PRICE_STEP);
  const priceHi = filters.priceMaxSom ?? ceiling;

  const active =
    filters.sport ||
    filters.region ||
    filters.priceMaxSom !== undefined ||
    filters.indoor ||
    filters.date ||
    filters.sort !== 'default';

  const dateOptions = [
    { value: null, label: t('common.all') },
    ...Array.from({ length: 7 }, (_, i) => {
      const date = addDaysYmd(todayYmd(), i);
      return { value: date, label: i === 0 ? t('common.today') : date.slice(5).split('-').reverse().join('.') };
    }),
  ];

  const hourOptions = [
    { value: null, label: t('common.all') },
    ...Array.from({ length: 18 }, (_, i) => ({ value: i + 6, label: `${String(i + 6).padStart(2, '0')}:00` })),
  ];

  const sportChips = (
    <>
      <Chip label={t('catalog.anySport')} selected={!filters.sport} onPress={() => patch({ sport: undefined })} />
      {sports.map((s) => (
        <Chip
          key={s.code}
          label={s.names[locale]}
          selected={filters.sport === s.code}
          icon={
            <SportIcon
              icon={s.icon}
              size={14}
              color={filters.sport === s.code ? tokens.colors.white : tokens.colors.gray700}
            />
          }
          onPress={() => patch({ sport: filters.sport === s.code ? undefined : s.code })}
        />
      ))}
    </>
  );

  const center = desktop ? ('center' as const) : ('flex-start' as const);

  return (
    <View style={{ gap: tokens.spacing.md }}>
      {desktop ? (
        <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: tokens.spacing.sm, justifyContent: center }}>
          {sportChips}
        </View>
      ) : (
        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: tokens.spacing.sm }}>
          {sportChips}
        </ScrollView>
      )}

      <View
        style={{
          flexDirection: 'row',
          flexWrap: 'wrap',
          gap: tokens.spacing.md,
          alignItems: 'flex-end',
          justifyContent: center,
        }}
      >
        <Select
          compact
          value={filters.region ?? null}
          onChange={(v) => patch({ region: (v as Region) ?? undefined })}
          options={[
            { value: null, label: t('catalog.anyRegion') },
            ...REGIONS.map((r) => ({ value: r as string, label: t(`region.${r}`) })),
          ]}
          style={{ minWidth: 180 }}
        />
        <Select
          compact
          value={filters.date ?? null}
          onChange={(v) => patch({ date: (v as string) ?? undefined, hour: v ? filters.hour : undefined })}
          options={dateOptions}
          placeholder={t('catalog.date')}
          style={{ minWidth: 110 }}
        />
        {filters.date ? (
          <Select
            compact
            value={filters.hour ?? null}
            onChange={(v) => patch({ hour: (v as number) ?? undefined })}
            options={hourOptions}
            placeholder={t('catalog.hour')}
            style={{ minWidth: 90 }}
          />
        ) : null}
        <View
          style={{
            width: desktop ? 300 : '100%',
            flexDirection: 'row',
            alignItems: 'center',
            gap: tokens.spacing.sm,
            paddingBottom: 6,
          }}
        >
          <AppText variant="tiny" color={tokens.colors.gray500}>
            {t('catalog.priceUpTo')}
          </AppText>
          <View style={{ flex: 1 }}>
            <PriceSlider
              min={PRICE_STEP}
              max={ceiling}
              step={PRICE_STEP}
              value={priceHi}
              onChange={(v) => patch({ priceMaxSom: v < ceiling ? v : undefined })}
            />
          </View>
          <AppText variant="tiny" weight="bold" style={{ minWidth: 62, textAlign: 'right' }}>
            {priceHi >= 1000 ? `${Math.round(priceHi / 1000)}k` : priceHi} UZS
          </AppText>
        </View>
        <Chip
          label={t('catalog.indoorOnly')}
          selected={filters.indoor ?? false}
          onPress={() => patch({ indoor: filters.indoor ? undefined : true })}
        />
        <Select
          compact
          value={filters.sort}
          onChange={(v) => patch({ sort: v as CatalogFilters['sort'] })}
          options={[
            { value: 'default', label: t('catalog.sortDefault') },
            { value: 'price', label: t('catalog.sortPrice') },
            { value: 'distance', label: t('catalog.sortDistance') },
          ]}
          style={{ minWidth: 130 }}
        />
        {active ? (
          <Button title={t('catalog.reset')} variant="ghost" small onPress={() => onChange({ sort: 'default' })} />
        ) : null}
      </View>
    </View>
  );
}
