import type { FastifyInstance } from 'fastify';
import type {
  AdminDashboardView,
  AdminPaymentRowView,
  AdminPayoutRowView,
  AdminUserView,
  ModerationItemView,
  OwnerBookingView,
} from '@rentqil/shared';
import {
  adminConfigSchema,
  adminPayoutSchema,
  adminRefundSchema,
  adminUserBlockSchema,
  adminVenueCommissionSchema,
  applicationDecisionSchema,
  moderationDecisionSchema,
  ymdSchema,
} from '@rentqil/shared';
import { z } from 'zod';
import { prisma, Prisma } from '../lib/db';
import { parse } from '../lib/validate';
import { errors } from '../lib/errors';
import { notifier } from '../lib/notifier';
import { invalidateConfigCache } from '../services/config.service';
import { bookingView } from '../services/booking.service';
import { refundPayment } from '../services/payment.service';
import { dbDate } from '../domain/slots';

// which venue fields land in the moderation diff for edits
const MODERATED_KEYS = ['name', 'description', 'address', 'district', 'lat', 'lng', 'photos'] as const;

export async function adminRoutes(app: FastifyInstance) {
  const adminOnly = { preHandler: app.requireRole('admin') };

  app.get('/admin/dashboard', adminOnly, async () => {
    const now = new Date();
    const dayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    const weekStart = new Date(dayStart.getTime() - 6 * 86_400_000);

    const [bookingsToday, weekBookings, topRaw] = await Promise.all([
      prisma.booking.count({ where: { createdAt: { gte: dayStart } } }),
      prisma.booking.findMany({
        where: { createdAt: { gte: weekStart }, status: { in: ['confirmed', 'completed'] } },
        select: { totalTiyin: true, serviceFeeTiyin: true, commissionTiyin: true },
      }),
      prisma.booking.groupBy({
        by: ['courtId'],
        where: { createdAt: { gte: new Date(now.getTime() - 30 * 86_400_000) }, status: { in: ['confirmed', 'completed'] } },
        _count: { _all: true },
        _sum: { totalTiyin: true },
      }),
    ]);

    // roll court level counters up to venues
    const courts = await prisma.court.findMany({
      where: { id: { in: topRaw.map((r) => r.courtId) } },
      select: { id: true, venueId: true, venue: { select: { name: true } } },
    });
    const byVenue = new Map<string, { name: string; bookings: number; gmvTiyin: number }>();
    for (const row of topRaw) {
      const court = courts.find((c) => c.id === row.courtId);
      if (!court) continue;
      const entry = byVenue.get(court.venueId) ?? { name: court.venue.name, bookings: 0, gmvTiyin: 0 };
      entry.bookings += row._count._all;
      entry.gmvTiyin += row._sum.totalTiyin ?? 0;
      byVenue.set(court.venueId, entry);
    }

    const view: AdminDashboardView = {
      bookingsToday,
      bookingsWeek: weekBookings.length,
      gmvWeekTiyin: weekBookings.reduce((s, b) => s + b.totalTiyin, 0),
      serviceFeesWeekTiyin: weekBookings.reduce((s, b) => s + b.serviceFeeTiyin, 0),
      commissionWeekTiyin: weekBookings.reduce((s, b) => s + b.commissionTiyin, 0),
      topVenues: [...byVenue.entries()]
        .map(([venueId, v]) => ({ venueId, ...v }))
        .sort((a, b) => b.bookings - a.bookings)
        .slice(0, 5),
    };
    return view;
  });

  // moderation queue: brand new venues plus edits waiting in pendingChanges

  app.get('/admin/moderation', adminOnly, async () => {
    const venues = await prisma.venue.findMany({
      where: { OR: [{ status: 'pending' }, { pendingChanges: { not: Prisma.DbNull } }] },
      include: { owner: true },
      orderBy: { updatedAt: 'asc' },
    });

    const items: ModerationItemView[] = venues.map((v) => {
      const isNew = v.status === 'pending';
      const current: Record<string, unknown> = {};
      for (const key of MODERATED_KEYS) current[key] = v[key];
      return {
        venueId: v.id,
        venueName: v.name,
        ownerPhone: v.owner.phone,
        kind: isNew ? 'new' : 'edit',
        submittedAt: v.updatedAt.toISOString(),
        current: isNew ? null : current,
        requested: isNew ? current : ((v.pendingChanges ?? {}) as Record<string, unknown>),
      };
    });
    return { items };
  });

  app.post('/admin/moderation/:venueId', adminOnly, async (req) => {
    const { venueId } = req.params as { venueId: string };
    const { approve, comment } = parse(moderationDecisionSchema, req.body);
    const venue = await prisma.venue.findUnique({ where: { id: venueId } });
    if (!venue) throw errors.notFound('venue');

    const isNew = venue.status === 'pending';
    if (isNew) {
      await prisma.venue.update({
        where: { id: venueId },
        data: approve
          ? { status: 'approved', moderationComment: null }
          : { status: 'rejected', moderationComment: comment ?? null },
      });
    } else if (venue.pendingChanges) {
      const changes = venue.pendingChanges as Record<string, unknown>;
      await prisma.venue.update({
        where: { id: venueId },
        data: approve
          ? { ...(changes as object), pendingChanges: Prisma.DbNull, moderationComment: null }
          : { pendingChanges: Prisma.DbNull, moderationComment: comment ?? null },
      });
    } else {
      throw errors.bookingState();
    }

    await notifier.notify(venue.ownerId, approve ? 'venue_approved' : 'venue_rejected', {
      venueId,
      venue: venue.name,
      comment: comment ?? null,
    });
    return { ok: true };
  });

  // users and owner applications

  app.get('/admin/users', adminOnly, async (req) => {
    const { q } = parse(z.object({ q: z.string().trim().max(100).optional() }), req.query);
    const where: Prisma.UserWhereInput = q
      ? {
          OR: [
            { phone: { contains: q } },
            { name: { contains: q, mode: 'insensitive' } },
          ],
        }
      : {};
    const users = await prisma.user.findMany({
      where,
      include: { ownerApplication: true, _count: { select: { bookings: true } } },
      orderBy: { createdAt: 'desc' },
      take: 100,
    });
    const items: AdminUserView[] = users.map((u) => ({
      id: u.id,
      phone: u.phone,
      name: u.name,
      role: u.role,
      blocked: u.blockedAt !== null,
      createdAt: u.createdAt.toISOString(),
      bookingsCount: u._count.bookings,
      ownerApplicationStatus: u.ownerApplication?.status ?? 'none',
    }));
    return { items };
  });

  app.post('/admin/users/:id/block', adminOnly, async (req) => {
    const { id } = req.params as { id: string };
    const { blocked } = parse(adminUserBlockSchema, req.body);
    if (id === req.user!.id) throw errors.forbidden();
    await prisma.user.update({
      where: { id },
      data: { blockedAt: blocked ? new Date() : null },
    });
    return { ok: true };
  });

  app.get('/admin/applications', adminOnly, async () => {
    const apps = await prisma.ownerApplication.findMany({
      where: { status: 'pending' },
      include: { user: true },
      orderBy: { createdAt: 'asc' },
    });
    return {
      items: apps.map((a) => ({
        userId: a.userId,
        phone: a.user.phone,
        name: a.user.name,
        message: a.message,
        createdAt: a.createdAt.toISOString(),
      })),
    };
  });

  app.post('/admin/applications/:userId', adminOnly, async (req) => {
    const { userId } = req.params as { userId: string };
    const { approve, comment } = parse(applicationDecisionSchema, req.body);
    const application = await prisma.ownerApplication.findUnique({ where: { userId } });
    if (!application || application.status !== 'pending') throw errors.notFound('application');

    await prisma.$transaction([
      prisma.ownerApplication.update({
        where: { userId },
        data: {
          status: approve ? 'approved' : 'rejected',
          adminComment: comment ?? null,
          decidedAt: new Date(),
        },
      }),
      ...(approve ? [prisma.user.update({ where: { id: userId }, data: { role: 'owner' } })] : []),
    ]);
    await notifier.notify(userId, approve ? 'owner_approved' : 'owner_rejected', {
      comment: comment ?? null,
    });
    return { ok: true };
  });

  // cross platform bookings and payments

  app.get('/admin/bookings', adminOnly, async (req) => {
    const query = parse(
      z.object({
        date: ymdSchema.optional(),
        status: z.string().optional(),
        phone: z.string().trim().optional(),
      }),
      req.query
    );
    const where: Prisma.BookingWhereInput = {};
    if (query.date) where.date = dbDate(query.date);
    if (query.status) where.status = query.status as Prisma.BookingWhereInput['status'];
    if (query.phone) where.user = { phone: { contains: query.phone } };

    const bookings = await prisma.booking.findMany({
      where,
      include: {
        court: { include: { venue: { include: { policy: true } } } },
        participants: { orderBy: { isCreator: 'desc' } },
        user: true,
      },
      orderBy: { createdAt: 'desc' },
      take: 100,
    });
    const items: OwnerBookingView[] = bookings.map((b) => ({
      ...bookingView(b, null),
      creatorName: b.user.name,
      creatorPhone: b.user.phone,
    }));
    return { items };
  });

  app.get('/admin/bookings/:id/payments', adminOnly, async (req) => {
    const { id } = req.params as { id: string };
    const payments = await prisma.payment.findMany({
      where: { bookingId: id },
      include: { payer: true },
      orderBy: { createdAt: 'asc' },
    });
    const items: AdminPaymentRowView[] = payments.map((p) => ({
      id: p.id,
      provider: p.provider,
      type: p.type,
      status: p.status,
      amountTiyin: p.amountTiyin,
      payerPhone: p.payer?.phone ?? null,
      createdAt: p.createdAt.toISOString(),
    }));
    return { items };
  });

  // the crisis button
  app.post('/admin/payments/:id/refund', adminOnly, async (req) => {
    const { id } = req.params as { id: string };
    const { amountTiyin } = parse(adminRefundSchema, req.body ?? {});
    await refundPayment(id, amountTiyin);
    return { ok: true };
  });

  // platform config

  app.get('/admin/config', adminOnly, async () => {
    return prisma.platformConfig.upsert({ where: { id: 1 }, update: {}, create: { id: 1 } });
  });

  app.patch('/admin/config', adminOnly, async (req) => {
    const body = parse(adminConfigSchema, req.body);
    const updated = await prisma.platformConfig.update({ where: { id: 1 }, data: body });
    invalidateConfigCache();
    return updated;
  });

  app.patch('/admin/venues/:id/commission', adminOnly, async (req) => {
    const { id } = req.params as { id: string };
    const { commissionPercent } = parse(adminVenueCommissionSchema, req.body);
    await prisma.venue.update({ where: { id }, data: { commissionPercent } });
    return { ok: true };
  });

  // payouts

  app.get('/admin/payouts', adminOnly, async () => {
    const owners = await prisma.user.findMany({
      where: { role: 'owner' },
      select: { id: true, name: true, phone: true },
    });

    const rows: AdminPayoutRowView[] = [];
    for (const owner of owners) {
      const [completed, paidOut] = await Promise.all([
        prisma.booking.aggregate({
          where: { status: 'completed', court: { venue: { ownerId: owner.id } } },
          _sum: { depositTiyin: true, commissionTiyin: true },
        }),
        prisma.payout.aggregate({ where: { ownerId: owner.id }, _sum: { amountTiyin: true } }),
      ]);
      const accrued = (completed._sum.depositTiyin ?? 0) - (completed._sum.commissionTiyin ?? 0);
      const paid = paidOut._sum.amountTiyin ?? 0;
      rows.push({
        ownerId: owner.id,
        ownerName: owner.name,
        ownerPhone: owner.phone,
        accruedTiyin: accrued,
        paidOutTiyin: paid,
        payableTiyin: accrued - paid,
      });
    }
    rows.sort((a, b) => b.payableTiyin - a.payableTiyin);
    return { items: rows };
  });

  app.post('/admin/payouts', adminOnly, async (req) => {
    const body = parse(adminPayoutSchema, req.body);
    await prisma.payout.create({
      data: { ownerId: body.ownerId, amountTiyin: body.amountTiyin, note: body.note ?? null },
    });
    return { ok: true };
  });
}
