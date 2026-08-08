import React from 'react';
import { useRouter } from 'expo-router';
import { tokens } from '@rentqil/shared';
import { View } from 'react-native';
import { useAuth } from '@/lib/auth';
import { useI18n } from '@/lib/i18n';
import { Screen } from '@/ui/Screen';
import { AppText } from '@/ui/AppText';
import { Button } from '@/ui/Button';
import { EmptyState } from '@/ui/bits';

export function MyBookingsScreen() {
  const { t } = useI18n();
  const { me } = useAuth();
  const router = useRouter();

  if (!me) {
    return (
      <Screen title={t('bookings.title')}>
        <View style={{ gap: tokens.spacing.lg, paddingTop: tokens.spacing.xl }}>
          <AppText color={tokens.colors.gray500}>{t('auth.loginRequired')}</AppText>
          <Button title={t('auth.title')} onPress={() => router.push('/login')} />
        </View>
      </Screen>
    );
  }

  return (
    <Screen title={t('bookings.title')}>
      <EmptyState title={t('bookings.empty')} hint={t('bookings.emptyHint')} />
    </Screen>
  );
}
