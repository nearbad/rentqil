import React, { useEffect, useState } from 'react';
import { View } from 'react-native';
import { useRouter } from 'expo-router';
import type { NotificationView, TranslationKey } from '@rentqil/shared';
import { tokens } from '@rentqil/shared';
import { api } from '@/lib/api';
import { useAuth } from '@/lib/auth';
import { useI18n } from '@/lib/i18n';
import { money } from '@/lib/format';
import { Screen } from '@/ui/Screen';
import { AppText } from '@/ui/AppText';
import { EmptyState, Loading } from '@/ui/bits';

const KNOWN_TYPES = new Set([
  'booking_confirmed',
  'booking_reminder',
  'booking_cancelled',
  'refund_issued',
  'split_paid',
  'split_expired',
  'venue_approved',
  'venue_rejected',
  'owner_approved',
  'owner_rejected',
]);

export default function NotificationsScreen() {
  const { t, locale } = useI18n();
  const { me, loading } = useAuth();
  const router = useRouter();
  const [items, setItems] = useState<NotificationView[] | null>(null);

  useEffect(() => {
    if (loading) return;
    if (!me) {
      router.replace('/login');
      return;
    }
    api<{ items: NotificationView[] }>('/me/notifications')
      .then((r) => {
        setItems(r.items);
        // opening the screen clears the unread counter
        return api('/me/notifications/read', { method: 'POST' });
      })
      .catch(() => setItems([]));
  }, [me, loading, router]);

  const render = (n: NotificationView): string => {
    if (!KNOWN_TYPES.has(n.type)) return n.type;
    const params: Record<string, string | number> = {};
    for (const [key, value] of Object.entries(n.data)) {
      params[key] = key === 'amountTiyin' ? money(Number(value), locale) : String(value);
    }
    if ('amountTiyin' in params) params.amount = params.amountTiyin;
    return t(`notif.${n.type}` as TranslationKey, params);
  };

  return (
    <Screen title={t('notif.title')} back>
      {items === null ? (
        <Loading />
      ) : items.length === 0 ? (
        <EmptyState title={t('notif.empty')} />
      ) : (
        <View style={{ gap: tokens.spacing.sm }}>
          {items.map((n) => (
            <View
              key={n.id}
              style={{
                borderWidth: 1,
                borderColor: tokens.colors.gray150,
                borderRadius: tokens.radius.md,
                padding: tokens.spacing.md,
                gap: 2,
                backgroundColor: n.readAt ? tokens.colors.white : tokens.colors.gray50,
              }}
            >
              <AppText variant="small">{render(n)}</AppText>
              <AppText variant="tiny" color={tokens.colors.gray300}>
                {n.createdAt.slice(0, 16).replace('T', ' ')}
              </AppText>
            </View>
          ))}
        </View>
      )}
    </Screen>
  );
}
