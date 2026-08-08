import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { View } from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import * as Clipboard from 'expo-clipboard';
import { CheckCircle2, Circle } from 'lucide-react-native';
import type { PaymentProviderId, SplitPublicView } from '@rentqil/shared';
import { tokens } from '@rentqil/shared';
import { api, ApiError } from '@/lib/api';
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

// the whole page works without an account, the link is the access key
export default function SplitScreen() {
  const { token } = useLocalSearchParams<{ token: string }>();
  const { t, locale } = useI18n();
  const router = useRouter();

  const [view, setView] = useState<SplitPublicView | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [provider, setProvider] = useState<PaymentProviderId>('click');
  const [busyId, setBusyId] = useState<string | null>(null);
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

  const pendingShares = useMemo(
    () => view?.participants.filter((p) => p.status === 'pending') ?? [],
    [view]
  );

  const pay = async (body: { participantId?: string; remaining?: boolean }, busyKey: string) => {
    setBusyId(busyKey);
    setError(null);
    try {
      const init = await api<{ paymentId: string }>(`/split/${token}/pay`, {
        method: 'POST',
        body: { ...body, provider },
      });
      router.push(`/pay/${init.paymentId}`);
    } catch (e) {
      setError(t(e instanceof ApiError ? (`error.${e.code}` as never) : 'error.UNKNOWN'));
      load();
    } finally {
      setBusyId(null);
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
  const remainingTotal = pendingShares.reduce((s, p) => s + p.shareTiyin, 0);
  const nobodyPaid = view.sharesPaid === 0;

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

        {pending ? (
          <View style={{ gap: tokens.spacing.sm }}>
            <AppText variant="h3">{t('book.paymentMethod')}</AppText>
            <ProviderSelect value={provider} onChange={setProvider} />
          </View>
        ) : null}

        <Card style={{ gap: tokens.spacing.md }}>
          <AppText variant="h3">{t('split.progress', { paid: view.sharesPaid, total: view.sharesTotal })}</AppText>
          <View style={{ height: 8, backgroundColor: tokens.colors.gray150, overflow: 'hidden' }}>
            <View
              style={{
                width: `${Math.round((view.sharesPaid / Math.max(view.sharesTotal, 1)) * 100)}%`,
                height: '100%',
                backgroundColor: tokens.colors.text,
              }}
            />
          </View>
          <View style={{ gap: tokens.spacing.md }}>
            {view.participants.map((p, i) => (
              <View key={p.id} style={{ flexDirection: 'row', alignItems: 'center', gap: tokens.spacing.sm }}>
                {p.status === 'paid' ? (
                  <CheckCircle2 size={18} color={tokens.colors.success} strokeWidth={1.8} />
                ) : (
                  <Circle size={18} color={tokens.colors.gray300} strokeWidth={1.6} />
                )}
                <View style={{ flex: 1 }}>
                  <AppText variant="small" weight="medium">
                    {p.fullName || `#${i + 1}`}
                  </AppText>
                  <AppText variant="tiny" color={tokens.colors.gray500}>
                    {money(p.shareTiyin, locale)}
                    {p.isCreator ? ` · ${t('split.shareCreator')}` : ''}
                  </AppText>
                </View>
                {pending && p.status === 'pending' ? (
                  <Button
                    title={t('split.payShare')}
                    small
                    onPress={() => pay({ participantId: p.id }, p.id)}
                    loading={busyId === p.id}
                    disabled={busyId !== null && busyId !== p.id}
                  />
                ) : null}
              </View>
            ))}
          </View>

          {pending && pendingShares.length > 1 ? (
            <Button
              title={`${nobodyPaid ? t('split.payAll') : t('split.payRemaining')} · ${money(remainingTotal, locale)}`}
              variant="secondary"
              onPress={() => pay({ remaining: true }, 'remaining')}
              loading={busyId === 'remaining'}
              disabled={busyId !== null && busyId !== 'remaining'}
            />
          ) : null}
        </Card>

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
