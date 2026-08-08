import { randomBytes } from 'node:crypto';
import type { BookingQuoteResponse, BookingView } from '@rentqil/shared';
import { prisma } from '../lib/db';
import type { Prisma } from '../lib/db';
import { errors } from '../lib/errors';
import { notifier } from '../lib/notifier';
import { getPlatformConfig } from './config.service';
import { policyBadge } from './venue.service';
import { commissionFor, quoteBooking, splitEven } from '../domain/money';
import {
  dbDate,
  openHoursForDay,
  priceForHour,
  rangeIsOpen,
  slotStartDate,
  weekdayOf,
  ymdFromDb,
} from '../domain/slots';

const bookingInclude = {
  court: { include: { venue: { include: { policy: true } } } },
  participants: { orderBy: { isCreator: 'desc' } },
} satisfies Prisma.BookingInclude;

type BookingFull = Prisma.BookingGetPayload<{ include: typeof bookingInclude }>;

export function bookingView(booking: BookingFull, viewerId: string | null): BookingView {
  return {
    id: booking.id,
    status: booking.status,
    venueId: booking.court.venue.id,
    venueName: booking.court.venue.name,
    venueAddress: booking.court.venue.address,
    courtId: booking.courtId,
    courtName: booking.court.name,
    sport: booking.court.sport,
    date: ymdFromDb(booking.date),
    startHour: booking.startHour,
    endHour: booking.endHour,
    totalTiyin: booking.totalTiyin,
    depositTiyin: booking.depositTiyin,
    serviceFeeTiyin: booking.serviceFeeTiyin,
    payNowTiyin: booking.depositTiyin + booking.serviceFeeTiyin,
    isSplit: booking.isSplit,
    splitToken: booking.splitToken,
    participants: booking.participants.map((p) => ({
      id: p.id,
      shareTiyin: p.shareTiyin,
      status: p.status,
      isCreator: p.isCreator,
      paidByMe: viewerId !== null && p.userId === viewerId,
    })),
    expiresAt: booking.expiresAt?.toISOString() ?? null,
    createdAt: booking.createdAt.toISOString(),
    isCreator: viewerId !== null && booking.userId === viewerId,
    noShow: booking.noShow,
  };
}

interface RangeInput {
  courtId: string;
  date: string;
  startHour: number;
  endHour: number;
}

// price and fee math for a slot range, throws if the range is not sellable
export async function quoteRange(input: RangeInput) {
  const court = await prisma.court.findUnique({
    where: { id: input.courtId },
    include: { scheduleRules: true, priceRules: true, venue: { include: { policy: true } } },
  });
  if (!court || !court.active) throw errors.notFound('court');
  if (court.venue.status !== 'approved') throw errors.venueNotActive();

  const weekday = weekdayOf(input.date);
  const open = openHoursForDay(court.scheduleRules, weekday);
  if (!rangeIsOpen(open, input.startHour, input.endHour)) throw errors.scheduleClosed();

  const prices: number[] = [];
  for (let hour = input.startHour; hour < input.endHour; hour++) {
    const price = priceForHour(court.priceRules, weekday, hour);
    if (price === null) throw errors.scheduleClosed();
    prices.push(price);
  }

  const config = await getPlatformConfig();
  const rawPercent = court.venue.depositPercent ?? config.defaultDepositPercent;
  const depositPercent = Math.min(
    Math.max(rawPercent, config.minDepositPercent),
    config.maxDepositPercent
  );

  const quote = quoteBooking({
    slotPricesTiyin: prices,
    depositPercent,
    serviceFeeEnabled: config.serviceFeeEnabled,
    serviceFeeTiyin: config.serviceFeeTiyin,
  });

  return { court, config, quote };
}

export async function quoteResponse(input: RangeInput): Promise<BookingQuoteResponse> {
  const { court, config, quote } = await quoteRange(input);
  return {
    ...quote,
    venueName: court.venue.name,
    courtName: court.name,
    sport: court.sport,
    date: input.date,
    startHour: input.startHour,
    endHour: input.endHour,
    holdMinutes: config.bookingTtlMinutes,
    splitHoldMinutes: config.splitTtlMinutes,
    policyBadge: policyBadge(court.venue.policy),
  };
}

export async function createBooking(
  userId: string,
  input: RangeInput & { split?: { participants: number } }
): Promise<BookingView> {
  const { court, config, quote } = await quoteRange(input);

  const commissionTiyin = commissionFor(
    quote.totalTiyin,
    quote.depositTiyin,
    court.venue.commissionPercent ?? config.commissionPercent,
    config.commissionEnabled
  );

  const ttlMinutes = input.split ? config.splitTtlMinutes : config.bookingTtlMinutes;
  const expiresAt = new Date(Date.now() + ttlMinutes * 60_000);

  const booking = await prisma.$transaction(async (tx) => {
    // serialize bookings per court and date, then re-check conflicts
    const lockKey = `${input.courtId}:${input.date}`;
    await tx.$executeRaw`SELECT pg_advisory_xact_lock(hashtext(${lockKey}))`;

    const now = new Date();
    const clash = await tx.booking.findFirst({
      where: {
        courtId: input.courtId,
        date: dbDate(input.date),
        startHour: { lt: input.endHour },
        endHour: { gt: input.startHour },
        OR: [
          { status: { in: ['confirmed', 'completed'] } },
          { status: 'pending_payment', expiresAt: { gt: now } },
        ],
      },
      select: { id: true },
    });
    if (clash) throw errors.slotTaken();

    const blocked = await tx.blockedSlot.findFirst({
      where: {
        courtId: input.courtId,
        date: dbDate(input.date),
        startHour: { lt: input.endHour },
        endHour: { gt: input.startHour },
      },
      select: { id: true },
    });
    if (blocked) throw errors.slotTaken();

    const split = input.split;
    const shares = split ? splitEven(quote.payNowTiyin, split.participants) : null;

    return tx.booking.create({
      data: {
        courtId: input.courtId,
        userId,
        date: dbDate(input.date),
        startHour: input.startHour,
        endHour: input.endHour,
        totalTiyin: quote.totalTiyin,
        depositPercent: quote.depositPercent,
        depositTiyin: quote.depositTiyin,
        serviceFeeTiyin: quote.serviceFeeTiyin,
        commissionTiyin,
        isSplit: split !== undefined,
        splitToken: split ? randomBytes(9).toString('base64url') : null,
        expiresAt,
        participants: shares
          ? {
              create: shares.map((share, i) => ({
                shareTiyin: share,
                isCreator: i === 0,
                userId: i === 0 ? userId : null,
              })),
            }
          : undefined,
      },
      include: bookingInclude,
    });
  });

  return bookingView(booking, userId);
}

export async function getBookingFull(id: string) {
  return prisma.booking.findUnique({ where: { id }, include: bookingInclude });
}

export async function myBookings(userId: string): Promise<{ active: BookingView[]; past: BookingView[] }> {
  const bookings = await prisma.booking.findMany({
    where: {
      OR: [{ userId }, { participants: { some: { userId } } }],
    },
    include: bookingInclude,
    orderBy: [{ date: 'desc' }, { startHour: 'desc' }],
    take: 100,
  });

  const now = new Date();
  const active: BookingView[] = [];
  const past: BookingView[] = [];
  for (const b of bookings) {
    const view = bookingView(b, userId);
    const stillRelevant =
      (b.status === 'pending_payment' || b.status === 'confirmed') &&
      slotStartDate(view.date, b.endHour) > now;
    (stillRelevant ? active : past).push(view);
  }
  active.reverse(); // nearest game first
  return { active, past };
}

export async function confirmedNotify(booking: BookingFull) {
  const userIds = new Set<string>([booking.userId]);
  for (const p of booking.participants) if (p.userId) userIds.add(p.userId);
  const payload = {
    bookingId: booking.id,
    venue: booking.court.venue.name,
    date: ymdFromDb(booking.date),
    startHour: booking.startHour,
  };
  await Promise.all([...userIds].map((uid) => notifier.notify(uid, 'booking_confirmed', payload)));
}
