import React, { useEffect, useState } from 'react';
import { Pressable, View } from 'react-native';
import { useRouter } from 'expo-router';
import { CheckCheck } from 'lucide-react-native';
import type { NotificationView, TranslationKey } from '@rentqil/shared';
import { tokens } from '@rentqil/shared';
import { api } from '@/lib/api';
import { useAuth } from '@/lib/auth';
import { useI18n } from '@/lib/i18n';
import { useNotifications } from '@/lib/notifications';
import { money } from '@/lib/format';
import { Screen } from '@/ui/Screen';
import { AppText } from '@/ui/AppText';
import { EmptyState, Loading } from '@/ui/bits';

const KNOWN_TYPES = new Set([
  'booking_confirmed',
  'booking_reminder',
  'booking_cancelled',
  'owner_new_booking',
  'refund_issued',
  'split_paid',
  'split_expired',
  'venue_approved',
  'venue_rejected',
  'owner_approved',
  'owner_rejected',
]);

// where tapping a notification takes you, when it points anywhere at all
function targetOf(n: NotificationView): string | null {
  const bookingId = n.data.bookingId;
  if (typeof bookingId === 'string') return `/booking/${bookingId}`;
  const venueId = n.data.venueId;
  if (typeof venueId === 'string') return `/venue/${venueId}`;
  return null;
}

export default function NotificationsScreen() {
  const { t, locale } = useI18n();
  const { me, loading } = useAuth();
  const { markRead, markAllRead, refresh } = useNotifications();
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
        refresh();
      })
      .catch(() => setItems([]));
  }, [me, loading, router, refresh]);

  const render = (n: NotificationView): string => {
    if (!KNOWN_TYPES.has(n.type)) return n.type;
    const params: Record<string, string | number> = {};
    for (const [key, value] of Object.entries(n.data)) {
      params[key] = key === 'amountTiyin' ? money(Number(value), locale) : String(value);
    }
    if ('amountTiyin' in params) params.amount = params.amountTiyin;
    return t(`notif.${n.type}` as TranslationKey, params);
  };

  const readOne = (n: NotificationView) => {
    if (!n.readAt) {
      const now = new Date().toISOString();
      setItems((prev) => prev?.map((x) => (x.id === n.id ? { ...x, readAt: now } : x)) ?? prev);
      void markRead(n.id);
    }
    const target = targetOf(n);
    if (target) router.push(target as never);
  };

  const readAll = () => {
    const now = new Date().toISOString();
    setItems((prev) => prev?.map((x) => (x.readAt ? x : { ...x, readAt: now })) ?? prev);
    void markAllRead();
  };

  const hasUnread = (items ?? []).some((n) => !n.readAt);

  return (
    <Screen
      title={t('notif.title')}
      back
      right={
        hasUnread ? (
          <Pressable onPress={readAll} hitSlop={tokens.hitSlop} accessibilityLabel={t('notif.markAll')}>
            {({ pressed }: { pressed: boolean }) => (
              <CheckCheck
                size={20}
                color={pressed ? tokens.colors.text : tokens.colors.gray700}
                strokeWidth={1.6}
              />
            )}
          </Pressable>
        ) : null
      }
    >
      {items === null ? (
        <Loading />
      ) : items.length === 0 ? (
        <EmptyState title={t('notif.empty')} />
      ) : (
        <View style={{ gap: tokens.spacing.sm }}>
          {items.map((n) => (
            <Pressable
              key={n.id}
              onPress={() => readOne(n)}
              style={({ hovered }: { hovered?: boolean }) => ({
                flexDirection: 'row',
                alignItems: 'flex-start',
                gap: tokens.spacing.sm,
                borderWidth: 1,
                borderColor: hovered ? tokens.colors.text : tokens.colors.gray150,
                borderRadius: tokens.radius.md,
                padding: tokens.spacing.md,
                backgroundColor: n.readAt ? tokens.colors.white : tokens.colors.gray50,
              })}
            >
              {/* unread rows carry the same red dot as the header bell */}
              <View
                style={{
                  width: 8,
                  height: 8,
                  borderRadius: 4,
                  marginTop: 5,
                  backgroundColor: n.readAt ? 'transparent' : tokens.colors.accent,
                }}
              />
              <View style={{ flex: 1, gap: 2 }}>
                <AppText variant="small" weight={n.readAt ? 'regular' : 'medium'}>
                  {render(n)}
                </AppText>
                <AppText variant="tiny" color={tokens.colors.gray300}>
                  {n.createdAt.slice(0, 16).replace('T', ' ')}
                </AppText>
              </View>
            </Pressable>
          ))}
        </View>
      )}
    </Screen>
  );
}
