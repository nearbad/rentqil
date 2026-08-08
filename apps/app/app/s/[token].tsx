import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { View } from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import * as Clipboard from 'expo-clipboard';
import { CheckCircle2, Circle } from 'lucide-react-native';
import type { PaymentProviderId, SplitPublicView } from '@rentqil/shared';
import { tokens } from '@rentqil/shared';
import { api, ApiError } from '@/lib/api';
import { useAuth } from '@/lib/auth';
import { useI18n } from '@/lib/i18n';
import { hourRange, minutesLeft, money, shortDate } from '@/lib/format';
import { Screen } from '@/ui/Screen';
import { AppText } from '@/ui/AppText';
import { Button } from '@/ui/Button';
import { Card, ErrorBox, Loading } from '@/ui/bits';
import { ProviderSelect } from '@/components/ProviderSelect';
import { QrCode } from '@/components/QrCode';
import { StatusBadge } from '@/components/BookingBits';
import { splitLink } from '@/components/SplitSection';

export default function SplitScreen() {
  const { token } = useLocalSearchParams<{ token: string }>();
  const { t, locale } = useI18n();
  const { me } = useAuth();
  const router = useRouter();

  const [view, setView] = useState<SplitPublicView | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [provider, setProvider] = useState<PaymentProviderId>('click');
  const [busy, setBusy] = useState(false);
  const [copied, setCopied] = useState(false);

  const load = useCallback(async () => {
    if (!token) return;
    try {
      setView(await api<SplitPublicView>(`/split/${token}`));
    } catch (e) {
      setError(t(e instanceof ApiError ? (`error.${e.code}` as never) : 'error.UNKNOWN'));
    }
  }, [token, t]);

  useEffect(() => {
    load();
  }, [load]);

  // live progress while the split is collecting
  useEffect(() => {
    if (view?.status !== 'pending_payment') return;
    const timer = setInterval(load, 5000);
    return () => clearInterval(timer);
  }, [view?.status, load]);

  const nextShare = useMemo(
    () => view?.participants.find((p) => p.status === 'pending'),
    [view]
  );

  const payShare = async () => {
    if (!view || !nextShare) return;
    if (!me) {
      router.push(`/login?next=${encodeURIComponent(`/s/${token}`)}`);
      return;
    }
    setBusy(true);
    setError(null);
    try {
      const init = await api<{ paymentId: string }>('/payments/init', {
        method: 'POST',
        body: { bookingId: view.bookingId, participantId: nextShare.id, provider },
      });
      router.push(`/pay/${init.paymentId}`);
    } catch (e) {
      setError(t(e instanceof ApiError ? (`error.${e.code}` as never) : 'error.UNKNOWN'));
      load();
    } finally {
      setBusy(false);
    }
  };

  if (error && !view) {
    return (
      <Screen title={t('split.title')} back>
        <ErrorBox message={error} />
      </Screen>
    );
  }
  if (!view) {
    return (
      <Screen title={t('split.title')} back>
        <Loading />
      </Screen>
    );
  }

  const pending = view.status === 'pending_payment';
  const link = splitLink(token ?? '');

  return (
    <Screen title={t('split.title')} back>
      <View style={{ gap: tokens.spacing.lg }}>
        {error ? <ErrorBox message={error} /> : null}

        <Card style={{ gap: tokens.spacing.sm }}>
          <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
            <AppText variant="h3" style={{ flex: 1 }}>
              {view.venueName}
            </AppText>
            <StatusBadge status={view.status} />
          </View>
          <AppText variant="small" color={tokens.colors.gray500}>
            {view.courtName}
          </AppText>
          <AppText weight="medium">
            {shortDate(view.date, locale)} · {hourRange(view.startHour, view.endHour)}
          </AppText>
          {pending && view.expiresAt ? (
            <AppText variant="small" color={tokens.colors.danger}>
              {t('split.timeLeft', { min: minutesLeft(view.expiresAt) })}
            </AppText>
          ) : null}
        </Card>

        {view.status === 'confirmed' || view.status === 'completed' ? (
          <Card style={{ backgroundColor: tokens.colors.successBg, borderColor: tokens.colors.successBg }}>
            <AppText color={tokens.colors.success} weight="medium">
              {t('split.allPaid')}
            </AppText>
          </Card>
        ) : null}
        {view.status === 'expired' ? (
          <Card style={{ backgroundColor: tokens.colors.dangerBg, borderColor: tokens.colors.dangerBg }}>
            <AppText color={tokens.colors.danger} weight="medium">
              {t('split.expired')}
            </AppText>
          </Card>
        ) : null}

        <Card style={{ gap: tokens.spacing.md }}>
          <AppText variant="h3">{t('split.progress', { paid: view.sharesPaid, total: view.sharesTotal })}</AppText>
          <View style={{ height: 6, backgroundColor: tokens.colors.gray150, borderRadius: 3, overflow: 'hidden' }}>
            <View
              style={{
                width: `${Math.round((view.sharesPaid / Math.max(view.sharesTotal, 1)) * 100)}%`,
                height: '100%',
                backgroundColor: tokens.colors.text,
              }}
            />
          </View>
          <View style={{ gap: tokens.spacing.sm }}>
            {view.participants.map((p, i) => (
              <View key={p.id} style={{ flexDirection: 'row', alignItems: 'center', gap: tokens.spacing.sm }}>
                {p.status === 'paid' ? (
                  <CheckCircle2 size={18} color={tokens.colors.success} strokeWidth={1.8} />
                ) : (
                  <Circle size={18} color={tokens.colors.gray300} strokeWidth={1.6} />
                )}
                <AppText variant="small" style={{ flex: 1 }}>
                  {p.isCreator ? t('split.shareCreator') : `#${i + 1}`}
                  {p.paidByMe ? ' · ' + t('venue.slotYours') : ''}
                </AppText>
                <AppText variant="small" color={tokens.colors.gray500}>
                  {money(p.shareTiyin, locale)}
                </AppText>
              </View>
            ))}
          </View>
        </Card>

        {pending && nextShare ? (
          <View style={{ gap: tokens.spacing.md }}>
            <Card style={{ gap: tokens.spacing.xs }}>
              <AppText variant="small" color={tokens.colors.gray500}>
                {t('split.yourShare')}
              </AppText>
              <AppText variant="h2">{money(nextShare.shareTiyin, locale)}</AppText>
            </Card>
            <AppText variant="h3">{t('book.paymentMethod')}</AppText>
            <ProviderSelect value={provider} onChange={setProvider} />
            <Button title={t('split.payShare')} onPress={payShare} loading={busy} />
          </View>
        ) : null}

        {pending ? (
          <Card style={{ gap: tokens.spacing.md, alignItems: 'center' }}>
            <AppText variant="small" color={tokens.colors.gray500}>
              {t('split.invite')}
            </AppText>
            <QrCode value={link} />
            <AppText variant="tiny" color={tokens.colors.gray500} center>
              {link}
            </AppText>
            <Button
              title={copied ? t('common.copied') : t('common.copy')}
              variant="secondary"
              small
              onPress={async () => {
                await Clipboard.setStringAsync(link);
                setCopied(true);
                setTimeout(() => setCopied(false), 1500);
              }}
            />
          </Card>
        ) : null}
      </View>
    </Screen>
  );
}
