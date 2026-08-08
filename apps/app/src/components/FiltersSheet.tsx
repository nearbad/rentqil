import React, { useState } from 'react';
import { Modal, Pressable, ScrollView, View } from 'react-native';
import { DISTRICTS, SPORTS, tokens, type District, type Sport } from '@rentqil/shared';
import { useI18n } from '@/lib/i18n';
import { addDaysYmd, todayYmd } from '@/lib/format';
import { AppText } from '@/ui/AppText';
import { Button } from '@/ui/Button';
import { Input } from '@/ui/Input';
import { Chip } from '@/ui/bits';
import { Select } from '@/ui/Select';
import { Toggle } from '@/ui/Toggle';

export interface CatalogFilters {
  sport?: Sport;
  district?: District;
  priceMaxSom?: number;
  indoor?: boolean;
  date?: string;
  hour?: number;
  sort: 'default' | 'price' | 'distance';
}

interface Props {
  visible: boolean;
  initial: CatalogFilters;
  onApply: (filters: CatalogFilters) => void;
  onClose: () => void;
}

export function FiltersSheet({ visible, initial, onApply, onClose }: Props) {
  const { t } = useI18n();
  const [draft, setDraft] = useState<CatalogFilters>(initial);

  // reset the draft each time the sheet opens
  React.useEffect(() => {
    if (visible) setDraft(initial);
  }, [visible, initial]);

  const patch = (part: Partial<CatalogFilters>) => setDraft((d) => ({ ...d, ...part }));

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

  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={onClose}>
      <Pressable style={{ flex: 1, backgroundColor: 'rgba(10,10,10,0.4)' }} onPress={onClose}>
        <Pressable
          onPress={(e) => e.stopPropagation()}
          style={{
            marginTop: 'auto',
            backgroundColor: tokens.colors.white,
            borderTopLeftRadius: tokens.radius.lg,
            borderTopRightRadius: tokens.radius.lg,
            maxHeight: '88%',
            width: '100%',
            maxWidth: tokens.maxContentWidth,
            alignSelf: 'center',
          }}
        >
          <ScrollView contentContainerStyle={{ padding: tokens.spacing.lg, gap: tokens.spacing.lg }}>
            <AppText variant="h2">{t('catalog.filters')}</AppText>

            <View style={{ gap: tokens.spacing.sm }}>
              <AppText variant="small" color={tokens.colors.gray500}>
                {t('owner.courtSport')}
              </AppText>
              <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: tokens.spacing.sm }}>
                <Chip
                  label={t('catalog.anySport')}
                  selected={draft.sport === undefined}
                  onPress={() => patch({ sport: undefined })}
                />
                {SPORTS.map((s) => (
                  <Chip key={s} label={t(`sport.${s}`)} selected={draft.sport === s} onPress={() => patch({ sport: s })} />
                ))}
              </View>
            </View>

            <Select
              label={t('owner.venueDistrict')}
              value={draft.district ?? null}
              onChange={(v) => patch({ district: v ?? undefined })}
              options={[
                { value: null, label: t('catalog.anyDistrict') },
                ...DISTRICTS.map((d) => ({ value: d, label: t(`district.${d}`) })),
              ]}
            />

            <Input
              label={t('catalog.priceUpTo')}
              value={draft.priceMaxSom?.toString() ?? ''}
              onChangeText={(v) => {
                const n = parseInt(v.replace(/\D/g, ''), 10);
                patch({ priceMaxSom: Number.isFinite(n) && n > 0 ? n : undefined });
              }}
              keyboardType="number-pad"
              placeholder="500 000"
            />

            <Toggle label={t('catalog.indoorOnly')} value={draft.indoor ?? false} onChange={(v) => patch({ indoor: v || undefined })} />

            <View style={{ gap: tokens.spacing.sm }}>
              <AppText variant="small" color={tokens.colors.gray500}>
                {t('catalog.freeAt')}
              </AppText>
              <View style={{ flexDirection: 'row', gap: tokens.spacing.md }}>
                <View style={{ flex: 1 }}>
                  <Select
                    value={draft.date ?? null}
                    onChange={(v) => patch({ date: v ?? undefined, hour: v ? draft.hour : undefined })}
                    options={dateOptions}
                    placeholder={t('catalog.date')}
                  />
                </View>
                <View style={{ flex: 1 }}>
                  <Select
                    value={draft.hour ?? null}
                    onChange={(v) => patch({ hour: v ?? undefined })}
                    options={hourOptions}
                    placeholder={t('catalog.hour')}
                  />
                </View>
              </View>
            </View>

            <View style={{ gap: tokens.spacing.sm }}>
              <AppText variant="small" color={tokens.colors.gray500}>
                {t('catalog.sort')}
              </AppText>
              <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: tokens.spacing.sm }}>
                {(['default', 'price', 'distance'] as const).map((s) => (
                  <Chip
                    key={s}
                    label={t(
                      s === 'default' ? 'catalog.sortDefault' : s === 'price' ? 'catalog.sortPrice' : 'catalog.sortDistance'
                    )}
                    selected={draft.sort === s}
                    onPress={() => patch({ sort: s })}
                  />
                ))}
              </View>
            </View>

            <View style={{ flexDirection: 'row', gap: tokens.spacing.md }}>
              <View style={{ flex: 1 }}>
                <Button title={t('catalog.reset')} variant="secondary" onPress={() => setDraft({ sort: 'default' })} />
              </View>
              <View style={{ flex: 1 }}>
                <Button
                  title={t('catalog.apply')}
                  onPress={() => {
                    onApply(draft);
                    onClose();
                  }}
                />
              </View>
            </View>
          </ScrollView>
        </Pressable>
      </Pressable>
    </Modal>
  );
}
