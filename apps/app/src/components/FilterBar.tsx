import React from 'react';
import { ScrollView, View, useWindowDimensions } from 'react-native';
import { X } from 'lucide-react-native';
import { REGIONS, tokens, type Region } from '@rentqil/shared';
import { useI18n } from '@/lib/i18n';
import { useSports } from '@/lib/sports';
import { addDaysYmd, todayYmd } from '@/lib/format';
import { Button } from '@/ui/Button';
import { Input } from '@/ui/Input';
import { Chip } from '@/ui/bits';
import { Select } from '@/ui/Select';
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
}

// always visible filter row, every control applies instantly
export function FilterBar({ filters, onChange }: Props) {
  const { t, locale } = useI18n();
  const { sports } = useSports();
  const { width } = useWindowDimensions();
  const desktop = width >= tokens.breakpointDesktop;

  const patch = (part: Partial<CatalogFilters>) => onChange({ ...filters, ...part });

  const active =
    filters.sport || filters.region || filters.priceMaxSom || filters.indoor || filters.date || filters.sort !== 'default';

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

  return (
    <View style={{ gap: tokens.spacing.md }}>
      {desktop ? (
        <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: tokens.spacing.sm }}>{sportChips}</View>
      ) : (
        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: tokens.spacing.sm }}>
          {sportChips}
        </ScrollView>
      )}

      <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: tokens.spacing.sm, alignItems: 'flex-end' }}>
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
        <Input
          value={filters.priceMaxSom?.toString() ?? ''}
          onChangeText={(v) => {
            const n = parseInt(v.replace(/\D/g, ''), 10);
            patch({ priceMaxSom: Number.isFinite(n) && n > 0 ? n : undefined });
          }}
          keyboardType="number-pad"
          placeholder={t('catalog.priceUpTo')}
          style={{ minWidth: 170, paddingVertical: 8, fontSize: tokens.fontSize.small }}
        />
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
          <Button
            title={t('catalog.reset')}
            variant="ghost"
            small
            onPress={() => onChange({ sort: 'default' })}
          />
        ) : null}
      </View>
    </View>
  );
}
