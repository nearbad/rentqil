import type { OwnerFinanceView, OwnerStatsView, OwnerVenueView } from '@rentqil/shared';
import { prisma } from '../lib/db';
import { venueDetailView, type VenueFull } from './venue.service';
import { addDays, ymd, ymdFromDb } from '../domain/slots';

export async function ownerVenueView(venue: VenueFull): Promise<OwnerVenueView> {
  return {
    ...venueDetailView(venue),
    status: venue.status,
    moderationComment: venue.moderationComment,
    hasPendingChanges: venue.pendingChanges !== null,
    policy: {
      refundEnabled: venue.policy?.refundEnabled ?? true,
      freeCancelHours: venue.policy?.freeCancelHours ?? 12,
      lateRefundPercent: venue.policy?.lateRefundPercent ?? 0,
    },
  };
}

// accruals count completed bookings only, see docs/DECISIONS.md 06
export async function ownerFinance(ownerId: string): Promise<OwnerFinanceView> {
  const [completed, upcoming, payouts] = await Promise.all([
    prisma.booking.findMany({
      where: { status: 'completed', court: { venue: { ownerId } } },
      select: { totalTiyin: true },
    }),
    prisma.booking.findMany({
      where: { status: 'confirmed', court: { venue: { ownerId } } },
      select: { totalTiyin: true },
    }),
    prisma.payout.findMany({ where: { ownerId }, orderBy: { createdAt: 'desc' } }),
  ]);

  // the whole price is collected online, the owner is paid all of it
  const gross = completed.reduce((s, b) => s + b.totalTiyin, 0);
  const accrued = gross;
  const paidOut = payouts.reduce((s, p) => s + p.amountTiyin, 0);
  const upcomingHolds = upcoming.reduce((s, b) => s + b.totalTiyin, 0);

  return {
    completedGrossTiyin: gross,
    accruedTiyin: accrued,
    paidOutTiyin: paidOut,
    payableTiyin: accrued - paidOut,
    upcomingHoldsTiyin: upcomingHolds,
    payouts: payouts.map((p) => ({
      id: p.id,
      amountTiyin: p.amountTiyin,
      note: p.note,
      createdAt: p.createdAt.toISOString(),
    })),
  };
}

export async function ownerStats(ownerId: string): Promise<OwnerStatsView> {
  const to = new Date();
  const from = addDays(to, -30);

  const bookings = await prisma.booking.findMany({
    where: {
      court: { venue: { ownerId } },
      status: { in: ['confirmed', 'completed'] },
      date: { gte: from },
    },
    select: {
      date: true,
      startHour: true,
      endHour: true,
      totalTiyin: true,
      status: true,
      noShow: true,
    },
  });

  const byHour = new Map<number, number>();
  const byDay = new Map<string, { bookings: number; revenueTiyin: number }>();
  let revenue = 0;
  let noShowCount = 0;
  let completedCount = 0;

  for (const b of bookings) {
    for (let h = b.startHour; h < b.endHour; h++) {
      byHour.set(h, (byHour.get(h) ?? 0) + 1);
    }
    const day = ymdFromDb(b.date);
    const entry = byDay.get(day) ?? { bookings: 0, revenueTiyin: 0 };
    entry.bookings += 1;
    if (b.status === 'completed') {
      entry.revenueTiyin += b.totalTiyin;
      revenue += b.totalTiyin;
      completedCount += 1;
      if (b.noShow) noShowCount += 1;
    }
    byDay.set(day, entry);
  }

  return {
    from: ymd(from),
    to: ymd(to),
    bookingsTotal: bookings.length,
    revenueTiyin: revenue,
    noShowCount,
    completedCount,
    byHour: [...byHour.entries()].sort((a, b) => a[0] - b[0]).map(([hour, count]) => ({ hour, bookings: count })),
    byDay: [...byDay.entries()]
      .sort((a, b) => a[0].localeCompare(b[0]))
      .map(([date, v]) => ({ date, bookings: v.bookings, revenueTiyin: v.revenueTiyin })),
  };
}
