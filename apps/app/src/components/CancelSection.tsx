import React, { useState } from 'react';
import { View } from 'react-native';
import type { BookingView, CancelQuoteView } from '@rentqil/shared';
import { tokens } from '@rentqil/shared';
import { api, ApiError } from '@/lib/api';
import { useI18n } from '@/lib/i18n';
import { money } from '@/lib/format';
import { AppText } from '@/ui/AppText';
import { Button } from '@/ui/Button';
import { Card, ErrorBox, KeyValue } from '@/ui/bits';

function startInFuture(booking: BookingView): boolean {
  const [y, m, d] = booking.date.split('-').map(Number);
  const start = new Date(y ?? 1970, (m ?? 1) - 1, d ?? 1, booking.startHour);
  return start.getTime() > Date.now();
}

export function CancelSection({ booking, onCancelled }: { booking: BookingView; onCancelled: () => void }) {
  const { t, locale } = useI18n();
  const [quote, setQuote] = useState<CancelQuoteView | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const cancellable =
    (booking.status === 'confirmed' || booking.status === 'pending_payment') && startInFuture(booking);
  if (!cancellable) return null;

  const askQuote = async () => {
    setBusy(true);
    setError(null);
    try {
      setQuote(await api<CancelQuoteView>(`/bookings/${booking.id}/cancel-quote`));
    } catch (e) {
      setError(t(e instanceof ApiError ? (`error.${e.code}` as never) : 'error.UNKNOWN'));
    } finally {
      setBusy(false);
    }
  };

  const confirm = async () => {
    setBusy(true);
    setError(null);
    try {
      await api(`/bookings/${booking.id}/cancel`, { method: 'POST' });
      setQuote(null);
      onCancelled();
    } catch (e) {
      setError(t(e instanceof ApiError ? (`error.${e.code}` as never) : 'error.UNKNOWN'));
    } finally {
      setBusy(false);
    }
  };

  const reasonText = (reason: CancelQuoteView['reason']) => {
    switch (reason) {
      case 'free_window':
        return t('bookings.freeWindow');
      case 'late':
        return t('bookings.lateWindow');
      case 'no_refund':
        return t('bookings.noRefund');
      default:
        return null;
    }
  };

  if (!quote) {
    return (
      <View style={{ gap: tokens.spacing.sm }}>
        {error ? <ErrorBox message={error} /> : null}
        <Button title={t('bookings.cancel')} variant="danger" onPress={askQuote} loading={busy} />
      </View>
    );
  }

  const reason = reasonText(quote.reason);

  return (
    <Card style={{ gap: tokens.spacing.md, borderColor: tokens.colors.danger }}>
      <AppText variant="h3">{t('bookings.cancelTitle')}</AppText>
      {error ? <ErrorBox message={error} /> : null}
      {reason ? (
        <AppText variant="small" color={quote.refundTiyin > 0 ? tokens.colors.success : tokens.colors.danger}>
          {reason}
        </AppText>
      ) : null}
      <KeyValue label={t('bookings.paidAmount')} value={money(quote.paidTiyin, locale)} />
      <KeyValue label={t('bookings.refundAmount')} value={money(quote.refundTiyin, locale)} strong />
      <View style={{ flexDirection: 'row', gap: tokens.spacing.sm }}>
        <View style={{ flex: 1 }}>
          <Button title={t('bookings.keep')} variant="secondary" small onPress={() => setQuote(null)} />
        </View>
        <View style={{ flex: 1 }}>
          <Button title={t('bookings.confirmCancel')} variant="danger" small onPress={confirm} loading={busy} />
        </View>
      </View>
    </Card>
  );
}
