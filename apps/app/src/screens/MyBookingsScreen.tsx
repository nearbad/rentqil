import React, { useCallback, useEffect, useState } from 'react';
import { View } from 'react-native';
import { useRouter } from 'expo-router';
import { useFocusEffect } from 'expo-router';
import type { BookingView } from '@rentqil/shared';
import { tokens } from '@rentqil/shared';
import { api } from '@/lib/api';
import { useAuth } from '@/lib/auth';
import { useI18n } from '@/lib/i18n';
import { Screen } from '@/ui/Screen';
import { AppText } from '@/ui/AppText';
import { Button } from '@/ui/Button';
import { Chip, EmptyState, Loading } from '@/ui/bits';
import { BookingCard } from '@/components/BookingBits';

export function MyBookingsScreen() {
  const { t } = useI18n();
  const { me } = useAuth();
  const router = useRouter();

  const [tab, setTab] = useState<'active' | 'past'>('active');
  const [data, setData] = useState<{ active: BookingView[]; past: BookingView[] } | null>(null);

  const load = useCallback(() => {
    if (!me) return;
    api<{ active: BookingView[]; past: BookingView[] }>('/bookings/my')
      .then(setData)
      .catch(() => setData({ active: [], past: [] }));
  }, [me]);

  useFocusEffect(
    useCallback(() => {
      load();
    }, [load])
  );

  useEffect(load, [load]);

  if (!me) {
    return (
      <Screen>
        <View style={{ gap: tokens.spacing.lg, paddingTop: tokens.spacing.xl }}>
          <AppText color={tokens.colors.gray500}>{t('auth.loginRequired')}</AppText>
          <Button title={t('auth.title')} onPress={() => router.push('/login')} />
        </View>
      </Screen>
    );
  }

  const list = data ? data[tab] : null;

  return (
    <Screen>
      <View style={{ gap: tokens.spacing.md, paddingTop: tokens.spacing.md }}>
        <View style={{ flexDirection: 'row', gap: tokens.spacing.sm }}>
          <Chip label={t('bookings.active')} selected={tab === 'active'} onPress={() => setTab('active')} />
          <Chip label={t('bookings.past')} selected={tab === 'past'} onPress={() => setTab('past')} />
        </View>

        {list === null ? (
          <Loading />
        ) : list.length === 0 ? (
          <EmptyState title={t('bookings.empty')} hint={tab === 'active' ? t('bookings.emptyHint') : undefined} />
        ) : (
          <View style={{ gap: tokens.spacing.md }}>
            {list.map((b) => (
              <BookingCard key={b.id} booking={b} />
            ))}
          </View>
        )}
      </View>
    </Screen>
  );
}
