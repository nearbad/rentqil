import React, { useEffect, useState } from 'react';
import { View } from 'react-native';
import type { PlatformConfigView } from '@rentqil/shared';
import { somToTiyin, tiyinToSom, tokens } from '@rentqil/shared';
import { api } from '@/lib/api';
import { useI18n } from '@/lib/i18n';
import { useRequireRole } from '@/lib/guards';
import { Screen } from '@/ui/Screen';
import { AppText } from '@/ui/AppText';
import { Button } from '@/ui/Button';
import { Input } from '@/ui/Input';
import { Card, Loading } from '@/ui/bits';
import { Toggle } from '@/ui/Toggle';

// numeric fields are edited as strings and parsed on save
interface Draft {
  serviceFeeEnabled: boolean;
  serviceFeeSom: string;
  commissionEnabled: boolean;
  commissionPercent: string;
  defaultDepositPercent: string;
  minDepositPercent: string;
  maxDepositPercent: string;
  bookingTtlMinutes: string;
  splitTtlMinutes: string;
  calendarDays: string;
  reminderHours: string;
}

export default function AdminConfigScreen() {
  const { t } = useI18n();
  const { ready } = useRequireRole('admin');
  const [draft, setDraft] = useState<Draft | null>(null);
  const [busy, setBusy] = useState(false);
  const [savedFlash, setSavedFlash] = useState(false);

  useEffect(() => {
    if (!ready) return;
    api<PlatformConfigView>('/admin/config').then((c) =>
      setDraft({
        serviceFeeEnabled: c.serviceFeeEnabled,
        serviceFeeSom: String(Math.round(tiyinToSom(c.serviceFeeTiyin))),
        commissionEnabled: c.commissionEnabled,
        commissionPercent: String(c.commissionPercent),
        defaultDepositPercent: String(c.defaultDepositPercent),
        minDepositPercent: String(c.minDepositPercent),
        maxDepositPercent: String(c.maxDepositPercent),
        bookingTtlMinutes: String(c.bookingTtlMinutes),
        splitTtlMinutes: String(c.splitTtlMinutes),
        calendarDays: String(c.calendarDays),
        reminderHours: String(c.reminderHours),
      })
    );
  }, [ready]);

  const save = async () => {
    if (!draft) return;
    setBusy(true);
    try {
      await api('/admin/config', {
        method: 'PATCH',
        body: {
          serviceFeeEnabled: draft.serviceFeeEnabled,
          serviceFeeTiyin: somToTiyin(parseInt(draft.serviceFeeSom, 10) || 0),
          commissionEnabled: draft.commissionEnabled,
          commissionPercent: parseInt(draft.commissionPercent, 10) || 0,
          defaultDepositPercent: parseInt(draft.defaultDepositPercent, 10) || 0,
          minDepositPercent: parseInt(draft.minDepositPercent, 10) || 0,
          maxDepositPercent: parseInt(draft.maxDepositPercent, 10) || 100,
          bookingTtlMinutes: parseInt(draft.bookingTtlMinutes, 10) || 15,
          splitTtlMinutes: parseInt(draft.splitTtlMinutes, 10) || 60,
          calendarDays: parseInt(draft.calendarDays, 10) || 7,
          reminderHours: parseInt(draft.reminderHours, 10) || 2,
        },
      });
      setSavedFlash(true);
      setTimeout(() => setSavedFlash(false), 1500);
    } finally {
      setBusy(false);
    }
  };

  if (!ready || !draft) {
    return (
      <Screen title={t('admin.config')} back>
        {ready ? <Loading /> : null}
      </Screen>
    );
  }

  const patch = (part: Partial<Draft>) => setDraft((d) => (d ? { ...d, ...part } : d));

  return (
    <Screen title={t('admin.config')} back>
      <View style={{ gap: tokens.spacing.lg }}>
        <Card style={{ gap: tokens.spacing.md }}>
          <AppText variant="h3">{t('admin.configServiceFee')}</AppText>
          <Toggle
            label={t('admin.configServiceFeeEnabled')}
            value={draft.serviceFeeEnabled}
            onChange={(v) => patch({ serviceFeeEnabled: v })}
          />
          <Input
            label={t('admin.configServiceFeeSom')}
            value={draft.serviceFeeSom}
            onChangeText={(v) => patch({ serviceFeeSom: v })}
            keyboardType="number-pad"
          />
        </Card>

        <Card style={{ gap: tokens.spacing.md }}>
          <AppText variant="h3">{t('admin.configCommission')}</AppText>
          <Toggle
            label={t('admin.configCommissionEnabled')}
            value={draft.commissionEnabled}
            onChange={(v) => patch({ commissionEnabled: v })}
          />
          <Input
            label={t('admin.configCommissionPercent')}
            value={draft.commissionPercent}
            onChangeText={(v) => patch({ commissionPercent: v })}
            keyboardType="number-pad"
          />
        </Card>

        <Card style={{ gap: tokens.spacing.md }}>
          <AppText variant="h3">{t('admin.configDeposit')}</AppText>
          <Input
            label={t('admin.configDepositDefault')}
            value={draft.defaultDepositPercent}
            onChangeText={(v) => patch({ defaultDepositPercent: v })}
            keyboardType="number-pad"
          />
          <View style={{ flexDirection: 'row', gap: tokens.spacing.md }}>
            <View style={{ flex: 1 }}>
              <Input
                label={t('admin.configDepositMin')}
                value={draft.minDepositPercent}
                onChangeText={(v) => patch({ minDepositPercent: v })}
                keyboardType="number-pad"
              />
            </View>
            <View style={{ flex: 1 }}>
              <Input
                label={t('admin.configDepositMax')}
                value={draft.maxDepositPercent}
                onChangeText={(v) => patch({ maxDepositPercent: v })}
                keyboardType="number-pad"
              />
            </View>
          </View>
        </Card>

        <Card style={{ gap: tokens.spacing.md }}>
          <AppText variant="h3">{t('admin.configTtl')}</AppText>
          <Input
            label={t('admin.configBookingTtl')}
            value={draft.bookingTtlMinutes}
            onChangeText={(v) => patch({ bookingTtlMinutes: v })}
            keyboardType="number-pad"
          />
          <Input
            label={t('admin.configSplitTtl')}
            value={draft.splitTtlMinutes}
            onChangeText={(v) => patch({ splitTtlMinutes: v })}
            keyboardType="number-pad"
          />
          <Input
            label={t('admin.configCalendarDays')}
            value={draft.calendarDays}
            onChangeText={(v) => patch({ calendarDays: v })}
            keyboardType="number-pad"
          />
          <Input
            label={t('admin.configReminderHours')}
            value={draft.reminderHours}
            onChangeText={(v) => patch({ reminderHours: v })}
            keyboardType="number-pad"
          />
        </Card>

        <Button title={savedFlash ? t('profile.saved') : t('common.save')} onPress={save} loading={busy} />
      </View>
    </Screen>
  );
}
