import React, { useEffect, useState } from 'react';
import { View } from 'react-native';
import type { OwnerStatsView } from '@rentqil/shared';
import { tokens } from '@rentqil/shared';
import { api } from '@/lib/api';
import { useI18n } from '@/lib/i18n';
import { useRequireRole } from '@/lib/guards';
import { money } from '@/lib/format';
import { Screen } from '@/ui/Screen';
import { AppText } from '@/ui/AppText';
import { Card, KeyValue, Loading } from '@/ui/bits';

// plain black bars, no chart libs
function BarRow({ label, value, max }: { label: string; value: number; max: number }) {
  return (
    <View style={{ flexDirection: 'row', alignItems: 'center', gap: tokens.spacing.sm }}>
      <AppText variant="tiny" color={tokens.colors.gray500} style={{ width: 42 }}>
        {label}
      </AppText>
      <View style={{ flex: 1, height: 14, backgroundColor: tokens.colors.gray50, borderRadius: 3 }}>
        <View
          style={{
            width: `${max > 0 ? Math.round((value / max) * 100) : 0}%`,
            height: '100%',
            backgroundColor: tokens.colors.text,
            borderRadius: 3,
          }}
        />
      </View>
      <AppText variant="tiny" style={{ width: 26, textAlign: 'right' }}>
        {value}
      </AppText>
    </View>
  );
}

export default function OwnerStatsScreen() {
  const { t, locale } = useI18n();
  const { ready } = useRequireRole('owner', 'admin');
  const [stats, setStats] = useState<OwnerStatsView | null>(null);

  useEffect(() => {
    if (!ready) return;
    api<OwnerStatsView>('/owner/stats').then(setStats).catch(() => {});
  }, [ready]);

  if (!ready || !stats) {
    return (
      <Screen title={t('owner.stats')} back>
        {ready ? <Loading /> : null}
      </Screen>
    );
  }

  const maxHour = Math.max(...stats.byHour.map((h) => h.bookings), 0);
  const noShowRate = stats.completedCount > 0 ? Math.round((stats.noShowCount / stats.completedCount) * 100) : 0;

  return (
    <Screen title={t('owner.stats')} back>
      <View style={{ gap: tokens.spacing.lg }}>
        <AppText variant="small" color={tokens.colors.gray500}>
          {t('owner.statsLast30')}
        </AppText>

        <Card style={{ gap: tokens.spacing.sm }}>
          <KeyValue label={t('owner.statsBookings')} value={String(stats.bookingsTotal)} />
          <KeyValue label={t('owner.statsRevenue')} value={money(stats.revenueTiyin, locale)} />
          <KeyValue label={t('owner.statsNoShow')} value={`${stats.noShowCount} (${noShowRate}%)`} />
        </Card>

        <Card style={{ gap: tokens.spacing.sm }}>
          <AppText variant="h3">{t('owner.statsByHour')}</AppText>
          {stats.byHour.length === 0 ? (
            <AppText variant="small" color={tokens.colors.gray500}>
              {t('owner.bookingsEmpty')}
            </AppText>
          ) : (
            stats.byHour.map((h) => (
              <BarRow key={h.hour} label={`${String(h.hour).padStart(2, '0')}:00`} value={h.bookings} max={maxHour} />
            ))
          )}
        </Card>

        <Card style={{ gap: tokens.spacing.sm }}>
          <AppText variant="h3">{t('owner.statsByDay')}</AppText>
          {stats.byDay.length === 0 ? (
            <AppText variant="small" color={tokens.colors.gray500}>
              {t('owner.bookingsEmpty')}
            </AppText>
          ) : (
            stats.byDay.map((d) => (
              <View key={d.date} style={{ flexDirection: 'row', justifyContent: 'space-between' }}>
                <AppText variant="small" color={tokens.colors.gray500}>
                  {d.date.slice(5).split('-').reverse().join('.')}
                </AppText>
                <AppText variant="small">
                  {d.bookings} · {money(d.revenueTiyin, locale)}
                </AppText>
              </View>
            ))
          )}
        </Card>
      </View>
    </Screen>
  );
}
