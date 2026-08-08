import React, { useEffect, useState } from 'react';
import { View } from 'react-native';
import type { PlatformConfigView } from '@rentqil/shared';
import { tokens } from '@rentqil/shared';
import { api } from '@/lib/api';
import { useI18n } from '@/lib/i18n';
import { useRequireRole } from '@/lib/guards';
import { Screen } from '@/ui/Screen';
import { AppText } from '@/ui/AppText';
import { Button } from '@/ui/Button';
import { Input } from '@/ui/Input';
import { Card, Loading } from '@/ui/bits';

// numeric fields are edited as strings and parsed on save
interface Draft {
  serviceFeePercent: string;
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
        serviceFeePercent: String(c.serviceFeePercent),
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
          serviceFeePercent: parseInt(draft.serviceFeePercent, 10) || 0,
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
          <Input
            label={t('admin.configServiceFeePercent')}
            value={draft.serviceFeePercent}
            onChangeText={(v) => patch({ serviceFeePercent: v.replace(/\D/g, '') })}
            keyboardType="number-pad"
            maxLength={3}
          />
          <AppText variant="tiny" color={tokens.colors.gray500}>
            {t('admin.configServiceFeeNote')}
          </AppText>
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
