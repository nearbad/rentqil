import React from 'react';
import { Pressable, View } from 'react-native';
import { useRouter } from 'expo-router';
import type { BookingStatus, BookingView } from '@rentqil/shared';
import { tokens } from '@rentqil/shared';
import { useI18n } from '@/lib/i18n';
import { useSports } from '@/lib/sports';
import { hourRange, money, shortDate } from '@/lib/format';
import { AppText } from '@/ui/AppText';
import { Badge, Divider, KeyValue } from '@/ui/bits';

export function statusTone(status: BookingStatus): 'neutral' | 'success' | 'danger' {
  switch (status) {
    case 'confirmed':
      return 'success';
    case 'cancelled_by_user':
    case 'cancelled_by_owner':
    case 'expired':
      return 'danger';
    default:
      return 'neutral';
  }
}

export function StatusBadge({ status }: { status: BookingStatus }) {
  const { t } = useI18n();
  return <Badge text={t(`status.${status}`)} tone={statusTone(status)} />;
}

export function BookingCard({ booking }: { booking: BookingView }) {
  const { t, locale } = useI18n();
  const { sportName } = useSports();
  const router = useRouter();

  return (
    <Pressable
      onPress={() => router.push(`/booking/${booking.id}`)}
      style={({ pressed }) => ({
        borderWidth: 1,
        borderColor: tokens.colors.gray150,
        borderRadius: tokens.radius.md,
        padding: tokens.spacing.lg,
        gap: tokens.spacing.sm,
        opacity: pressed ? 0.85 : 1,
        backgroundColor: tokens.colors.white,
      })}
    >
      <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', gap: tokens.spacing.sm }}>
        <AppText variant="h3" style={{ flex: 1 }} numberOfLines={1}>
          {booking.venueName}
        </AppText>
        <StatusBadge status={booking.status} />
      </View>
      <AppText variant="small" color={tokens.colors.gray500}>
        {booking.courtName} · {sportName(booking.sport)}
      </AppText>
      <View style={{ flexDirection: 'row', justifyContent: 'space-between' }}>
        <AppText variant="small" weight="medium">
          {shortDate(booking.date, locale)} · {hourRange(booking.startHour, booking.endHour)}
        </AppText>
        <AppText variant="small" weight="semibold">
          {money(booking.payNowTiyin, locale)}
        </AppText>
      </View>
      {booking.isSplit ? (
        <AppText variant="tiny" color={tokens.colors.gray500}>
          {t('bookings.splitProgress', {
            paid: booking.participants.filter((p) => p.status === 'paid').length,
            total: booking.participants.length,
          })}
        </AppText>
      ) : null}
    </Pressable>
  );
}

export function PriceBreakdown({ booking }: { booking: BookingView }) {
  const { t, locale } = useI18n();
  return (
    <View style={{ gap: tokens.spacing.sm }}>
      <KeyValue label={t('book.total')} value={money(booking.totalTiyin, locale)} />
      <KeyValue
        label={t('book.deposit', { percent: Math.round((booking.depositTiyin / booking.totalTiyin) * 100) || 0 })}
        value={money(booking.depositTiyin, locale)}
      />
      {booking.serviceFeeTiyin > 0 ? (
        <KeyValue label={t('book.serviceFee')} value={money(booking.serviceFeeTiyin, locale)} />
      ) : null}
      <Divider />
      <KeyValue label={t('book.payNow')} value={money(booking.payNowTiyin, locale)} strong />
      <KeyValue label={t('book.payAtVenue')} value={money(booking.totalTiyin - booking.depositTiyin, locale)} />
    </View>
  );
}
