import React, { useEffect, useState } from 'react';
import { View } from 'react-native';
import type { OwnerFinanceView } from '@rentqil/shared';
import { tokens } from '@rentqil/shared';
import { api } from '@/lib/api';
import { useI18n } from '@/lib/i18n';
import { useRequireRole } from '@/lib/guards';
import { money } from '@/lib/format';
import { Screen } from '@/ui/Screen';
import { AppText } from '@/ui/AppText';
import { Card, Divider, KeyValue, Loading } from '@/ui/bits';

export default function OwnerFinanceScreen() {
  const { t, locale } = useI18n();
  const { ready } = useRequireRole('owner', 'admin');
  const [finance, setFinance] = useState<OwnerFinanceView | null>(null);

  useEffect(() => {
    if (!ready) return;
    api<OwnerFinanceView>('/owner/finance').then(setFinance).catch(() => {});
  }, [ready]);

  if (!ready || !finance) {
    return (
      <Screen title={t('owner.finance')} back>
        {ready ? <Loading /> : null}
      </Screen>
    );
  }

  return (
    <Screen title={t('owner.finance')} back>
      <View style={{ gap: tokens.spacing.lg }}>
        <Card style={{ gap: tokens.spacing.sm }}>
          <KeyValue label={t('owner.financeGross')} value={money(finance.completedGrossTiyin, locale)} />
          <Divider />
          <KeyValue label={t('owner.financeAccrued')} value={money(finance.accruedTiyin, locale)} />
          <KeyValue label={t('owner.financePaidOut')} value={money(finance.paidOutTiyin, locale)} />
          <KeyValue label={t('owner.financePayable')} value={money(finance.payableTiyin, locale)} strong />
        </Card>

        <Card style={{ gap: tokens.spacing.xs }}>
          <KeyValue label={t('owner.financeUpcoming')} value={money(finance.upcomingHoldsTiyin, locale)} />
          <AppText variant="tiny" color={tokens.colors.gray500}>
            {t('owner.financeNote')}
          </AppText>
        </Card>

        <AppText variant="h3">{t('owner.financePayouts')}</AppText>
        {finance.payouts.length === 0 ? (
          <AppText variant="small" color={tokens.colors.gray500}>
            {t('common.notSet')}
          </AppText>
        ) : (
          <View style={{ gap: tokens.spacing.sm }}>
            {finance.payouts.map((p) => (
              <View key={p.id} style={{ flexDirection: 'row', justifyContent: 'space-between' }}>
                <AppText variant="small" color={tokens.colors.gray500}>
                  {p.createdAt.slice(0, 10)}
                  {p.note ? ` · ${p.note}` : ''}
                </AppText>
                <AppText variant="small" weight="semibold">
                  {money(p.amountTiyin, locale)}
                </AppText>
              </View>
            ))}
          </View>
        )}
      </View>
    </Screen>
  );
}
