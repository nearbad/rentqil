import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { Image, ScrollView, View, useWindowDimensions } from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import type { DayAvailabilityView, VenueDetailView } from '@rentqil/shared';
import { tokens } from '@rentqil/shared';
import { api } from '@/lib/api';
import { useAuth } from '@/lib/auth';
import { useI18n } from '@/lib/i18n';
import { money } from '@/lib/format';
import { Screen } from '@/ui/Screen';
import { AppText } from '@/ui/AppText';
import { Button } from '@/ui/Button';
import { Chip, Divider, EmptyState, Loading } from '@/ui/bits';
import { PolicyBadgeView } from '@/components/PolicyBadgeView';
import { MiniMap } from '@/components/MiniMap';
import { SlotCalendar } from '@/components/SlotCalendar';

export default function VenueScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const { t, locale } = useI18n();
  const { me } = useAuth();
  const router = useRouter();
  const { width } = useWindowDimensions();

  const [venue, setVenue] = useState<VenueDetailView | null>(null);
  const [notFound, setNotFound] = useState(false);
  const [courtId, setCourtId] = useState<string | null>(null);
  const [days, setDays] = useState<DayAvailabilityView[] | null>(null);
  const [selectedDate, setSelectedDate] = useState<string>('');
  const [selectedHours, setSelectedHours] = useState<number[]>([]);

  useEffect(() => {
    if (!id) return;
    api<VenueDetailView>(`/venues/${id}`)
      .then((v) => {
        setVenue(v);
        setCourtId(v.courts[0]?.id ?? null);
      })
      .catch(() => setNotFound(true));
  }, [id]);

  const loadAvailability = useCallback(async () => {
    if (!courtId) return;
    setDays(null);
    setSelectedHours([]);
    const res = await api<{ days: DayAvailabilityView[] }>(`/courts/${courtId}/availability`);
    setDays(res.days);
    setSelectedDate((prev) => (res.days.some((d) => d.date === prev) ? prev : (res.days[0]?.date ?? '')));
  }, [courtId]);

  useEffect(() => {
    loadAvailability().catch(() => setDays([]));
  }, [loadAvailability]);

  const toggleHour = (hour: number) => {
    setSelectedHours((prev) => {
      if (prev.includes(hour)) {
        // allow shrinking only from the edges, otherwise restart from this hour
        if (hour === Math.min(...prev) || hour === Math.max(...prev)) {
          return prev.filter((h) => h !== hour);
        }
        return [hour];
      }
      if (prev.length === 0) return [hour];
      const min = Math.min(...prev);
      const max = Math.max(...prev);
      if (hour === min - 1 || hour === max + 1) return [...prev, hour].sort((a, b) => a - b);
      // not adjacent, start a new selection
      return [hour];
    });
  };

  const selection = useMemo(() => {
    if (selectedHours.length === 0 || !days) return null;
    const day = days.find((d) => d.date === selectedDate);
    if (!day) return null;
    const total = day.slots
      .filter((s) => selectedHours.includes(s.hour))
      .reduce((sum, s) => sum + s.priceTiyin, 0);
    return { start: Math.min(...selectedHours), end: Math.max(...selectedHours) + 1, total };
  }, [selectedHours, days, selectedDate]);

  if (notFound) {
    return (
      <Screen title="" back>
        <EmptyState title={t('error.NOT_FOUND')} />
      </Screen>
    );
  }
  if (!venue) {
    return (
      <Screen title="" back>
        <Loading />
      </Screen>
    );
  }

  const imageWidth = Math.min(width, tokens.maxContentWidth) - tokens.spacing.lg * 2;
  const court = venue.courts.find((c) => c.id === courtId) ?? null;

  const book = () => {
    if (!selection || !courtId) return;
    const target = `/book?courtId=${courtId}&date=${selectedDate}&start=${selection.start}&end=${selection.end}`;
    if (!me) {
      router.push(`/login?next=${encodeURIComponent(target)}`);
    } else {
      router.push(target as never);
    }
  };

  return (
    <Screen
      title={venue.name}
      back
      footer={
        selection ? (
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: tokens.spacing.lg }}>
            <View style={{ flex: 1 }}>
              <AppText variant="small" color={tokens.colors.gray500}>
                {t('venue.selectedSlots', { from: selection.start, to: selection.end })}
              </AppText>
              <AppText variant="h3">{money(selection.total, locale)}</AppText>
            </View>
            <Button title={t('book.cta')} onPress={book} />
          </View>
        ) : undefined
      }
    >
      <View style={{ gap: tokens.spacing.lg }}>
        {venue.photos.length > 0 ? (
          <ScrollView horizontal pagingEnabled showsHorizontalScrollIndicator={false} style={{ marginTop: tokens.spacing.xs }}>
            {venue.photos.map((photo) => (
              <Image
                key={photo}
                source={{ uri: photo }}
                style={{
                  width: imageWidth,
                  height: 200,
                  borderRadius: tokens.radius.md,
                  marginRight: tokens.spacing.sm,
                  backgroundColor: tokens.colors.gray50,
                }}
              />
            ))}
          </ScrollView>
        ) : null}

        <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: tokens.spacing.xs, alignItems: 'center' }}>
          {venue.sports.map((s) => (
            <Chip key={s} label={t(`sport.${s}`)} small />
          ))}
          <PolicyBadgeView badge={venue.policyBadge} />
        </View>

        {venue.description ? (
          <View style={{ gap: tokens.spacing.xs }}>
            <AppText variant="h3">{t('venue.about')}</AppText>
            <AppText color={tokens.colors.gray700}>{venue.description}</AppText>
          </View>
        ) : null}

        {venue.amenities.length > 0 ? (
          <View style={{ gap: tokens.spacing.sm }}>
            <AppText variant="h3">{t('venue.amenities')}</AppText>
            <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: tokens.spacing.sm }}>
              {venue.amenities.map((a) => (
                <Chip key={a} label={t(`amenity.${a}`)} small />
              ))}
            </View>
          </View>
        ) : null}

        <View style={{ gap: tokens.spacing.sm }}>
          <AppText variant="h3">{t('venue.address')}</AppText>
          <AppText variant="small" color={tokens.colors.gray500}>
            {t(`district.${venue.district}`)} · {venue.address}
          </AppText>
          <MiniMap lat={venue.lat} lng={venue.lng} address={venue.address} />
        </View>

        <Divider />

        <View style={{ gap: tokens.spacing.md }}>
          <AppText variant="h3">{t('venue.calendar')}</AppText>

          {venue.courts.length > 1 ? (
            <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: tokens.spacing.sm }}>
              {venue.courts.map((c) => (
                <Chip
                  key={c.id}
                  label={`${c.name} · ${t(`sport.${c.sport}`)}`}
                  selected={c.id === courtId}
                  onPress={() => setCourtId(c.id)}
                />
              ))}
            </ScrollView>
          ) : null}

          {court ? (
            <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: tokens.spacing.sm }}>
              <Chip label={court.indoor ? t('court.indoor') : t('court.outdoor')} small />
              {court.surface ? <Chip label={t(`surface.${court.surface}`)} small /> : null}
              {court.capacity ? <Chip label={`${t('court.capacity')}: ${court.capacity}`} small /> : null}
            </View>
          ) : null}

          {days === null ? (
            <Loading />
          ) : (
            <SlotCalendar
              days={days}
              selectedDate={selectedDate}
              onSelectDate={(d) => {
                setSelectedDate(d);
                setSelectedHours([]);
              }}
              selectedHours={selectedHours}
              onToggleHour={toggleHour}
            />
          )}
        </View>
      </View>
    </Screen>
  );
}
