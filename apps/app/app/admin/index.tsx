import React, { useEffect, useState } from 'react';
import { Pressable, View } from 'react-native';
import { useRouter } from 'expo-router';
import { ChevronRight } from 'lucide-react-native';
import type { AdminDashboardView } from '@rentqil/shared';
import { tokens } from '@rentqil/shared';
import { api } from '@/lib/api';
import { useI18n } from '@/lib/i18n';
import { useRequireRole } from '@/lib/guards';
import { money } from '@/lib/format';
import { Screen } from '@/ui/Screen';
import { AppText } from '@/ui/AppText';
import { Card, KeyValue, Loading } from '@/ui/bits';

const SECTIONS = [
  { path: '/admin/moderation', key: 'admin.moderation' },
  { path: '/admin/users', key: 'admin.users' },
  { path: '/admin/bookings', key: 'admin.bookings' },
  { path: '/admin/sports', key: 'admin.sports' },
  { path: '/admin/payouts', key: 'admin.payouts' },
  { path: '/admin/config', key: 'admin.config' },
] as const;

export default function AdminHome() {
  const { t, locale } = useI18n();
  const router = useRouter();
  const { ready } = useRequireRole('admin');
  const [dash, setDash] = useState<AdminDashboardView | null>(null);

  useEffect(() => {
    if (!ready) return;
    api<AdminDashboardView>('/admin/dashboard').then(setDash).catch(() => {});
  }, [ready]);

  if (!ready) return <Screen title={t('admin.title')} back>{null}</Screen>;

  return (
    <Screen title={t('admin.title')} back>
      <View style={{ gap: tokens.spacing.lg }}>
        {dash === null ? (
          <Loading />
        ) : (
          <Card style={{ gap: tokens.spacing.sm }}>
            <KeyValue label={t('admin.bookingsToday')} value={String(dash.bookingsToday)} />
            <KeyValue label={t('admin.bookingsWeek')} value={String(dash.bookingsWeek)} />
            <KeyValue label={t('admin.gmvWeek')} value={money(dash.gmvWeekTiyin, locale)} />
            <KeyValue label={t('admin.feesWeek')} value={money(dash.serviceFeesWeekTiyin, locale)} />
          </Card>
        )}

        {dash && dash.topVenues.length > 0 ? (
          <Card style={{ gap: tokens.spacing.sm }}>
            <AppText variant="h3">{t('admin.topVenues')}</AppText>
            {dash.topVenues.map((v) => (
              <View key={v.venueId} style={{ flexDirection: 'row', justifyContent: 'space-between' }}>
                <AppText variant="small">{v.name}</AppText>
                <AppText variant="small" color={tokens.colors.gray500}>
                  {v.bookings} · {money(v.gmvTiyin, locale)}
                </AppText>
              </View>
            ))}
          </Card>
        ) : null}

        <View style={{ gap: tokens.spacing.sm }}>
          {SECTIONS.map((s) => (
            <Pressable
              key={s.path}
              onPress={() => router.push(s.path as never)}
              style={{
                flexDirection: 'row',
                alignItems: 'center',
                borderWidth: 1,
                borderColor: tokens.colors.gray150,
                borderRadius: tokens.radius.md,
                padding: tokens.spacing.lg,
              }}
            >
              <AppText weight="medium" style={{ flex: 1 }}>
                {t(s.key)}
              </AppText>
              <ChevronRight size={18} color={tokens.colors.gray300} strokeWidth={1.6} />
            </Pressable>
          ))}
        </View>
      </View>
    </Screen>
  );
}
