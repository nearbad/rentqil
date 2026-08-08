import React, { useCallback, useState } from 'react';
import { Pressable, View } from 'react-native';
import { useFocusEffect, useRouter } from 'expo-router';
import { BarChart3, CalendarDays, ChevronRight, Plus, Wallet } from 'lucide-react-native';
import type { OwnerVenueView } from '@rentqil/shared';
import { tokens } from '@rentqil/shared';
import { api } from '@/lib/api';
import { useI18n } from '@/lib/i18n';
import { useRequireRole } from '@/lib/guards';
import { Screen } from '@/ui/Screen';
import { AppText } from '@/ui/AppText';
import { Badge, Card, EmptyState, Loading } from '@/ui/bits';

function venueStatusTone(status: OwnerVenueView['status']): 'neutral' | 'success' | 'danger' {
  if (status === 'approved') return 'success';
  if (status === 'rejected') return 'danger';
  return 'neutral';
}

export default function OwnerHome() {
  const { t } = useI18n();
  const router = useRouter();
  const { ready } = useRequireRole('owner', 'admin');
  const [venues, setVenues] = useState<OwnerVenueView[] | null>(null);

  useFocusEffect(
    useCallback(() => {
      if (!ready) return;
      api<{ items: OwnerVenueView[] }>('/owner/venues')
        .then((r) => setVenues(r.items))
        .catch(() => setVenues([]));
    }, [ready])
  );

  if (!ready) return <Screen title={t('owner.title')} back>{null}</Screen>;

  const navCard = (icon: React.ReactNode, label: string, path: string) => (
    <Pressable
      onPress={() => router.push(path as never)}
      style={{
        flex: 1,
        borderWidth: 1,
        borderColor: tokens.colors.gray150,
        borderRadius: tokens.radius.md,
        padding: tokens.spacing.md,
        gap: tokens.spacing.sm,
        alignItems: 'center',
      }}
    >
      {icon}
      <AppText variant="tiny" weight="medium" center>
        {label}
      </AppText>
    </Pressable>
  );

  return (
    <Screen title={t('owner.title')} back>
      <View style={{ gap: tokens.spacing.lg }}>
        <View style={{ flexDirection: 'row', gap: tokens.spacing.sm }}>
          {navCard(<CalendarDays size={20} color={tokens.colors.text} strokeWidth={1.6} />, t('owner.bookings'), '/owner/bookings')}
          {navCard(<Wallet size={20} color={tokens.colors.text} strokeWidth={1.6} />, t('owner.finance'), '/owner/finance')}
          {navCard(<BarChart3 size={20} color={tokens.colors.text} strokeWidth={1.6} />, t('owner.stats'), '/owner/stats')}
        </View>

        <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
          <AppText variant="h3">{t('owner.venues')}</AppText>
          <Pressable
            onPress={() => router.push('/owner/venue/new')}
            style={{ flexDirection: 'row', alignItems: 'center', gap: tokens.spacing.xs }}
            hitSlop={tokens.hitSlop}
          >
            <Plus size={18} color={tokens.colors.text} strokeWidth={2} />
            <AppText variant="small" weight="semibold">
              {t('owner.newVenue')}
            </AppText>
          </Pressable>
        </View>

        {venues === null ? (
          <Loading />
        ) : venues.length === 0 ? (
          <EmptyState title={t('owner.venues')} hint={t('owner.newVenue')} />
        ) : (
          <View style={{ gap: tokens.spacing.md }}>
            {venues.map((venue) => (
              <Card key={venue.id} style={{ padding: 0 }}>
                <Pressable
                  onPress={() => router.push(`/owner/venue/${venue.id}`)}
                  style={{ padding: tokens.spacing.lg, gap: tokens.spacing.sm }}
                >
                  <View style={{ flexDirection: 'row', alignItems: 'center', gap: tokens.spacing.sm }}>
                    <AppText variant="h3" style={{ flex: 1 }} numberOfLines={1}>
                      {venue.name}
                    </AppText>
                    <Badge text={t(`owner.venueStatus.${venue.status}`)} tone={venueStatusTone(venue.status)} />
                    <ChevronRight size={18} color={tokens.colors.gray300} strokeWidth={1.6} />
                  </View>
                  <AppText variant="small" color={tokens.colors.gray500}>
                    {t(`district.${venue.district}`)} · {venue.courts.length} {t('owner.courts').toLowerCase()}
                  </AppText>
                  {venue.hasPendingChanges ? (
                    <Badge text={t('owner.pendingChanges')} />
                  ) : null}
                  {venue.status === 'rejected' && venue.moderationComment ? (
                    <AppText variant="small" color={tokens.colors.danger}>
                      {t('owner.moderationComment')}: {venue.moderationComment}
                    </AppText>
                  ) : null}
                </Pressable>
              </Card>
            ))}
          </View>
        )}
      </View>
    </Screen>
  );
}
