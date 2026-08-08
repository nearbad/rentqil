import type { FastifyInstance } from 'fastify';
import type { PlatformConfigView, VenueCardView } from '@rentqil/shared';
import { availabilityQuerySchema, catalogQuerySchema } from '@rentqil/shared';
import { prisma } from '../lib/db';
import { parse } from '../lib/validate';
import { errors } from '../lib/errors';
import { getPlatformConfig } from './../services/config.service';
import {
  busyRanges,
  courtAvailability,
  haversineKm,
  venueCardView,
  venueDetailView,
  venueInclude,
  type CourtWithRules,
} from '../services/venue.service';
import { openHoursForDay, rangesOverlap, weekdayOf, ymdFromDb } from '../domain/slots';

export async function catalogRoutes(app: FastifyInstance) {
  // public catalog with filters, the venue count is small enough
  // to filter in process for now
  app.get('/venues', async (req) => {
    const q = parse(catalogQuerySchema, req.query);

    const venues = await prisma.venue.findMany({
      where: { status: 'approved' },
      include: venueInclude,
      orderBy: { createdAt: 'desc' },
    });

    let cards: { card: VenueCardView; matching: CourtWithRules[] }[] = [];

    for (const venue of venues) {
      let matching = venue.courts;
      if (q.sport) matching = matching.filter((c) => c.sport === q.sport);
      if (q.indoor !== undefined) matching = matching.filter((c) => c.indoor === q.indoor);
      if (matching.length === 0) continue;
      if (q.district && venue.district !== q.district) continue;
      if (q.q && !venue.name.toLowerCase().includes(q.q.toLowerCase())) continue;

      const card = venueCardView(venue, matching);
      if (q.priceMaxTiyin !== undefined) {
        if (card.priceFromTiyin === null || card.priceFromTiyin > q.priceMaxTiyin) continue;
      }
      cards.push({ card, matching });
    }

    // "free at date+hour" filter needs the busy ranges of the remaining courts
    if (q.date && q.hour !== undefined) {
      const hour = q.hour;
      const date = q.date;
      const weekday = weekdayOf(date);
      const courtIds = cards.flatMap(({ matching }) => matching.map((c) => c.id));
      const { bookings, blocked } = await busyRanges(courtIds, date, date);
      const busyByCourt = new Map<string, { startHour: number; endHour: number }[]>();
      for (const b of [...bookings, ...blocked]) {
        if (ymdFromDb(b.date) !== date) continue;
        const list = busyByCourt.get(b.courtId) ?? [];
        list.push({ startHour: b.startHour, endHour: b.endHour });
        busyByCourt.set(b.courtId, list);
      }

      cards = cards.filter(({ matching }) =>
        matching.some((court) => {
          const open = openHoursForDay(court.scheduleRules, weekday);
          if (!open.includes(hour)) return false;
          const busy = busyByCourt.get(court.id) ?? [];
          return !busy.some((r) => rangesOverlap(hour, hour + 1, r.startHour, r.endHour));
        })
      );
    }

    let items = cards.map(({ card }) => card);

    if (q.sort === 'price') {
      items.sort((a, b) => (a.priceFromTiyin ?? Infinity) - (b.priceFromTiyin ?? Infinity));
    } else if (q.sort === 'distance' && q.lat !== undefined && q.lng !== undefined) {
      const lat = q.lat;
      const lng = q.lng;
      items = items
        .map((card) => ({
          ...card,
          distanceKm: Math.round(haversineKm(lat, lng, card.lat, card.lng) * 10) / 10,
        }))
        .sort((a, b) => (a.distanceKm ?? 0) - (b.distanceKm ?? 0));
    }

    return { items };
  });

  app.get('/venues/:id', async (req) => {
    const { id } = req.params as { id: string };
    const venue = await prisma.venue.findUnique({ where: { id }, include: venueInclude });
    if (!venue || venue.status !== 'approved') throw errors.notFound('venue');
    return venueDetailView(venue);
  });

  app.get('/courts/:id/availability', { preHandler: app.optionalUser }, async (req) => {
    const { id } = req.params as { id: string };
    const q = parse(availabilityQuerySchema, req.query);
    const days = await courtAvailability(id, q.from, q.days, req.user?.id ?? null);
    return { days };
  });

  // public platform parameters the app needs before booking
  app.get('/config', async () => {
    const c = await getPlatformConfig();
    const view: PlatformConfigView = {
      serviceFeeEnabled: c.serviceFeeEnabled,
      serviceFeeTiyin: c.serviceFeeTiyin,
      commissionEnabled: c.commissionEnabled,
      commissionPercent: c.commissionPercent,
      defaultDepositPercent: c.defaultDepositPercent,
      minDepositPercent: c.minDepositPercent,
      maxDepositPercent: c.maxDepositPercent,
      bookingTtlMinutes: c.bookingTtlMinutes,
      splitTtlMinutes: c.splitTtlMinutes,
      calendarDays: c.calendarDays,
      slotMinutes: c.slotMinutes,
      reminderHours: c.reminderHours,
    };
    return view;
  });
}
