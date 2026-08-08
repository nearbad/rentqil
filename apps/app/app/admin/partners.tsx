import React, { useCallback, useState } from 'react';
import { View } from 'react-native';
import { useFocusEffect } from 'expo-router';
import type { PartnerRequestView } from '@rentqil/shared';
import { tokens } from '@rentqil/shared';
import { api } from '@/lib/api';
import { useI18n } from '@/lib/i18n';
import { useRequireRole } from '@/lib/guards';
import { Screen } from '@/ui/Screen';
import { AppText } from '@/ui/AppText';
import { Badge, Card, Chip, EmptyState, Loading } from '@/ui/bits';

const TONES = { approved: 'success', rejected: 'danger', pending: 'neutral' } as const;

export default function AdminPartnersScreen() {
  const { t } = useI18n();
  const { ready } = useRequireRole('admin');
  const [items, setItems] = useState<PartnerRequestView[] | null>(null);

  const load = useCallback(() => {
    api<{ items: PartnerRequestView[] }>('/admin/partner-requests')
      .then((r) => setItems(r.items))
      .catch(() => setItems([]));
  }, []);

  useFocusEffect(
    useCallback(() => {
      if (ready) load();
    }, [ready, load])
  );

  if (!ready) return <Screen title={t('admin.partnerRequests')} back>{null}</Screen>;

  const decide = async (id: string, approve: boolean) => {
    try {
      await api(`/admin/partner-requests/${id}`, { method: 'POST', body: { approve } });
      load();
    } catch {
      // reload shows the real state
    }
  };

  return (
    <Screen title={t('admin.partnerRequests')} back>
      <View style={{ gap: tokens.spacing.md }}>
        {items === null ? (
          <Loading />
        ) : items.length === 0 ? (
          <EmptyState title={t('admin.partnerEmpty')} />
        ) : (
          items.map((r) => (
            <Card key={r.id} style={{ gap: tokens.spacing.sm }}>
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: tokens.spacing.sm }}>
                <AppText variant="h3" style={{ flex: 1 }}>
                  {r.name}
                </AppText>
                <Badge text={r.status} tone={TONES[r.status]} />
              </View>
              <AppText variant="small" weight="medium">
                {r.contact}
              </AppText>
              {r.inn ? (
                <AppText variant="small" color={tokens.colors.gray500}>
                  INN: {r.inn}
                </AppText>
              ) : null}
              {r.message ? (
                <AppText variant="small" color={tokens.colors.gray700}>
                  {r.message}
                </AppText>
              ) : null}
              <AppText variant="tiny" color={tokens.colors.gray500}>
                {r.createdAt.slice(0, 16).replace('T', ' ')}
              </AppText>
              {r.status === 'pending' ? (
                <View style={{ flexDirection: 'row', gap: tokens.spacing.sm }}>
                  <Chip label={t('admin.approve')} onPress={() => decide(r.id, true)} />
                  <Chip label={t('admin.reject')} onPress={() => decide(r.id, false)} />
                </View>
              ) : null}
            </Card>
          ))
        )}
      </View>
    </Screen>
  );
}
