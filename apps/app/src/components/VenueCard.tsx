import React from 'react';
import { Image, Pressable, View } from 'react-native';
import { useRouter } from 'expo-router';
import { MapPin } from 'lucide-react-native';
import type { VenueCardView } from '@rentqil/shared';
import { tokens } from '@rentqil/shared';
import { useI18n } from '@/lib/i18n';
import { useSports } from '@/lib/sports';
import { money } from '@/lib/format';
import { AppText } from '@/ui/AppText';
import { hardShadow } from '@/ui/shadow';
import { animProps } from '@/ui/anim';
import { Chip } from '@/ui/bits';
import { PolicyBadgeView } from './PolicyBadgeView';
import { SportIcon } from './SportIcon';

// fill stretches the card to the grid cell height so desktop rows stay even;
// the single column phone list must NOT stretch, '100%' of an auto parent
// blows the card up to the whole page there
export function VenueCard({ venue, fill }: { venue: VenueCardView; fill?: boolean }) {
  const { t, locale } = useI18n();
  const { sportName, sportIcon } = useSports();
  const router = useRouter();
  const photo = venue.photos[0];

  return (
    <Pressable
      onPress={() => router.push(`/venue/${venue.id}`)}
      {...animProps}
      style={({ pressed, hovered }: { pressed: boolean; hovered?: boolean }) => ({
        borderWidth: tokens.border,
        borderColor: tokens.colors.text,
        overflow: 'hidden',
        backgroundColor: tokens.colors.white,
        height: fill ? '100%' : undefined,
        ...(pressed
          ? { transform: [{ translateX: 2 }, { translateY: 2 }] }
          : hovered
            ? { transform: [{ translateX: -2 }, { translateY: -2 }], ...hardShadow('md') }
            : hardShadow('sm')),
      })}
    >
      {photo ? (
        <Image source={{ uri: photo }} style={{ width: '100%', height: 180, backgroundColor: tokens.colors.gray50 }} />
      ) : (
        <View
          style={{
            width: '100%',
            height: 180,
            backgroundColor: tokens.colors.gray50,
            alignItems: 'center',
            justifyContent: 'center',
          }}
        >
          <SportIcon icon={sportIcon(venue.sports[0] ?? '')} size={40} color={tokens.colors.gray300} strokeWidth={1.2} />
        </View>
      )}
      <View style={{ padding: tokens.spacing.lg, gap: tokens.spacing.sm, flex: 1 }}>
        <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start', gap: tokens.spacing.sm }}>
          <AppText variant="h3" style={{ flex: 1 }} numberOfLines={1}>
            {venue.name}
          </AppText>
          {venue.priceFromTiyin !== null ? (
            <AppText variant="small" weight="bold">
              {t('catalog.priceFrom', { price: money(venue.priceFromTiyin, locale) })}
            </AppText>
          ) : null}
        </View>
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 5 }}>
          <MapPin size={13} color={tokens.colors.gray500} strokeWidth={1.6} />
          <AppText variant="small" color={tokens.colors.gray500} numberOfLines={1} style={{ flexShrink: 1 }}>
            {t(`region.${venue.region}`)} · {venue.district}
            {venue.distanceKm !== undefined ? ` · ${t('catalog.kmAway', { km: venue.distanceKm })}` : ''}
          </AppText>
        </View>
        <View
          style={{
            marginTop: 'auto',
            flexDirection: 'row',
            flexWrap: 'wrap',
            alignItems: 'center',
            gap: tokens.spacing.xs,
          }}
        >
          <PolicyBadgeView badge={venue.policyBadge} compact />
          {venue.sports.map((s) => (
            <Chip
              key={s}
              label={sportName(s)}
              small
              icon={<SportIcon icon={sportIcon(s)} size={12} color={tokens.colors.gray700} />}
            />
          ))}
        </View>
      </View>
    </Pressable>
  );
}
