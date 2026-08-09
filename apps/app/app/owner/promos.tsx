import React, { useCallback, useState } from 'react';
import { Linking, View } from 'react-native';
import { useFocusEffect } from 'expo-router';
import type { OwnerVenueView, PlatformConfigView, PromoCodeView } from '@rentqil/shared';
import { somToTiyin, tokens } from '@rentqil/shared';
import { api, ApiError } from '@/lib/api';
import { useI18n } from '@/lib/i18n';
import { useRequireRole } from '@/lib/guards';
import { money } from '@/lib/format';
import { Screen } from '@/ui/Screen';
import { AppText } from '@/ui/AppText';
import { Button } from '@/ui/Button';
import { Badge, Card, Chip, EmptyState, ErrorBox, Loading } from '@/ui/bits';
import { Input } from '@/ui/Input';
import { Toggle } from '@/ui/Toggle';

export default function OwnerPromosScreen() {
  const { t, locale } = useI18n();
  const { ready } = useRequireRole('owner', 'admin');
  const [promos, setPromos] = useState<PromoCodeView[] | null>(null);
  const [venues, setVenues] = useState<OwnerVenueView[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [showForm, setShowForm] = useState(false);
  const [botUsername, setBotUsername] = useState<string | null>(null);

  // create form
  const [code, setCode] = useState('');
  const [percent, setPercent] = useState('');
  const [amountSom, setAmountSom] = useState('');
  const [venueIds, setVenueIds] = useState<string[]>([]);
  const [maxUses, setMaxUses] = useState('');
  const [endsAt, setEndsAt] = useState('');
  const [busy, setBusy] = useState(false);

  const load = useCallback(() => {
    api<{ items: PromoCodeView[] }>('/owner/promos')
      .then((r) => setPromos(r.items))
      .catch(() => setPromos([]));
    api<{ items: OwnerVenueView[] }>('/owner/venues')
      .then((r) => setVenues(r.items))
      .catch(() => {});
    api<PlatformConfigView>('/config')
      .then((c) => setBotUsername(c.telegramBotUsername))
      .catch(() => {});
  }, []);

  useFocusEffect(
    useCallback(() => {
      if (ready) load();
    }, [ready, load])
  );

  if (!ready) return <Screen title={t('owner.promos')} back>{null}</Screen>;

  const percentNum = Number(percent);
  const amountNum = Number(amountSom.replace(/\s/g, ''));
  const kindValid =
    (percentNum >= 1 && percentNum <= 100 && !amountSom.trim()) ||
    (amountNum >= 1000 && !percent.trim());

  const create = async () => {
    if (!kindValid) return;
    setBusy(true);
    setError(null);
    try {
      await api('/owner/promos', {
        method: 'POST',
        body: {
          code: code.trim() ? code.trim().toUpperCase() : undefined,
          percentOff: percent.trim() ? percentNum : null,
          amountOffTiyin: amountSom.trim() ? somToTiyin(amountNum) : null,
          venueIds,
          maxUses: maxUses.trim() ? Number(maxUses) : null,
          endsAt: endsAt.trim() ? new Date(`${endsAt.trim()}T23:59:59`).toISOString() : null,
        },
      });
      setCode('');
      setPercent('');
      setAmountSom('');
      setVenueIds([]);
      setMaxUses('');
      setEndsAt('');
      setShowForm(false);
      load();
    } catch (e) {
      setError(t(e instanceof ApiError ? (`error.${e.code}` as never) : 'error.UNKNOWN'));
    } finally {
      setBusy(false);
    }
  };

  const failed = (e: unknown) =>
    setError(t(e instanceof ApiError ? (`error.${e.code}` as never) : 'error.UNKNOWN'));

  const toggleActive = async (promo: PromoCodeView) => {
    setError(null);
    try {
      await api(`/owner/promos/${promo.id}`, { method: 'PATCH', body: { active: !promo.active } });
    } catch (e) {
      failed(e);
    }
    load();
  };

  const remove = async (promo: PromoCodeView) => {
    setError(null);
    // drop it from the list right away, the reload confirms it
    setPromos((prev) => prev?.filter((p) => p.id !== promo.id) ?? prev);
    try {
      await api(`/owner/promos/${promo.id}`, { method: 'DELETE' });
    } catch (e) {
      failed(e);
    }
    load();
  };

  const venueName = (id: string) => venues.find((v) => v.id === id)?.name ?? id;

  const discountLabel = (p: PromoCodeView) =>
    p.percentOff ? `-${p.percentOff}%` : p.amountOffTiyin ? `-${money(p.amountOffTiyin, locale)}` : '';

  return (
    <Screen title={t('owner.promos')} back>
      <View style={{ gap: tokens.spacing.lg }}>
        <Card style={{ gap: tokens.spacing.sm }}>
          <AppText variant="h3">{t('owner.alerts')}</AppText>
          <AppText variant="small" color={tokens.colors.gray500} style={{ lineHeight: 20 }}>
            {t('owner.alertsText')}
          </AppText>
          {botUsername ? (
            <Button
              title={t('owner.alertsOpenBot')}
              variant="secondary"
              small
              onPress={() => Linking.openURL(`https://t.me/${botUsername}`)}
            />
          ) : null}
        </Card>

        {error ? <ErrorBox message={error} /> : null}

        {showForm ? (
          <Card style={{ gap: tokens.spacing.md }}>
            <Input
              label={t('owner.promoCode')}
              value={code}
              onChangeText={setCode}
              placeholder={t('owner.promoCodeHint')}
              autoCapitalize="characters"
            />
            <View style={{ flexDirection: 'row', gap: tokens.spacing.sm }}>
              <View style={{ flex: 1 }}>
                <Input
                  label={t('owner.promoPercent')}
                  value={percent}
                  onChangeText={setPercent}
                  keyboardType="number-pad"
                  maxLength={3}
                />
              </View>
              <View style={{ flex: 1 }}>
                <Input
                  label={t('owner.promoAmount')}
                  value={amountSom}
                  onChangeText={setAmountSom}
                  keyboardType="number-pad"
                />
              </View>
            </View>
            <AppText variant="tiny" color={tokens.colors.gray500}>
              {t('owner.promoKindHint')}
            </AppText>

            <AppText variant="small" color={tokens.colors.gray500}>
              {t('owner.promoVenues')}
            </AppText>
            <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: tokens.spacing.sm }}>
              <Chip
                label={t('owner.promoAllVenues')}
                selected={venueIds.length === 0}
                onPress={() => setVenueIds([])}
              />
              {venues.map((v) => (
                <Chip
                  key={v.id}
                  label={v.name}
                  selected={venueIds.includes(v.id)}
                  onPress={() =>
                    setVenueIds((prev) =>
                      prev.includes(v.id) ? prev.filter((x) => x !== v.id) : [...prev, v.id]
                    )
                  }
                />
              ))}
            </View>

            <View style={{ flexDirection: 'row', gap: tokens.spacing.sm }}>
              <View style={{ flex: 1 }}>
                <Input
                  label={t('owner.promoMaxUses')}
                  value={maxUses}
                  onChangeText={setMaxUses}
                  keyboardType="number-pad"
                />
              </View>
              <View style={{ flex: 1 }}>
                <Input label={t('owner.promoEnds')} value={endsAt} onChangeText={setEndsAt} placeholder="2026-12-31" />
              </View>
            </View>

            <View style={{ flexDirection: 'row', gap: tokens.spacing.sm }}>
              <Button title={t('common.save')} onPress={create} loading={busy} disabled={!kindValid} />
              <Button title={t('common.cancel')} variant="ghost" onPress={() => setShowForm(false)} />
            </View>
          </Card>
        ) : (
          <Button title={t('owner.promoAdd')} variant="secondary" onPress={() => setShowForm(true)} />
        )}

        {promos === null ? (
          <Loading />
        ) : promos.length === 0 ? (
          <EmptyState title={t('owner.promoEmpty')} />
        ) : (
          <View style={{ gap: tokens.spacing.md }}>
            {promos.map((p) => (
              <Card key={p.id} style={{ gap: tokens.spacing.sm }}>
                <View style={{ flexDirection: 'row', alignItems: 'center', gap: tokens.spacing.sm }}>
                  <AppText variant="h3" style={{ flex: 1 }}>
                    {p.code}
                  </AppText>
                  <Badge text={discountLabel(p)} tone="success" />
                  {!p.active ? <Badge text={t('admin.sportHidden')} /> : null}
                </View>
                <AppText variant="small" color={tokens.colors.gray500}>
                  {p.venueIds.length === 0
                    ? t('owner.promoAllVenues')
                    : p.venueIds.map(venueName).join(', ')}
                </AppText>
                <AppText variant="small" color={tokens.colors.gray500}>
                  {t('owner.promoUses', { used: `${p.usedCount}${p.maxUses ? ` / ${p.maxUses}` : ''}` })}
                  {p.endsAt ? ` · ${p.endsAt.slice(0, 10)}` : ''}
                </AppText>
                <View style={{ flexDirection: 'row', alignItems: 'center', gap: tokens.spacing.md }}>
                  <Toggle label={t('owner.promoActive')} value={p.active} onChange={() => toggleActive(p)} />
                  <Button title={t('common.delete')} variant="ghost" small onPress={() => remove(p)} />
                </View>
              </Card>
            ))}
          </View>
        )}
      </View>
    </Screen>
  );
}
