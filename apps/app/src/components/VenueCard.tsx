import React from 'react';
import { Image, Pressable, View } from 'react-native';
import { useRouter } from 'expo-router';
import type { VenueCardView } from '@rentqil/shared';
import { tokens } from '@rentqil/shared';
import { useI18n } from '@/lib/i18n';
import { money } from '@/lib/format';
import { AppText } from '@/ui/AppText';
import { Chip } from '@/ui/bits';
import { PolicyBadgeView } from './PolicyBadgeView';

export function VenueCard({ venue }: { venue: VenueCardView }) {
  const { t, locale } = useI18n();
  const router = useRouter();
  const photo = venue.photos[0];

  return (
    <Pressable
      onPress={() => router.push(`/venue/${venue.id}`)}
      style={({ pressed }) => ({
        borderWidth: 1,
        borderColor: tokens.colors.gray150,
        borderRadius: tokens.radius.md,
        overflow: 'hidden',
        opacity: pressed ? 0.85 : 1,
        backgroundColor: tokens.colors.white,
      })}
    >
      {photo ? (
        <Image source={{ uri: photo }} style={{ width: '100%', height: 170, backgroundColor: tokens.colors.gray50 }} />
      ) : (
        <View style={{ width: '100%', height: 80, backgroundColor: tokens.colors.gray50 }} />
      )}
      <View style={{ padding: tokens.spacing.md, gap: tokens.spacing.sm }}>
        <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start', gap: tokens.spacing.sm }}>
          <AppText variant="h3" style={{ flex: 1 }} numberOfLines={1}>
            {venue.name}
          </AppText>
          {venue.priceFromTiyin !== null ? (
            <AppText variant="small" weight="semibold">
              {t('catalog.priceFrom', { price: money(venue.priceFromTiyin, locale) })}
            </AppText>
          ) : null}
        </View>
        <AppText variant="small" color={tokens.colors.gray500} numberOfLines={1}>
          {t(`district.${venue.district}`)} · {venue.address}
          {venue.distanceKm !== undefined ? ` · ${t('catalog.kmAway', { km: venue.distanceKm })}` : ''}
        </AppText>
        <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: tokens.spacing.xs, alignItems: 'center' }}>
          {venue.sports.map((s) => (
            <Chip key={s} label={t(`sport.${s}`)} small />
          ))}
          <PolicyBadgeView badge={venue.policyBadge} />
        </View>
      </View>
    </Pressable>
  );
}
