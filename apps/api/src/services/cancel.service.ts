import type { CancelQuoteView } from '@rentqil/shared';
import { prisma } from '../lib/db';
import { errors } from '../lib/errors';
import { notifier } from '../lib/notifier';
import { allocateProportional, refundForCancellation } from '../domain/money';
import { hoursUntil, slotStartDate, ymdFromDb } from '../domain/slots';
import { refundPayment } from './payment.service';

// player side cancellation, the venue policy decides the refund
// owner side cancellation lives in owner.routes and always refunds 100%

async function loadForCancel(bookingId: string, userId: string) {
  const booking = await prisma.booking.findUnique({
    where: { id: bookingId },
    include: {
      court: { include: { venue: { include: { policy: true } } } },
      participants: true,
      payments: { where: { status: 'paid', type: { in: ['deposit', 'split_share'] } } },
    },
  });
  if (!booking) throw errors.notFound('booking');
  if (booking.userId !== userId) throw errors.forbidden();
  return booking;
}

type BookingForCancel = Awaited<ReturnType<typeof loadForCancel>>;

function quoteFor(booking: BookingForCancel): CancelQuoteView {
  const paidTiyin = booking.payments.reduce((s, p) => s + p.amountTiyin, 0);
  const start = slotStartDate(ymdFromDb(booking.date), booking.startHour);
  const cancellable =
    (booking.status === 'confirmed' || booking.status === 'pending_payment') &&
    start.getTime() > Date.now();

  if (!cancellable) {
    return { allowed: false, refundTiyin: 0, paidTiyin, reason: 'nothing_paid' };
  }

  // an unconfirmed booking never reached the venue, whatever was
  // collected comes back in full regardless of policy
  if (booking.status === 'pending_payment') {
    return {
      allowed: true,
      refundTiyin: paidTiyin,
      paidTiyin,
      reason: paidTiyin > 0 ? 'free_window' : 'nothing_paid',
    };
  }

  const policy = booking.court.venue.policy;
  const quote = refundForCancellation({
    policy: {
      refundEnabled: policy?.refundEnabled ?? true,
      freeCancelHours: policy?.freeCancelHours ?? 12,
      lateRefundPercent: policy?.lateRefundPercent ?? 0,
    },
    hoursToStart: hoursUntil(start, new Date()),
    depositTiyin: booking.depositTiyin,
    serviceFeeTiyin: booking.serviceFeeTiyin,
    paidTiyin,
  });
  return { allowed: true, refundTiyin: quote.refundTiyin, paidTiyin, reason: quote.reason };
}

export async function cancelQuote(bookingId: string, userId: string): Promise<CancelQuoteView> {
  return quoteFor(await loadForCancel(bookingId, userId));
}

export async function cancelBooking(bookingId: string, userId: string): Promise<CancelQuoteView> {
  const booking = await loadForCancel(bookingId, userId);
  const quote = quoteFor(booking);
  if (!quote.allowed) throw errors.bookingState();

  // flip the status first so the slot frees up even if a refund hiccups
  const flipped = await prisma.$transaction(async (tx) => {
    const fresh = await tx.booking.findUnique({ where: { id: booking.id }, select: { status: true } });
    if (fresh?.status !== booking.status) return false;
    await tx.booking.update({
      where: { id: booking.id },
      data: { status: 'cancelled_by_user', cancelledAt: new Date() },
    });
    return true;
  });
  if (!flipped) throw errors.bookingState();

  if (quote.refundTiyin > 0 && booking.payments.length > 0) {
    const amounts = booking.payments.map((p) => p.amountTiyin);
    const parts = allocateProportional(quote.refundTiyin, amounts);
    for (let i = 0; i < booking.payments.length; i++) {
      const share = parts[i] ?? 0;
      if (share > 0) await refundPayment(booking.payments[i]!.id, share);
    }
  }

  const userIds = new Set<string>();
  for (const p of booking.participants) if (p.userId) userIds.add(p.userId);
  userIds.add(booking.court.venue.ownerId);
  userIds.delete(userId);
  await Promise.all(
    [...userIds].map((uid) =>
      notifier.notify(uid, 'booking_cancelled', {
        bookingId: booking.id,
        venue: booking.court.venue.name,
      })
    )
  );

  return quote;
}
