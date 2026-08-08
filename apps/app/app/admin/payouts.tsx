import React, { useCallback, useState } from 'react';
import { View } from 'react-native';
import { useFocusEffect } from 'expo-router';
import type { AdminPayoutRowView } from '@rentqil/shared';
import { somToTiyin, tiyinToSom, tokens } from '@rentqil/shared';
import { api } from '@/lib/api';
import { useI18n } from '@/lib/i18n';
import { useRequireRole } from '@/lib/guards';
import { money } from '@/lib/format';
import { Screen } from '@/ui/Screen';
import { AppText } from '@/ui/AppText';
import { Button } from '@/ui/Button';
import { Input } from '@/ui/Input';
import { Card, EmptyState, KeyValue, Loading } from '@/ui/bits';

function PayoutRow({ row, onDone }: { row: AdminPayoutRowView; onDone: () => void }) {
  const { t, locale } = useI18n();
  const [open, setOpen] = useState(false);
  const [amountSom, setAmountSom] = useState(String(Math.round(tiyinToSom(Math.max(row.payableTiyin, 0)))));
  const [note, setNote] = useState('');
  const [busy, setBusy] = useState(false);

  const markPaid = async () => {
    const som = parseInt(amountSom.replace(/\D/g, ''), 10);
    if (!som) return;
    setBusy(true);
    try {
      await api('/admin/payouts', {
        method: 'POST',
        body: { ownerId: row.ownerId, amountTiyin: somToTiyin(som), note: note.trim() || undefined },
      });
      setOpen(false);
      onDone();
    } finally {
      setBusy(false);
    }
  };

  return (
    <Card style={{ gap: tokens.spacing.sm }}>
      <AppText weight="medium">
        {row.ownerName ?? '-'} · {row.ownerEmail ?? '-'}
      </AppText>
      <KeyValue label={t('owner.financeAccrued')} value={money(row.accruedTiyin, locale)} />
      <KeyValue label={t('owner.financePaidOut')} value={money(row.paidOutTiyin, locale)} />
      <KeyValue label={t('admin.payable')} value={money(row.payableTiyin, locale)} strong />

      {open ? (
        <View style={{ gap: tokens.spacing.sm }}>
          <Input
            label={t('admin.payoutAmount')}
            value={amountSom}
            onChangeText={setAmountSom}
            keyboardType="number-pad"
          />
          <Input value={note} onChangeText={setNote} placeholder={t('admin.payoutNote')} />
          <View style={{ flexDirection: 'row', gap: tokens.spacing.sm }}>
            <View style={{ flex: 1 }}>
              <Button title={t('common.cancel')} variant="secondary" small onPress={() => setOpen(false)} />
            </View>
            <View style={{ flex: 1 }}>
              <Button title={t('common.confirm')} small onPress={markPaid} loading={busy} />
            </View>
          </View>
        </View>
      ) : (
        <Button
          title={t('admin.markPaid')}
          variant="secondary"
          small
          onPress={() => setOpen(true)}
          disabled={row.payableTiyin <= 0}
        />
      )}
    </Card>
  );
}

export default function AdminPayoutsScreen() {
  const { t } = useI18n();
  const { ready } = useRequireRole('admin');
  const [items, setItems] = useState<AdminPayoutRowView[] | null>(null);

  const load = useCallback(() => {
    api<{ items: AdminPayoutRowView[] }>('/admin/payouts')
      .then((r) => setItems(r.items))
      .catch(() => setItems([]));
  }, []);

  useFocusEffect(
    useCallback(() => {
      if (ready) load();
    }, [ready, load])
  );

  if (!ready) return <Screen title={t('admin.payouts')} back>{null}</Screen>;

  return (
    <Screen title={t('admin.payouts')} back>
      {items === null ? (
        <Loading />
      ) : items.length === 0 ? (
        <EmptyState title={t('admin.payouts')} />
      ) : (
        <View style={{ gap: tokens.spacing.md }}>
          {items.map((row) => (
            <PayoutRow key={row.ownerId} row={row} onDone={load} />
          ))}
        </View>
      )}
    </Screen>
  );
}
