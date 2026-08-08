import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { Image, Modal, Pressable, View, useWindowDimensions } from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { ChevronLeft, ChevronRight, DoorOpen, FileText, IdCard, Lightbulb, MapPin, ShowerHead, SquareParking, Users, X } from 'lucide-react-native';
import type { Amenity, DayAvailabilityView, VenueDetailView } from '@rentqil/shared';
import { tokens } from '@rentqil/shared';
import { api } from '@/lib/api';
import { useAuth } from '@/lib/auth';
import { useI18n } from '@/lib/i18n';
import { useSports } from '@/lib/sports';
import { money } from '@/lib/format';
import { Screen } from '@/ui/Screen';
import { AppText } from '@/ui/AppText';
import { Button } from '@/ui/Button';
import { Chip, Divider, EmptyState, Loading } from '@/ui/bits';
import { PolicyBadgeView } from '@/components/PolicyBadgeView';
import { MiniMap } from '@/components/MiniMap';
import { SlotCalendar } from '@/components/SlotCalendar';
import { SportIcon } from '@/components/SportIcon';

const AMENITY_ICONS: Record<Amenity, React.ComponentType<{ size?: number; color?: string; strokeWidth?: number }>> = {
  locker_room: DoorOpen,
  shower: ShowerHead,
  lighting: Lightbulb,
  parking: SquareParking,
};

export default function VenueScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const { t, locale } = useI18n();
  const { sportName, sportIcon } = useSports();
  const { me } = useAuth();
  const router = useRouter();
  const { width } = useWindowDimensions();
  const desktop = width >= tokens.breakpointDesktop;

  const [venue, setVenue] = useState<VenueDetailView | null>(null);
  const [photoIndex, setPhotoIndex] = useState(0);
  const [lightbox, setLightbox] = useState(false);
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

  const photo = venue.photos[Math.min(photoIndex, venue.photos.length - 1)];
  const stepPhoto = (dir: number) =>
    setPhotoIndex((i) => (i + dir + venue.photos.length) % venue.photos.length);

  const infoColumn = (
    <View style={{ gap: tokens.spacing.lg, flex: desktop ? 1 : undefined }}>
      {photo ? (
        <View>
          <Pressable onPress={() => setLightbox(true)}>
            <Image
              source={{ uri: photo }}
              style={{
                width: '100%',
                height: desktop ? 300 : 210,
                backgroundColor: tokens.colors.gray50,
                borderWidth: tokens.border,
                borderColor: tokens.colors.text,
              }}
            />
          </Pressable>
          {venue.photos.length > 1 ? (
            <>
              <Pressable
                onPress={() => stepPhoto(-1)}
                hitSlop={tokens.hitSlop}
                style={{
                  position: 'absolute',
                  left: 8,
                  top: '50%',
                  marginTop: -16,
                  backgroundColor: tokens.colors.white,
                  borderWidth: tokens.border,
                  borderColor: tokens.colors.text,
                  padding: 4,
                }}
              >
                <ChevronLeft size={20} color={tokens.colors.text} strokeWidth={2} />
              </Pressable>
              <Pressable
                onPress={() => stepPhoto(1)}
                hitSlop={tokens.hitSlop}
                style={{
                  position: 'absolute',
                  right: 8,
                  top: '50%',
                  marginTop: -16,
                  backgroundColor: tokens.colors.white,
                  borderWidth: tokens.border,
                  borderColor: tokens.colors.text,
                  padding: 4,
                }}
              >
                <ChevronRight size={20} color={tokens.colors.text} strokeWidth={2} />
              </Pressable>
              <View
                style={{
                  position: 'absolute',
                  bottom: 8,
                  alignSelf: 'center',
                  flexDirection: 'row',
                  gap: 6,
                }}
              >
                {venue.photos.map((p, i) => (
                  <Pressable
                    key={p}
                    onPress={() => setPhotoIndex(i)}
                    hitSlop={tokens.hitSlop}
                    style={{
                      width: 10,
                      height: 10,
                      backgroundColor: i === photoIndex ? tokens.colors.text : tokens.colors.white,
                      borderWidth: 1,
                      borderColor: tokens.colors.text,
                    }}
                  />
                ))}
              </View>
            </>
          ) : null}
        </View>
      ) : null}

      <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: tokens.spacing.xs, alignItems: 'center' }}>
        {venue.sports.map((s) => (
          <Chip key={s} label={sportName(s)} small icon={<SportIcon icon={sportIcon(s)} size={12} />} />
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
          <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: tokens.spacing.md }}>
            {venue.amenities.map((a) => {
              const Icon = AMENITY_ICONS[a] ?? Users;
              return (
                <View key={a} style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                  <Icon size={16} color={tokens.colors.gray700} strokeWidth={1.6} />
                  <AppText variant="small" color={tokens.colors.gray700}>
                    {t(`amenity.${a}`)}
                  </AppText>
                </View>
              );
            })}
          </View>
        </View>
      ) : null}

      {venue.requireNames || venue.requireDocuments || venue.terms ? (
        <View style={{ gap: tokens.spacing.sm }}>
          <AppText variant="h3">{t('venue.conditions')}</AppText>
          {venue.requireNames ? (
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
              <IdCard size={16} color={tokens.colors.gray700} strokeWidth={1.6} />
              <AppText variant="small" color={tokens.colors.gray700}>
                {t('venue.namesRequired')}
              </AppText>
            </View>
          ) : null}
          {venue.requireDocuments ? (
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
              <FileText size={16} color={tokens.colors.gray700} strokeWidth={1.6} />
              <AppText variant="small" color={tokens.colors.gray700}>
                {t('venue.documentsRequired')}
              </AppText>
            </View>
          ) : null}
          {venue.terms ? (
            <AppText variant="small" color={tokens.colors.gray700}>
              {venue.terms}
            </AppText>
          ) : null}
        </View>
      ) : null}

      <View style={{ gap: tokens.spacing.sm }}>
        <AppText variant="h3">{t('venue.address')}</AppText>
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 5 }}>
          <MapPin size={14} color={tokens.colors.gray500} strokeWidth={1.6} />
          <AppText variant="small" color={tokens.colors.gray500} style={{ flexShrink: 1 }}>
            {t(`region.${venue.region}`)}, {venue.district} · {venue.address}
          </AppText>
        </View>
        <MiniMap lat={venue.lat} lng={venue.lng} address={venue.address} />
      </View>
    </View>
  );

  const calendarColumn = (
    <View style={{ gap: tokens.spacing.md, flex: desktop ? 1 : undefined }}>
      <AppText variant="h3">{t('venue.calendar')}</AppText>

      {venue.courts.length > 1 ? (
        <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: tokens.spacing.sm }}>
          {venue.courts.map((c) => (
            <Chip
              key={c.id}
              label={`${c.name} · ${sportName(c.sport)}`}
              selected={c.id === courtId}
              onPress={() => setCourtId(c.id)}
            />
          ))}
        </View>
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
  );

  return (
    <Screen
      title={venue.name}
      back
      wide
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
      <Modal visible={lightbox} transparent animationType="fade" onRequestClose={() => setLightbox(false)}>
        <View style={{ flex: 1, backgroundColor: 'rgba(10,10,10,0.94)', justifyContent: 'center' }}>
          <Pressable
            onPress={() => setLightbox(false)}
            hitSlop={tokens.hitSlop}
            style={{ position: 'absolute', top: 20, right: 20, zIndex: 2, padding: 8 }}
          >
            <X size={28} color={tokens.colors.white} strokeWidth={2} />
          </Pressable>
          {photo ? (
            <Image source={{ uri: photo }} style={{ width: '100%', height: '80%' }} resizeMode="contain" />
          ) : null}
          {venue.photos.length > 1 ? (
            <>
              <Pressable
                onPress={() => stepPhoto(-1)}
                hitSlop={tokens.hitSlop}
                style={{ position: 'absolute', left: 16, top: '50%', marginTop: -20, padding: 8 }}
              >
                <ChevronLeft size={36} color={tokens.colors.white} strokeWidth={2} />
              </Pressable>
              <Pressable
                onPress={() => stepPhoto(1)}
                hitSlop={tokens.hitSlop}
                style={{ position: 'absolute', right: 16, top: '50%', marginTop: -20, padding: 8 }}
              >
                <ChevronRight size={36} color={tokens.colors.white} strokeWidth={2} />
              </Pressable>
            </>
          ) : null}
        </View>
      </Modal>

      {desktop ? (
        <View style={{ flexDirection: 'row', gap: tokens.spacing.xxl, alignItems: 'flex-start' }}>
          {infoColumn}
          {calendarColumn}
        </View>
      ) : (
        <View style={{ gap: tokens.spacing.lg }}>
          {infoColumn}
          <Divider />
          {calendarColumn}
        </View>
      )}
    </Screen>
  );
}
