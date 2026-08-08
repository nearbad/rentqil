import React, { useCallback, useEffect, useState } from 'react';
import { View } from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import type { PaymentPublicView } from '@rentqil/shared';
import { PAYMENT_PROVIDERS, tokens } from '@rentqil/shared';
import { api } from '@/lib/api';
import { useI18n } from '@/lib/i18n';
import { money } from '@/lib/format';
import { Screen } from '@/ui/Screen';
import { AppText } from '@/ui/AppText';
import { Button } from '@/ui/Button';
import { Card, ErrorBox, Loading } from '@/ui/bits';

type PayView = PaymentPublicView & { splitToken: string | null; isShare: boolean };

// emulator page of the mock psp: real integrations will redirect to the
// provider checkout instead of here

export default function PayScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const { t, locale } = useI18n();
  const router = useRouter();

  const [payment, setPayment] = useState<PayView | null>(null);
  const [busy, setBusy] = useState(false);
  const [failed, setFailed] = useState(false);

  const load = useCallback(async () => {
    if (!id) return;
    const view = await api<PayView>(`/payments/${id}/public`);
    setPayment(view);
  }, [id]);

  useEffect(() => {
    load().catch(() => setFailed(true));
  }, [load]);

  const finish = useCallback(
    (view: PayView) => {
      if (view.isShare && view.splitToken) {
        router.replace(`/s/${view.splitToken}`);
      } else {
        router.replace(`/booking/${view.bookingId}`);
      }
    },
    [router]
  );

  const simulate = async (outcome: 'paid' | 'failed') => {
    if (!payment) return;
    setBusy(true);
    try {
      await api(`/payments/mock/${payment.id}/simulate`, { method: 'POST', body: { outcome } });
      // give the webhook a moment, then read the final state
      for (let i = 0; i < 10; i++) {
        await new Promise((r) => setTimeout(r, 400));
        const view = await api<PayView>(`/payments/${payment.id}/public`);
        if (view.status !== 'created') {
          setPayment(view);
          if (view.status === 'paid' || view.status === 'refunded') {
            finish(view);
            return;
          }
          break;
        }
      }
    } finally {
      setBusy(false);
    }
  };

  if (failed) {
    return (
      <Screen title={t('pay.title')} back>
        <ErrorBox message={t('error.NOT_FOUND')} />
      </Screen>
    );
  }
  if (!payment) {
    return (
      <Screen title={t('pay.title')} back>
        <Loading />
      </Screen>
    );
  }

  const brand = PAYMENT_PROVIDERS.find((p) => p.id === payment.provider)?.label ?? payment.provider;
  const settled = payment.status !== 'created';

  return (
    <Screen title={t('pay.title')} back>
      <View style={{ gap: tokens.spacing.lg, paddingTop: tokens.spacing.lg }}>
        <Card style={{ gap: tokens.spacing.md, alignItems: 'center', paddingVertical: tokens.spacing.xxl }}>
          <AppText variant="h2">{brand}</AppText>
          <AppText variant="small" color={tokens.colors.gray500} center>
            {payment.description}
          </AppText>
          <AppText variant="h1">{money(payment.amountTiyin, locale)}</AppText>

          {settled ? (
            <AppText
              weight="semibold"
              color={payment.status === 'failed' ? tokens.colors.danger : tokens.colors.success}
            >
              {payment.status === 'failed' ? t('pay.failed') : t('pay.success')}
            </AppText>
          ) : (
            <View style={{ gap: tokens.spacing.sm, alignSelf: 'stretch' }}>
              <Button title={t('pay.pay')} onPress={() => simulate('paid')} loading={busy} />
              <Button title={t('pay.decline')} onPress={() => simulate('failed')} variant="danger" disabled={busy} />
            </View>
          )}

          {settled ? (
            <Button title={t('pay.toBooking')} variant="secondary" onPress={() => finish(payment)} />
          ) : null}
        </Card>

        <AppText variant="tiny" color={tokens.colors.gray300} center>
          {t('pay.mockNote')}
        </AppText>
      </View>
    </Screen>
  );
}
