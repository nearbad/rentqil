import React, { useEffect, useMemo, useState } from 'react';
import { View } from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import type { BookingQuoteResponse, BookingView, PaymentProviderId } from '@rentqil/shared';
import { splitEven, tokens } from '@rentqil/shared';
import { api, ApiError } from '@/lib/api';
import { useAuth } from '@/lib/auth';
import { useI18n } from '@/lib/i18n';
import { useSports } from '@/lib/sports';
import { hourRange, money, shortDate } from '@/lib/format';
import { Screen } from '@/ui/Screen';
import { AppText } from '@/ui/AppText';
import { Button } from '@/ui/Button';
import { Card, Divider, ErrorBox, KeyValue, Loading } from '@/ui/bits';
import { Input } from '@/ui/Input';
import { Stepper } from '@/ui/Stepper';
import { Toggle } from '@/ui/Toggle';
import { ProviderSelect } from '@/components/ProviderSelect';
import { PolicyBadgeView } from '@/components/PolicyBadgeView';

export default function BookScreen() {
  const params = useLocalSearchParams<{ courtId: string; date: string; start: string; end: string }>();
  const { t, locale } = useI18n();
  const { sportName } = useSports();
  const { me } = useAuth();
  const router = useRouter();

  const [quote, setQuote] = useState<BookingQuoteResponse | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [phone, setPhone] = useState('+998');
  const [players, setPlayers] = useState(2);
  const [split, setSplit] = useState(false);
  const [names, setNames] = useState<string[]>(['', '']);
  const [provider, setProvider] = useState<PaymentProviderId>('click');
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    if (me?.phone) setPhone(me.phone);
  }, [me?.phone]);

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

  // documents policy or a split means every player is named
  const namesNeeded = split || (quote?.requireDocuments ?? false);
  const maxPlayers = quote?.capacity ?? 30;

  // the names list always mirrors the party size
  useEffect(() => {
    setNames((prev) => {
      if (prev.length === players) return prev;
      return Array.from({ length: players }, (_, i) => prev[i] ?? '');
    });
  }, [players]);

  // a split needs at least two people
  useEffect(() => {
    if (split && players < 2) setPlayers(2);
  }, [split, players]);

  const cleanNames = useMemo(() => names.map((n) => n.trim()), [names]);
  const namesValid = !namesNeeded || cleanNames.every((n) => n.length >= 2);

  const perPerson = useMemo(() => {
    if (!quote || !split) return null;
    return splitEven(quote.payNowTiyin, players)[0] ?? null;
  }, [quote, split, players]);

  useEffect(() => {
    if (!me) {
      const next = `/book?courtId=${params.courtId}&date=${params.date}&start=${params.start}&end=${params.end}`;
      router.replace(`/login?next=${encodeURIComponent(next)}`);
    }
  }, [me, params, router]);

  const phoneValid = /^\+998\d{9}$/.test(phone.replace(/[\s-]/g, ''));
  const canSubmit = phoneValid && namesValid;

  const submit = async () => {
    if (!quote || !canSubmit) return;
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
          contactPhone: phone.replace(/[\s-]/g, ''),
          playersCount: players,
          playerNames: namesNeeded && !split ? cleanNames : [],
          ...(split ? { split: { names: cleanNames } } : {}),
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
            {quote.courtName} · {sportName(quote.sport)}
          </AppText>
          <AppText weight="medium">
            {shortDate(quote.date, locale)} · {hourRange(quote.startHour, quote.endHour)}
          </AppText>
          <PolicyBadgeView badge={quote.policyBadge} />
        </Card>

        <Card style={{ gap: tokens.spacing.sm }}>
          <KeyValue label={t('book.total')} value={money(quote.totalTiyin, locale)} />
          {quote.serviceFeeTiyin > 0 ? (
            <KeyValue label={t('book.serviceFee')} value={money(quote.serviceFeeTiyin, locale)} />
          ) : null}
          <Divider />
          <KeyValue label={t('book.payNow')} value={money(quote.payNowTiyin, locale)} strong />
          <AppText variant="tiny" color={tokens.colors.gray500}>
            {t('book.feeNote')}
          </AppText>
        </Card>

        <Input
          label={t('book.contactPhone')}
          value={phone}
          onChangeText={setPhone}
          placeholder={t('auth.phoneHint')}
          keyboardType="phone-pad"
        />

        <Card style={{ gap: tokens.spacing.md }}>
          <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}>
            <View>
              <AppText>{t('book.playersCount')}</AppText>
              {quote.capacity ? (
                <AppText variant="tiny" color={tokens.colors.gray500}>
                  {t('book.maxPlayers', { n: quote.capacity })}
                </AppText>
              ) : null}
            </View>
            <Stepper value={players} min={split ? 2 : 1} max={maxPlayers} onChange={setPlayers} />
          </View>

          <Toggle label={t('book.split')} value={split} onChange={setSplit} />

          {namesNeeded ? (
            <>
              <AppText variant="small" color={tokens.colors.gray500}>
                {t('book.splitNames')}
              </AppText>
              {names.map((name, i) => (
                <Input
                  key={i}
                  value={name}
                  onChangeText={(v) => setNames((prev) => prev.map((n, j) => (j === i ? v : n)))}
                  placeholder={i === 0 ? t('book.splitNameYou') : t('book.splitNamePlaceholder', { n: i + 1 })}
                />
              ))}
            </>
          ) : null}

          {split ? (
            <>
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
          title={
            split && perPerson !== null
              ? `${t('book.cta')} · ${money(perPerson, locale)}`
              : `${t('book.cta')} · ${money(quote.payNowTiyin, locale)}`
          }
          onPress={submit}
          loading={busy}
          disabled={!canSubmit}
        />
      </View>
    </Screen>
  );
}
