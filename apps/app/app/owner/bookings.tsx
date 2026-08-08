import React, { useCallback, useEffect, useState } from 'react';
import { ScrollView, View } from 'react-native';
import type { OwnerBookingView } from '@rentqil/shared';
import { tokens } from '@rentqil/shared';
import { api } from '@/lib/api';
import { useI18n } from '@/lib/i18n';
import { useRequireRole } from '@/lib/guards';
import { addDaysYmd, hourRange, money, shortDate, todayYmd } from '@/lib/format';
import { Screen } from '@/ui/Screen';
import { AppText } from '@/ui/AppText';
import { Button } from '@/ui/Button';
import { Card, Chip, EmptyState, Loading } from '@/ui/bits';
import { StatusBadge } from '@/components/BookingBits';

export default function OwnerBookingsScreen() {
  const { t, locale } = useI18n();
  const { ready } = useRequireRole('owner', 'admin');

  const [date, setDate] = useState(todayYmd());
  const [items, setItems] = useState<OwnerBookingView[] | null>(null);
  const [cancelId, setCancelId] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  const load = useCallback(() => {
    setItems(null);
    api<{ items: OwnerBookingView[] }>(`/owner/bookings?date=${date}`)
      .then((r) => setItems(r.items))
      .catch(() => setItems([]));
  }, [date]);

  useEffect(() => {
    if (ready) load();
  }, [ready, load]);

  const cancel = async (id: string) => {
    setBusy(true);
    try {
      await api(`/owner/bookings/${id}/cancel`, { method: 'POST' });
      setCancelId(null);
      load();
    } finally {
      setBusy(false);
    }
  };

  const toggleNoShow = async (booking: OwnerBookingView) => {
    await api(`/owner/bookings/${booking.id}/no-show`, {
      method: 'POST',
      body: { noShow: !booking.noShow },
    });
    load();
  };

  if (!ready) return <Screen title={t('owner.bookings')} back>{null}</Screen>;

  return (
    <Screen title={t('owner.bookings')} back>
      <View style={{ gap: tokens.spacing.md }}>
        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: tokens.spacing.sm }}>
          {Array.from({ length: 10 }, (_, i) => addDaysYmd(todayYmd(), i - 2)).map((d) => (
            <Chip key={d} label={shortDate(d, locale)} selected={d === date} onPress={() => setDate(d)} />
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
                  <AppText weight="semibold">
                    {hourRange(b.startHour, b.endHour)} · {b.courtName}
                  </AppText>
                  <StatusBadge status={b.status} />
                </View>
                <AppText variant="small" color={tokens.colors.gray500}>
                  {b.venueName}
                </AppText>
                <View style={{ flexDirection: 'row', justifyContent: 'space-between' }}>
                  <AppText variant="small">
                    {b.creatorName ?? '-'} · {b.creatorPhone}
                  </AppText>
                  <AppText variant="small" weight="semibold">
                    {money(b.depositTiyin, locale)}
                  </AppText>
                </View>
                {b.isSplit ? (
                  <AppText variant="tiny" color={tokens.colors.gray500}>
                    {t('bookings.splitProgress', {
                      paid: b.participants.filter((p) => p.status === 'paid').length,
                      total: b.participants.length,
                    })}
                  </AppText>
                ) : null}

                {b.status === 'confirmed' || b.status === 'pending_payment' ? (
                  cancelId === b.id ? (
                    <View style={{ gap: tokens.spacing.sm }}>
                      <AppText variant="small" color={tokens.colors.danger}>
                        {t('owner.cancelWarning')}
                      </AppText>
                      <View style={{ flexDirection: 'row', gap: tokens.spacing.sm }}>
                        <View style={{ flex: 1 }}>
                          <Button title={t('bookings.keep')} variant="secondary" small onPress={() => setCancelId(null)} />
                        </View>
                        <View style={{ flex: 1 }}>
                          <Button
                            title={t('bookings.confirmCancel')}
                            variant="danger"
                            small
                            loading={busy}
                            onPress={() => cancel(b.id)}
                          />
                        </View>
                      </View>
                    </View>
                  ) : (
                    <Button title={t('owner.cancelBooking')} variant="danger" small onPress={() => setCancelId(b.id)} />
                  )
                ) : null}

                {b.status === 'completed' ? (
                  <Button
                    title={b.noShow ? t('owner.unmarkNoShow') : t('owner.markNoShow')}
                    variant="secondary"
                    small
                    onPress={() => toggleNoShow(b)}
                  />
                ) : null}
              </Card>
            ))}
          </View>
        )}
      </View>
    </Screen>
  );
}
