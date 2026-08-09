import { randomBytes } from 'node:crypto';
import type { BookingQuoteResponse, BookingView } from '@rentqil/shared';
import { prisma } from '../lib/db';
import type { Prisma } from '../lib/db';
import { errors } from '../lib/errors';
import { notifier } from '../lib/notifier';
import { getPlatformConfig } from './config.service';
import { policyBadge } from './venue.service';
import { promoDiscount, quoteBooking, splitEven } from '../domain/money';
import { resolvePromo, type PromoError } from './promo.service';
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
    serviceFeeTiyin: booking.serviceFeeTiyin,
    discountTiyin: booking.discountTiyin,
    promoCode: booking.promoCodeText,
    payNowTiyin: booking.totalTiyin + booking.serviceFeeTiyin,
    contactPhone: booking.contactPhone,
    playersCount: booking.playersCount,
    playerNames: booking.isSplit
      ? booking.participants.map((p) => p.fullName).filter(Boolean)
      : booking.playerNames,
    isSplit: booking.isSplit,
    splitToken: booking.splitToken,
    participants: booking.participants.map((p) => ({
      id: p.id,
      fullName: p.fullName,
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
  promoCode?: string;
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
  const base = prices.reduce((s, p) => s + p, 0);

  let promoId: string | null = null;
  let promoText: string | null = null;
  let promoError: PromoError | null = null;
  let discountTiyin = 0;
  if (input.promoCode) {
    const res = await resolvePromo(input.promoCode, court.venue.id, court.venue.ownerId);
    if (res.promo) {
      promoId = res.promo.id;
      promoText = res.promo.code;
      discountTiyin = promoDiscount(res.promo, base);
    } else {
      promoError = res.error;
    }
  }

  const quote = quoteBooking({
    slotPricesTiyin: prices,
    serviceFeePercent: config.serviceFeePercent,
    discountTiyin,
  });

  return { court, config, quote, promoId, promoText, promoError };
}

export async function quoteResponse(input: RangeInput): Promise<BookingQuoteResponse> {
  const { court, config, quote, promoError } = await quoteRange(input);
  return {
    ...quote,
    promoError,
    venueName: court.venue.name,
    courtName: court.name,
    sport: court.sport,
    date: input.date,
    startHour: input.startHour,
    endHour: input.endHour,
    holdMinutes: config.bookingTtlMinutes,
    splitHoldMinutes: config.splitTtlMinutes,
    policyBadge: policyBadge(court.venue.policy),
    requireDocuments: court.venue.requireDocuments,
    capacity: court.capacity,
  };
}

export async function createBooking(
  userId: string,
  input: RangeInput & {
    contactPhone: string;
    playersCount: number;
    playerNames: string[];
    split?: { names: string[] };
  }
): Promise<BookingView> {
  const { court, config, quote, promoId, promoText, promoError } = await quoteRange(input);
  if (promoError) {
    if (promoError === 'PROMO_EXPIRED') throw errors.promoExpired();
    if (promoError === 'PROMO_EXHAUSTED') throw errors.promoExhausted();
    throw errors.promoInvalid();
  }

  // the owner decides how many people fit on the field
  if (court.capacity !== null && input.playersCount > court.capacity) {
    throw errors.validation({ playersCount: `max ${court.capacity} players` });
  }
  // documents policy means every player is named up front
  const names = input.split ? input.split.names : input.playerNames;
  if (input.split && input.split.names.length !== input.playersCount) {
    throw errors.validation({ playersCount: 'names must match the players count' });
  }
  if (court.venue.requireDocuments && names.length !== input.playersCount) {
    throw errors.validation({ playerNames: 'every player must be named' });
  }

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
    const shares = split ? splitEven(quote.payNowTiyin, split.names.length) : null;

    return tx.booking.create({
      data: {
        courtId: input.courtId,
        userId,
        date: dbDate(input.date),
        startHour: input.startHour,
        endHour: input.endHour,
        // the stored total is the discounted price, refunds build on it
        totalTiyin: quote.netTiyin,
        serviceFeeTiyin: quote.serviceFeeTiyin,
        discountTiyin: quote.discountTiyin,
        promoCodeId: promoId,
        promoCodeText: promoText,
        contactPhone: input.contactPhone,
        playersCount: input.playersCount,
        playerNames: split ? [] : input.playerNames,
        isSplit: split !== undefined,
        splitToken: split ? randomBytes(9).toString('base64url') : null,
        expiresAt,
        participants: shares
          ? {
              create: shares.map((share, i) => ({
                fullName: split!.names[i] ?? '',
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

  // remember the phone on the profile too, first booking fills it
  await prisma.user
    .updateMany({ where: { id: userId, phone: null }, data: { phone: input.contactPhone } })
    .catch(() => {});

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

  // the venue owner hears about every new booking: in-app, email, telegram
  await notifier.notify(booking.court.venue.ownerId, 'owner_new_booking', {
    bookingId: booking.id,
    venue: booking.court.venue.name,
    court: booking.court.name,
    date: ymdFromDb(booking.date),
    startHour: booking.startHour,
    endHour: booking.endHour,
    amountTiyin: booking.totalTiyin + booking.serviceFeeTiyin,
    contactPhone: booking.contactPhone,
  });
}
