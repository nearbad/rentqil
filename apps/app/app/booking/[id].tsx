import React, { useCallback, useEffect, useState } from 'react';
import { Linking, View } from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import type { BookingView, PaymentProviderId } from '@rentqil/shared';
import { tokens } from '@rentqil/shared';
import { api, ApiError } from '@/lib/api';
import { useAuth } from '@/lib/auth';
import { useI18n } from '@/lib/i18n';
import { useSports } from '@/lib/sports';
import { hourRange, minutesLeft, shortDate } from '@/lib/format';
import { Screen } from '@/ui/Screen';
import { AppText } from '@/ui/AppText';
import { Button } from '@/ui/Button';
import { Card, ErrorBox, Loading } from '@/ui/bits';
import { ProviderSelect } from '@/components/ProviderSelect';
import { PriceBreakdown, StatusBadge } from '@/components/BookingBits';
import { SplitSection } from '@/components/SplitSection';
import { CancelSection } from '@/components/CancelSection';

export default function BookingScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const { t, locale } = useI18n();
  const { sportName } = useSports();
  const { me } = useAuth();
  const router = useRouter();

  const [booking, setBooking] = useState<BookingView | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [provider, setProvider] = useState<PaymentProviderId>('click');
  const [busy, setBusy] = useState(false);

  const load = useCallback(async () => {
    if (!id) return;
    try {
      setBooking(await api<BookingView>(`/bookings/${id}`));
    } catch (e) {
      setError(t(e instanceof ApiError ? (`error.${e.code}` as never) : 'error.UNKNOWN'));
    }
  }, [id, t]);

  useEffect(() => {
    if (!me) {
      router.replace(`/login?next=${encodeURIComponent(`/booking/${id}`)}`);
      return;
    }
    load();
  }, [me, load, router, id]);

  // pending bookings tick down, refresh the state now and then
  useEffect(() => {
    if (booking?.status !== 'pending_payment') return;
    const timer = setInterval(load, 15_000);
    return () => clearInterval(timer);
  }, [booking?.status, load]);

  const payRemaining = async () => {
    if (!booking) return;
    setBusy(true);
    try {
      const myShare = booking.isSplit
        ? booking.participants.find((p) => p.isCreator && p.status === 'pending')
        : undefined;
      const init = await api<{ paymentId: string }>('/payments/init', {
        method: 'POST',
        body: {
          bookingId: booking.id,
          ...(myShare ? { participantId: myShare.id } : {}),
          provider,
        },
      });
      router.push(`/pay/${init.paymentId}`);
    } catch (e) {
      setError(t(e instanceof ApiError ? (`error.${e.code}` as never) : 'error.UNKNOWN'));
    } finally {
      setBusy(false);
    }
  };

  if (error && !booking) {
    return (
      <Screen title={t('bookings.title')} back>
        <ErrorBox message={error} />
      </Screen>
    );
  }
  if (!booking) {
    return (
      <Screen title={t('bookings.title')} back>
        <Loading />
      </Screen>
    );
  }

  const pending = booking.status === 'pending_payment';
  const myPendingShare = booking.participants.find((p) => p.isCreator && p.status === 'pending');
  const needsMyPayment = pending && booking.isCreator && (!booking.isSplit || myPendingShare !== undefined);

  return (
    <Screen title={booking.venueName} back>
      <View style={{ gap: tokens.spacing.lg }}>
        {error ? <ErrorBox message={error} /> : null}

        <Card style={{ gap: tokens.spacing.sm }}>
          <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
            <AppText variant="h3">{booking.courtName}</AppText>
            <StatusBadge status={booking.status} />
          </View>
          <AppText variant="small" color={tokens.colors.gray500}>
            {sportName(booking.sport)} · {booking.venueAddress}
          </AppText>
          <AppText weight="medium">
            {shortDate(booking.date, locale)} · {hourRange(booking.startHour, booking.endHour)}
          </AppText>
          {pending && booking.expiresAt ? (
            <AppText variant="small" color={tokens.colors.danger}>
              {t('split.timeLeft', { min: minutesLeft(booking.expiresAt) })}
            </AppText>
          ) : null}
        </Card>

        <Card>
          <PriceBreakdown booking={booking} />
        </Card>

        {booking.isSplit ? <SplitSection booking={booking} onChanged={load} /> : null}

        {needsMyPayment ? (
          <View style={{ gap: tokens.spacing.sm }}>
            <AppText variant="h3">{t('book.paymentMethod')}</AppText>
            <ProviderSelect value={provider} onChange={setProvider} />
            <Button title={t('bookings.payRemaining')} onPress={payRemaining} loading={busy} />
          </View>
        ) : null}

        {booking.status === 'completed' || booking.status === 'confirmed' ? (
          <Button
            title={t('bookings.repeat')}
            variant="secondary"
            onPress={() => router.push(`/venue/${booking.venueId}`)}
          />
        ) : null}

        {booking.isCreator ? <CancelSection booking={booking} onCancelled={load} /> : null}

        <Button
          title={t('bookings.help')}
          variant="ghost"
          small
          onPress={() =>
            Linking.openURL(
              `mailto:support@rentqil.com?subject=${encodeURIComponent(`rentqil booking ${booking.id}`)}&body=${encodeURIComponent(
                `${booking.venueName} · ${booking.date} ${hourRange(booking.startHour, booking.endHour)}\n\n`
              )}`
            )
          }
        />
      </View>
    </Screen>
  );
}
