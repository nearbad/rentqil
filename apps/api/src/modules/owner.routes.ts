import type { FastifyInstance, FastifyRequest } from 'fastify';
import type { OwnerBookingView } from '@rentqil/shared';
import {
  blockSlotSchema,
  courtUpsertSchema,
  ownerApplySchema,
  policySchema,
  priceSetSchema,
  scheduleSetSchema,
  venueUpsertSchema,
  ymdSchema,
} from '@rentqil/shared';
import { z } from 'zod';
import { prisma } from '../lib/db';
import type { Prisma } from '../lib/db';
import { parse } from '../lib/validate';
import { errors } from '../lib/errors';
import { notifier } from '../lib/notifier';
import { getPlatformConfig } from '../services/config.service';
import { venueInclude } from '../services/venue.service';
import { ownerFinance, ownerStats, ownerVenueView } from '../services/owner.service';
import { bookingView } from '../services/booking.service';
import { refundAllBookingPayments } from '../services/payment.service';
import { dbDate } from '../domain/slots';

// fields that need admin eyes before going live on an approved venue
const CRITICAL_FIELDS = ['name', 'description', 'address', 'district', 'lat', 'lng', 'photos'] as const;

async function myVenue(req: FastifyRequest, venueId: string) {
  const venue = await prisma.venue.findUnique({ where: { id: venueId }, include: venueInclude });
  if (!venue) throw errors.notFound('venue');
  if (venue.ownerId !== req.user!.id && req.user!.role !== 'admin') throw errors.forbidden();
  return venue;
}

async function myCourt(req: FastifyRequest, courtId: string) {
  const court = await prisma.court.findUnique({ where: { id: courtId }, include: { venue: true } });
  if (!court) throw errors.notFound('court');
  if (court.venue.ownerId !== req.user!.id && req.user!.role !== 'admin') throw errors.forbidden();
  return court;
}

export async function ownerRoutes(app: FastifyInstance) {
  // any signed in user can apply for the owner role
  app.post('/owner/apply', { preHandler: app.requireUser }, async (req) => {
    const { message } = parse(ownerApplySchema, req.body);
    const existing = await prisma.ownerApplication.findUnique({ where: { userId: req.user!.id } });
    if (existing && existing.status === 'pending') return { ok: true };
    if (existing) {
      await prisma.ownerApplication.update({
        where: { userId: req.user!.id },
        data: { status: 'pending', message: message ?? null, adminComment: null, decidedAt: null },
      });
    } else {
      await prisma.ownerApplication.create({ data: { userId: req.user!.id, message: message ?? null } });
    }
    return { ok: true };
  });

  const ownerOnly = { preHandler: app.requireRole('owner', 'admin') };

  app.get('/owner/venues', ownerOnly, async (req) => {
    const venues = await prisma.venue.findMany({
      where: { ownerId: req.user!.id },
      include: venueInclude,
      orderBy: { createdAt: 'desc' },
    });
    return { items: await Promise.all(venues.map(ownerVenueView)) };
  });

  app.post('/owner/venues', ownerOnly, async (req) => {
    const body = parse(venueUpsertSchema, req.body);
    const config = await getPlatformConfig();
    if (
      body.depositPercent !== undefined &&
      (body.depositPercent < config.minDepositPercent || body.depositPercent > config.maxDepositPercent)
    ) {
      throw errors.depositRange();
    }
    const venue = await prisma.venue.create({
      data: {
        ownerId: req.user!.id,
        name: body.name,
        description: body.description,
        address: body.address,
        district: body.district,
        lat: body.lat,
        lng: body.lng,
        photos: body.photos,
        amenities: body.amenities,
        depositPercent: body.depositPercent ?? null,
        status: 'pending',
        policy: { create: {} },
      },
      include: venueInclude,
    });
    return ownerVenueView(venue);
  });

  app.get('/owner/venues/:id', ownerOnly, async (req) => {
    const { id } = req.params as { id: string };
    const venue = await myVenue(req, id);
    return ownerVenueView(venue);
  });

  app.patch('/owner/venues/:id', ownerOnly, async (req) => {
    const { id } = req.params as { id: string };
    const venue = await myVenue(req, id);
    const body = parse(venueUpsertSchema.partial(), req.body);
    const config = await getPlatformConfig();
    if (
      body.depositPercent !== undefined &&
      (body.depositPercent < config.minDepositPercent || body.depositPercent > config.maxDepositPercent)
    ) {
      throw errors.depositRange();
    }

    const critical: Record<string, unknown> = {};
    const direct: Record<string, unknown> = {};
    for (const [key, value] of Object.entries(body)) {
      if (value === undefined) continue;
      if ((CRITICAL_FIELDS as readonly string[]).includes(key)) critical[key] = value;
      else direct[key] = value;
    }

    if (venue.status === 'approved' && Object.keys(critical).length > 0) {
      // approved venues keep serving old data, the patch waits for moderation
      const merged = { ...((venue.pendingChanges as object) ?? {}), ...critical };
      await prisma.venue.update({
        where: { id },
        data: {
          ...direct,
          pendingChanges: merged as Prisma.InputJsonValue,
        },
      });
    } else {
      await prisma.venue.update({
        where: { id },
        data: {
          ...direct,
          ...critical,
          // rejected or fresh venues go back to the moderation queue on edit
          ...(Object.keys(critical).length > 0 ? { status: 'pending', moderationComment: null } : {}),
        },
      });
    }
    return ownerVenueView(await myVenue(req, id));
  });

  app.put('/owner/venues/:id/policy', ownerOnly, async (req) => {
    const { id } = req.params as { id: string };
    await myVenue(req, id);
    const body = parse(policySchema, req.body);
    await prisma.cancellationPolicy.upsert({
      where: { venueId: id },
      update: body,
      create: { venueId: id, ...body },
    });
    return { ok: true };
  });

  // courts

  app.post('/owner/venues/:id/courts', ownerOnly, async (req) => {
    const { id } = req.params as { id: string };
    await myVenue(req, id);
    const body = parse(courtUpsertSchema, req.body);
    const court = await prisma.court.create({
      data: { venueId: id, ...body, surface: body.surface ?? null, capacity: body.capacity ?? null },
    });
    return court;
  });

  app.patch('/owner/courts/:id', ownerOnly, async (req) => {
    const { id } = req.params as { id: string };
    await myCourt(req, id);
    const body = parse(courtUpsertSchema.partial(), req.body);
    return prisma.court.update({ where: { id }, data: body });
  });

  app.get('/owner/courts/:id', ownerOnly, async (req) => {
    const { id } = req.params as { id: string };
    await myCourt(req, id);
    const court = await prisma.court.findUnique({
      where: { id },
      include: {
        scheduleRules: { orderBy: { dayOfWeek: 'asc' } },
        priceRules: { orderBy: [{ dayOfWeek: { sort: 'asc', nulls: 'first' } }, { startHour: 'asc' }] },
      },
    });
    return court;
  });

  app.put('/owner/courts/:id/schedule', ownerOnly, async (req) => {
    const { id } = req.params as { id: string };
    await myCourt(req, id);
    const { rules } = parse(scheduleSetSchema, req.body);
    await prisma.$transaction([
      prisma.scheduleRule.deleteMany({ where: { courtId: id } }),
      prisma.scheduleRule.createMany({ data: rules.map((r) => ({ courtId: id, ...r })) }),
    ]);
    return { ok: true };
  });

  app.put('/owner/courts/:id/prices', ownerOnly, async (req) => {
    const { id } = req.params as { id: string };
    await myCourt(req, id);
    const { rules } = parse(priceSetSchema, req.body);
    await prisma.$transaction([
      prisma.priceRule.deleteMany({ where: { courtId: id } }),
      prisma.priceRule.createMany({ data: rules.map((r) => ({ courtId: id, ...r })) }),
    ]);
    return { ok: true };
  });

  // manual blocks: phone bookings, repairs

  app.get('/owner/courts/:id/blocks', ownerOnly, async (req) => {
    const { id } = req.params as { id: string };
    await myCourt(req, id);
    const blocks = await prisma.blockedSlot.findMany({
      where: { courtId: id, date: { gte: new Date(Date.now() - 86_400_000) } },
      orderBy: [{ date: 'asc' }, { startHour: 'asc' }],
    });
    return {
      items: blocks.map((b) => ({
        id: b.id,
        date: b.date.toISOString().slice(0, 10),
        startHour: b.startHour,
        endHour: b.endHour,
        reason: b.reason,
      })),
    };
  });

  app.post('/owner/courts/:id/blocks', ownerOnly, async (req) => {
    const { id } = req.params as { id: string };
    await myCourt(req, id);
    const body = parse(blockSlotSchema, req.body);

    // an existing active booking wins over a manual block
    const clash = await prisma.booking.findFirst({
      where: {
        courtId: id,
        date: dbDate(body.date),
        startHour: { lt: body.endHour },
        endHour: { gt: body.startHour },
        OR: [
          { status: { in: ['confirmed', 'completed'] } },
          { status: 'pending_payment', expiresAt: { gt: new Date() } },
        ],
      },
      select: { id: true },
    });
    if (clash) throw errors.slotTaken();

    return prisma.blockedSlot.create({
      data: { courtId: id, date: dbDate(body.date), startHour: body.startHour, endHour: body.endHour, reason: body.reason ?? null },
    });
  });

  app.delete('/owner/blocks/:id', ownerOnly, async (req) => {
    const { id } = req.params as { id: string };
    const block = await prisma.blockedSlot.findUnique({ where: { id }, include: { court: { include: { venue: true } } } });
    if (!block) throw errors.notFound('block');
    if (block.court.venue.ownerId !== req.user!.id && req.user!.role !== 'admin') throw errors.forbidden();
    await prisma.blockedSlot.delete({ where: { id } });
    return { ok: true };
  });

  // bookings across my venues

  app.get('/owner/bookings', ownerOnly, async (req) => {
    const query = parse(
      z.object({ date: ymdSchema.optional(), courtId: z.string().optional(), venueId: z.string().optional() }),
      req.query
    );
    const where: Prisma.BookingWhereInput = {
      court: { venue: { ownerId: req.user!.id } },
    };
    if (query.date) where.date = dbDate(query.date);
    if (query.courtId) where.courtId = query.courtId;
    if (query.venueId) where.court = { venueId: query.venueId, venue: { ownerId: req.user!.id } };

    const bookings = await prisma.booking.findMany({
      where,
      include: {
        court: { include: { venue: { include: { policy: true } } } },
        participants: { orderBy: { isCreator: 'desc' } },
        user: true,
      },
      orderBy: [{ date: 'desc' }, { startHour: 'asc' }],
      take: 200,
    });

    // split participant phones stay hidden, the creator is the contact person
    const items: OwnerBookingView[] = bookings.map((b) => ({
      ...bookingView(b, null),
      creatorName: b.user.name,
      creatorPhone: b.user.phone,
    }));
    return { items };
  });

  // owner side cancellation always refunds everything, see docs/DECISIONS.md 07
  app.post('/owner/bookings/:id/cancel', ownerOnly, async (req) => {
    const { id } = req.params as { id: string };
    const booking = await prisma.booking.findUnique({
      where: { id },
      include: { court: { include: { venue: true } }, participants: true },
    });
    if (!booking) throw errors.notFound('booking');
    if (booking.court.venue.ownerId !== req.user!.id && req.user!.role !== 'admin') throw errors.forbidden();
    if (booking.status !== 'confirmed' && booking.status !== 'pending_payment') throw errors.bookingState();

    await prisma.booking.update({
      where: { id },
      data: { status: 'cancelled_by_owner', cancelledAt: new Date() },
    });
    await refundAllBookingPayments(id);

    const userIds = new Set<string>([booking.userId]);
    for (const p of booking.participants) if (p.userId) userIds.add(p.userId);
    await Promise.all(
      [...userIds].map((uid) =>
        notifier.notify(uid, 'booking_cancelled', {
          bookingId: id,
          venue: booking.court.venue.name,
        })
      )
    );
    return { ok: true };
  });

  app.post('/owner/bookings/:id/no-show', ownerOnly, async (req) => {
    const { id } = req.params as { id: string };
    const { noShow } = parse(z.object({ noShow: z.boolean() }), req.body);
    const booking = await prisma.booking.findUnique({
      where: { id },
      include: { court: { include: { venue: true } } },
    });
    if (!booking) throw errors.notFound('booking');
    if (booking.court.venue.ownerId !== req.user!.id && req.user!.role !== 'admin') throw errors.forbidden();
    if (booking.status !== 'completed') throw errors.bookingState();
    await prisma.booking.update({ where: { id }, data: { noShow } });
    return { ok: true };
  });

  app.get('/owner/finance', ownerOnly, async (req) => ownerFinance(req.user!.id));
  app.get('/owner/stats', ownerOnly, async (req) => ownerStats(req.user!.id));
}
