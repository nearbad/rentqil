import type {
  DayAvailabilityView,
  PolicyBadge,
  SlotView,
  VenueCardView,
  VenueDetailView,
} from '@rentqil/shared';
import type { CancellationPolicy, Court, PriceRule, ScheduleRule, Venue } from '../lib/db';
import { prisma } from '../lib/db';
import { errors } from '../lib/errors';
import { getPlatformConfig } from './config.service';
import {
  addDays,
  dbDate,
  openHoursForDay,
  priceForHour,
  parseYmd,
  rangesOverlap,
  ymd,
  ymdFromDb,
} from '../domain/slots';

export type CourtWithRules = Court & {
  scheduleRules: ScheduleRule[];
  priceRules: PriceRule[];
};

export type VenueFull = Venue & {
  courts: CourtWithRules[];
  policy: CancellationPolicy | null;
};

export const venueInclude = {
  courts: {
    where: { active: true },
    include: { scheduleRules: true, priceRules: true },
  },
  policy: true,
} as const;

export function policyBadge(policy: CancellationPolicy | null): PolicyBadge {
  if (!policy || !policy.refundEnabled) return { kind: 'no_refund' };
  return {
    kind: 'free_until',
    hours: policy.freeCancelHours,
    latePercent: policy.lateRefundPercent,
  };
}

function minPriceOf(courts: CourtWithRules[]): number | null {
  let min: number | null = null;
  for (const court of courts) {
    for (const rule of court.priceRules) {
      if (min === null || rule.priceTiyin < min) min = rule.priceTiyin;
    }
  }
  return min;
}

export function venueCardView(venue: VenueFull, courts?: CourtWithRules[]): VenueCardView {
  const relevant = courts ?? venue.courts;
  return {
    id: venue.id,
    name: venue.name,
    district: venue.district as VenueCardView['district'],
    address: venue.address,
    photos: venue.photos,
    sports: [...new Set(venue.courts.map((c) => c.sport))] as VenueCardView['sports'],
    amenities: venue.amenities as VenueCardView['amenities'],
    hasIndoor: venue.courts.some((c) => c.indoor),
    hasOutdoor: venue.courts.some((c) => !c.indoor),
    priceFromTiyin: minPriceOf(relevant),
    policyBadge: policyBadge(venue.policy),
    lat: venue.lat,
    lng: venue.lng,
  };
}

export function venueDetailView(venue: VenueFull): VenueDetailView {
  return {
    ...venueCardView(venue),
    description: venue.description,
    courts: venue.courts.map((c) => ({
      id: c.id,
      name: c.name,
      sport: c.sport,
      surface: (c.surface ?? null) as VenueDetailView['courts'][number]['surface'],
      capacity: c.capacity,
      indoor: c.indoor,
    })),
  };
}

export function haversineKm(lat1: number, lng1: number, lat2: number, lng2: number): number {
  const rad = Math.PI / 180;
  const dLat = (lat2 - lat1) * rad;
  const dLng = (lng2 - lng1) * rad;
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(lat1 * rad) * Math.cos(lat2 * rad) * Math.sin(dLng / 2) ** 2;
  return 6371 * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}

// busy ranges for a set of courts and dates, in one round trip each
export async function busyRanges(courtIds: string[], fromYmd: string, toYmd: string) {
  const now = new Date();
  const [bookings, blocked] = await Promise.all([
    prisma.booking.findMany({
      where: {
        courtId: { in: courtIds },
        date: { gte: dbDate(fromYmd), lte: dbDate(toYmd) },
        OR: [
          { status: { in: ['confirmed', 'completed'] } },
          { status: 'pending_payment', expiresAt: { gt: now } },
        ],
      },
      select: {
        courtId: true,
        date: true,
        startHour: true,
        endHour: true,
        userId: true,
        participants: { select: { userId: true } },
      },
    }),
    prisma.blockedSlot.findMany({
      where: {
        courtId: { in: courtIds },
        date: { gte: dbDate(fromYmd), lte: dbDate(toYmd) },
      },
      select: { courtId: true, date: true, startHour: true, endHour: true },
    }),
  ]);
  return { bookings, blocked };
}

export async function courtAvailability(
  courtId: string,
  fromYmd: string | undefined,
  daysWanted: number | undefined,
  userId: string | null
): Promise<DayAvailabilityView[]> {
  const court = await prisma.court.findUnique({
    where: { id: courtId },
    include: { scheduleRules: true, priceRules: true, venue: true },
  });
  if (!court || !court.active) throw errors.notFound('court');
  if (court.venue.status !== 'approved') throw errors.venueNotActive();

  const config = await getPlatformConfig();
  const days = Math.min(daysWanted ?? config.calendarDays, config.calendarDays);

  const today = new Date();
  const start = fromYmd ? parseYmd(fromYmd) : today;
  const from = ymd(start);
  const to = ymd(addDays(start, days - 1));

  const { bookings, blocked } = await busyRanges([courtId], from, to);
  const nowHour = today.getHours();
  const todayYmd = ymd(today);

  const result: DayAvailabilityView[] = [];
  for (let i = 0; i < days; i++) {
    const date = addDays(start, i);
    const dateYmd = ymd(date);
    const openHours = openHoursForDay(court.scheduleRules, date.getDay());

    const dayBookings = bookings.filter((b) => ymdFromDb(b.date) === dateYmd);
    const dayBlocked = blocked.filter((b) => ymdFromDb(b.date) === dateYmd);

    const slots: SlotView[] = [];
    for (const hour of openHours) {
      // past hours of today are not bookable, drop them
      if (dateYmd === todayYmd && hour <= nowHour) continue;

      const price = priceForHour(court.priceRules, date.getDay(), hour);
      // no price rule means the owner does not sell this hour
      if (price === null) continue;

      const hit = dayBookings.find((b) => rangesOverlap(hour, hour + 1, b.startHour, b.endHour));
      const isBlocked = dayBlocked.some((b) => rangesOverlap(hour, hour + 1, b.startHour, b.endHour));

      let state: SlotView['state'] = 'free';
      if (isBlocked || hit) {
        const mine =
          hit &&
          userId !== null &&
          (hit.userId === userId || hit.participants.some((p) => p.userId === userId));
        state = mine ? 'yours' : 'busy';
      }
      slots.push({ hour, priceTiyin: price, state });
    }
    result.push({ date: dateYmd, slots });
  }
  return result;
}
