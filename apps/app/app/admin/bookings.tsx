import React, { useCallback, useEffect, useState } from 'react';
import { ScrollView, View } from 'react-native';
import type { AdminPaymentRowView, OwnerBookingView } from '@rentqil/shared';
import { BOOKING_STATUSES, PAYMENT_PROVIDERS, tokens } from '@rentqil/shared';
import { api } from '@/lib/api';
import { useI18n } from '@/lib/i18n';
import { useRequireRole } from '@/lib/guards';
import { hourRange, money, shortDate } from '@/lib/format';
import { Screen } from '@/ui/Screen';
import { AppText } from '@/ui/AppText';
import { Button } from '@/ui/Button';
import { Input } from '@/ui/Input';
import { Card, Chip, EmptyState, Loading } from '@/ui/bits';
import { StatusBadge } from '@/components/BookingBits';

function PaymentsBlock({ bookingId }: { bookingId: string }) {
  const { t, locale } = useI18n();
  const [items, setItems] = useState<AdminPaymentRowView[] | null>(null);
  const [confirmId, setConfirmId] = useState<string | null>(null);

  const load = useCallback(() => {
    api<{ items: AdminPaymentRowView[] }>(`/admin/bookings/${bookingId}/payments`)
      .then((r) => setItems(r.items))
      .catch(() => setItems([]));
  }, [bookingId]);

  useEffect(load, [load]);

  const refund = async (id: string) => {
    await api(`/admin/payments/${id}/refund`, { method: 'POST', body: {} });
    setConfirmId(null);
    load();
  };

  if (items === null) return <Loading />;

  return (
    <View style={{ gap: tokens.spacing.sm }}>
      {items.map((p) => {
        const brand = PAYMENT_PROVIDERS.find((x) => x.id === p.provider)?.label ?? p.provider;
        return (
          <View key={p.id} style={{ gap: tokens.spacing.xs }}>
            <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
              <AppText variant="tiny" color={tokens.colors.gray500} style={{ flex: 1 }}>
                {p.createdAt.slice(5, 16).replace('T', ' ')} · {brand} · {p.type} · {p.status}
                {p.payerEmail ? ` · ${p.payerEmail}` : ''}
              </AppText>
              <AppText variant="small" weight="semibold">
                {p.type === 'refund' ? '-' : ''}
                {money(p.amountTiyin, locale)}
              </AppText>
            </View>
            {p.status === 'paid' && p.type !== 'refund' ? (
              confirmId === p.id ? (
                <View style={{ flexDirection: 'row', gap: tokens.spacing.sm }}>
                  <View style={{ flex: 1 }}>
                    <Button title={t('common.cancel')} variant="secondary" small onPress={() => setConfirmId(null)} />
                  </View>
                  <View style={{ flex: 1 }}>
                    <Button title={t('admin.refundConfirm')} variant="danger" small onPress={() => refund(p.id)} />
                  </View>
                </View>
              ) : (
                <Button title={t('admin.refund')} variant="danger" small onPress={() => setConfirmId(p.id)} />
              )
            ) : null}
          </View>
        );
      })}
    </View>
  );
}

export default function AdminBookingsScreen() {
  const { t, locale } = useI18n();
  const { ready } = useRequireRole('admin');
  const [phone, setPhone] = useState('');
  const [status, setStatus] = useState<string | null>(null);
  const [items, setItems] = useState<OwnerBookingView[] | null>(null);
  const [openId, setOpenId] = useState<string | null>(null);

  const load = useCallback(() => {
    const params = new URLSearchParams();
    if (phone.trim()) params.set('phone', phone.trim());
    if (status) params.set('status', status);
    const qs = params.toString();
    api<{ items: OwnerBookingView[] }>(`/admin/bookings${qs ? `?${qs}` : ''}`)
      .then((r) => setItems(r.items))
      .catch(() => setItems([]));
  }, [phone, status]);

  useEffect(() => {
    if (!ready) return;
    const timer = setTimeout(load, 250);
    return () => clearTimeout(timer);
  }, [ready, load]);

  if (!ready) return <Screen title={t('admin.bookings')} back>{null}</Screen>;

  return (
    <Screen title={t('admin.bookings')} back>
      <View style={{ gap: tokens.spacing.md }}>
        <Input value={phone} onChangeText={setPhone} placeholder={t('admin.userSearch')} autoCapitalize="none" />
        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: tokens.spacing.sm }}>
          <Chip label={t('common.all')} selected={status === null} onPress={() => setStatus(null)} />
          {BOOKING_STATUSES.map((s) => (
            <Chip key={s} label={t(`status.${s}`)} selected={status === s} onPress={() => setStatus(s)} />
          ))}
        </ScrollView>

        {items === null ? (
          <Loading />
        ) : items.length === 0 ? (
          <EmptyState title={t('owner.bookingsEmpty')} />
        ) : (
          <View style={{ gap: tokens.spacing.md }}>
            {items.map((b) => (
              <Card key={b.id} style={{ gap: tokens.spacing.sm }}>
                <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
                  <AppText weight="semibold" style={{ flex: 1 }} numberOfLines={1}>
                    {b.venueName} · {b.courtName}
                  </AppText>
                  <StatusBadge status={b.status} />
                </View>
                <AppText variant="small" color={tokens.colors.gray500}>
                  {shortDate(b.date, locale)} · {hourRange(b.startHour, b.endHour)} · {b.contactPhone || b.creatorEmail || '-'}
                </AppText>
                <View style={{ flexDirection: 'row', justifyContent: 'space-between' }}>
                  <AppText variant="small">{money(b.payNowTiyin, locale)}</AppText>
                  <AppText
                    variant="small"
                    color={tokens.colors.gray500}
                    onPress={() => setOpenId(openId === b.id ? null : b.id)}
                  >
                    {t('admin.payments')} {openId === b.id ? '▴' : '▾'}
                  </AppText>
                </View>
                {openId === b.id ? <PaymentsBlock bookingId={b.id} /> : null}
              </Card>
            ))}
          </View>
        )}
      </View>
    </Screen>
  );
}
