import React, { useEffect, useMemo, useState } from 'react';
import { View } from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import type { BookingQuoteResponse, BookingView, PaymentProviderId } from '@rentqil/shared';
import { splitEven, tokens } from '@rentqil/shared';
import { api, ApiError } from '@/lib/api';
import { useAuth } from '@/lib/auth';
import { useI18n } from '@/lib/i18n';
import { hourRange, money, shortDate } from '@/lib/format';
import { Screen } from '@/ui/Screen';
import { AppText } from '@/ui/AppText';
import { Button } from '@/ui/Button';
import { Card, Divider, ErrorBox, KeyValue, Loading } from '@/ui/bits';
import { Stepper } from '@/ui/Stepper';
import { Toggle } from '@/ui/Toggle';
import { ProviderSelect } from '@/components/ProviderSelect';
import { PolicyBadgeView } from '@/components/PolicyBadgeView';

export default function BookScreen() {
  const params = useLocalSearchParams<{ courtId: string; date: string; start: string; end: string }>();
  const { t, locale } = useI18n();
  const { me } = useAuth();
  const router = useRouter();

  const [quote, setQuote] = useState<BookingQuoteResponse | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [split, setSplit] = useState(false);
  const [people, setPeople] = useState(4);
  const [provider, setProvider] = useState<PaymentProviderId>('click');
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    if (!params.courtId || !params.date) return;
    api<BookingQuoteResponse>(
      `/bookings/quote?courtId=${params.courtId}&date=${params.date}&start=${params.start}&end=${params.end}`
    )
      .then(setQuote)
      .catch((e) =>
        setError(t(e instanceof ApiError ? (`error.${e.code}` as never) : 'error.UNKNOWN'))
      );
  }, [params.courtId, params.date, params.start, params.end, t]);

  const perPerson = useMemo(() => {
    if (!quote || !split) return null;
    return splitEven(quote.payNowTiyin, people)[0] ?? null;
  }, [quote, split, people]);

  useEffect(() => {
    if (!me) {
      const next = `/book?courtId=${params.courtId}&date=${params.date}&start=${params.start}&end=${params.end}`;
      router.replace(`/login?next=${encodeURIComponent(next)}`);
    }
  }, [me, params, router]);

  const submit = async () => {
    if (!quote) return;
    setBusy(true);
    setError(null);
    try {
      const booking = await api<BookingView>('/bookings', {
        method: 'POST',
        body: {
          courtId: params.courtId,
          date: params.date,
          startHour: Number(params.start),
          endHour: Number(params.end),
          ...(split ? { split: { participants: people } } : {}),
        },
      });
      const myShare = split ? booking.participants.find((p) => p.isCreator) : undefined;
      const init = await api<{ paymentId: string; payUrl: string }>('/payments/init', {
        method: 'POST',
        body: {
          bookingId: booking.id,
          ...(myShare ? { participantId: myShare.id } : {}),
          provider,
        },
      });
      router.replace(`/pay/${init.paymentId}`);
    } catch (e) {
      setError(t(e instanceof ApiError ? (`error.${e.code}` as never) : 'error.UNKNOWN'));
      setBusy(false);
    }
  };

  if (!quote) {
    return (
      <Screen title={t('book.title')} back>
        {error ? <ErrorBox message={error} /> : <Loading />}
      </Screen>
    );
  }

  return (
    <Screen title={t('book.title')} back>
      <View style={{ gap: tokens.spacing.lg }}>
        {error ? <ErrorBox message={error} /> : null}

        <Card style={{ gap: tokens.spacing.sm }}>
          <AppText variant="h3">{quote.venueName}</AppText>
          <AppText variant="small" color={tokens.colors.gray500}>
            {quote.courtName} · {t(`sport.${quote.sport}`)}
          </AppText>
          <AppText weight="medium">
            {shortDate(quote.date, locale)} · {hourRange(quote.startHour, quote.endHour)}
          </AppText>
          <PolicyBadgeView badge={quote.policyBadge} />
        </Card>

        <Card style={{ gap: tokens.spacing.sm }}>
          <KeyValue label={t('book.total')} value={money(quote.totalTiyin, locale)} />
          <KeyValue
            label={t('book.deposit', { percent: quote.depositPercent })}
            value={money(quote.depositTiyin, locale)}
          />
          {quote.serviceFeeTiyin > 0 ? (
            <KeyValue label={t('book.serviceFee')} value={money(quote.serviceFeeTiyin, locale)} />
          ) : null}
          <Divider />
          <KeyValue label={t('book.payNow')} value={money(quote.payNowTiyin, locale)} strong />
          <KeyValue label={t('book.payAtVenue')} value={money(quote.payAtVenueTiyin, locale)} />
        </Card>

        <Card style={{ gap: tokens.spacing.md }}>
          <Toggle label={t('book.split')} value={split} onChange={setSplit} />
          {split ? (
            <>
              <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}>
                <AppText variant="small" color={tokens.colors.gray500}>
                  {t('book.splitCount')}
                </AppText>
                <Stepper value={people} min={2} max={30} onChange={setPeople} />
              </View>
              {perPerson !== null ? (
                <KeyValue label={t('book.perPerson')} value={money(perPerson, locale)} strong />
              ) : null}
              <AppText variant="tiny" color={tokens.colors.gray500}>
                {t('book.splitHoldNote', { min: quote.splitHoldMinutes })}
              </AppText>
            </>
          ) : (
            <AppText variant="tiny" color={tokens.colors.gray500}>
              {t('book.holdNote', { min: quote.holdMinutes })}
            </AppText>
          )}
        </Card>

        <View style={{ gap: tokens.spacing.sm }}>
          <AppText variant="h3">{t('book.paymentMethod')}</AppText>
          <ProviderSelect value={provider} onChange={setProvider} />
        </View>

        <Button
          title={split && perPerson !== null ? `${t('book.cta')} · ${money(perPerson, locale)}` : `${t('book.cta')} · ${money(quote.payNowTiyin, locale)}`}
          onPress={submit}
          loading={busy}
        />
      </View>
    </Screen>
  );
}
