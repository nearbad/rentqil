import React, { useCallback, useState } from 'react';
import { View } from 'react-native';
import { useFocusEffect } from 'expo-router';
import type { ModerationItemView } from '@rentqil/shared';
import { tokens } from '@rentqil/shared';
import { api } from '@/lib/api';
import { useI18n } from '@/lib/i18n';
import { useRequireRole } from '@/lib/guards';
import { Screen } from '@/ui/Screen';
import { AppText } from '@/ui/AppText';
import { Button } from '@/ui/Button';
import { Input } from '@/ui/Input';
import { Badge, Card, EmptyState, Loading } from '@/ui/bits';

function FieldList({ data, compare }: { data: Record<string, unknown>; compare?: Record<string, unknown> | null }) {
  return (
    <View style={{ gap: 2 }}>
      {Object.entries(data).map(([key, value]) => {
        const old = compare?.[key];
        const changed = compare && JSON.stringify(old) !== JSON.stringify(value);
        return (
          <View key={key} style={{ flexDirection: 'row', gap: tokens.spacing.sm }}>
            <AppText variant="tiny" color={tokens.colors.gray500} style={{ width: 80 }}>
              {key}
            </AppText>
            <AppText
              variant="tiny"
              style={{ flex: 1 }}
              color={changed ? tokens.colors.text : tokens.colors.gray500}
              weight={changed ? 'semibold' : 'regular'}
            >
              {Array.isArray(value) ? value.join(', ') : String(value)}
            </AppText>
          </View>
        );
      })}
    </View>
  );
}

function ModerationCard({ item, onDone }: { item: ModerationItemView; onDone: () => void }) {
  const { t } = useI18n();
  const [comment, setComment] = useState('');
  const [busy, setBusy] = useState(false);

  const decide = async (approve: boolean) => {
    setBusy(true);
    try {
      await api(`/admin/moderation/${item.venueId}`, {
        method: 'POST',
        body: { approve, comment: comment.trim() || undefined },
      });
      onDone();
    } finally {
      setBusy(false);
    }
  };

  return (
    <Card style={{ gap: tokens.spacing.md }}>
      <View style={{ flexDirection: 'row', alignItems: 'center', gap: tokens.spacing.sm }}>
        <AppText variant="h3" style={{ flex: 1 }}>
          {item.venueName}
        </AppText>
        <Badge text={item.kind === 'new' ? t('admin.moderationNew') : t('admin.moderationEdit')} />
      </View>
      <AppText variant="small" color={tokens.colors.gray500}>
        {item.ownerEmail ?? '-'} · {item.submittedAt.slice(0, 16).replace('T', ' ')}
      </AppText>

      <FieldList data={item.requested} compare={item.current} />

      <Input value={comment} onChangeText={setComment} placeholder={t('admin.rejectComment')} />
      <View style={{ flexDirection: 'row', gap: tokens.spacing.sm }}>
        <View style={{ flex: 1 }}>
          <Button title={t('admin.reject')} variant="danger" small onPress={() => decide(false)} disabled={busy} />
        </View>
        <View style={{ flex: 1 }}>
          <Button title={t('admin.approve')} small onPress={() => decide(true)} loading={busy} />
        </View>
      </View>
    </Card>
  );
}

export default function ModerationScreen() {
  const { t } = useI18n();
  const { ready } = useRequireRole('admin');
  const [items, setItems] = useState<ModerationItemView[] | null>(null);

  const load = useCallback(() => {
    api<{ items: ModerationItemView[] }>('/admin/moderation')
      .then((r) => setItems(r.items))
      .catch(() => setItems([]));
  }, []);

  useFocusEffect(
    useCallback(() => {
      if (ready) load();
    }, [ready, load])
  );

  if (!ready) return <Screen title={t('admin.moderation')} back>{null}</Screen>;

  return (
    <Screen title={t('admin.moderation')} back>
      {items === null ? (
        <Loading />
      ) : items.length === 0 ? (
        <EmptyState title={t('admin.moderationEmpty')} />
      ) : (
        <View style={{ gap: tokens.spacing.md }}>
          {items.map((item) => (
            <ModerationCard key={`${item.venueId}-${item.kind}`} item={item} onDone={load} />
          ))}
        </View>
      )}
    </Screen>
  );
}
