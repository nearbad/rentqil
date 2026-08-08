import { randomUUID } from 'node:crypto';
import { prisma } from '../lib/db';
import type { Payment, PaymentProviderKind } from '../lib/db';
import { errors } from '../lib/errors';
import { notifier } from '../lib/notifier';
import { providerFor } from '../payments/provider';
import { confirmedNotify, getBookingFull } from './booking.service';

// payments state machine
// created -> paid -> refunded
// created -> failed
// every transition is guarded inside a transaction, webhooks are idempotent

export async function initPayment(args: {
  userId: string;
  bookingId: string;
  participantId?: string;
  provider: PaymentProviderKind;
}): Promise<{ paymentId: string; payUrl: string }> {
  const booking = await prisma.booking.findUnique({
    where: { id: args.bookingId },
    include: { participants: true },
  });
  if (!booking) throw errors.notFound('booking');
  if (booking.status !== 'pending_payment') throw errors.bookingState();
  if (booking.expiresAt && booking.expiresAt.getTime() <= Date.now()) throw errors.bookingState();

  let type: 'deposit' | 'split_share' = 'deposit';
  let amountTiyin = booking.depositTiyin + booking.serviceFeeTiyin;
  let participantId: string | null = null;

  if (args.participantId) {
    const participant = booking.participants.find((p) => p.id === args.participantId);
    if (!participant) throw errors.notFound('participant');
    if (participant.status !== 'pending') throw errors.splitState();
    type = 'split_share';
    amountTiyin = participant.shareTiyin;
    participantId = participant.id;
  } else if (booking.userId !== args.userId) {
    // full payment can only be started by the creator
    throw errors.forbidden();
  }

  // an unfinished payment for the same target and provider is reused,
  // refreshing the page must not multiply rows
  let payment = await prisma.payment.findFirst({
    where: {
      bookingId: booking.id,
      participantId,
      provider: args.provider,
      type,
      status: 'created',
      payerUserId: args.userId,
    },
  });
  if (!payment) {
    payment = await prisma.payment.create({
      data: {
        bookingId: booking.id,
        participantId,
        provider: args.provider,
        type,
        amountTiyin,
        idempotencyKey: randomUUID(),
        payerUserId: args.userId,
      },
    });
  }

  const { payUrl, externalId } = await providerFor(args.provider).init(payment);
  if (externalId && payment.externalId !== externalId) {
    await prisma.payment.update({ where: { id: payment.id }, data: { externalId } });
  }
  return { paymentId: payment.id, payUrl };
}

export interface WebhookResult {
  ok: boolean;
  refundNeeded?: Payment;
  confirmedBookingId?: string;
  sharePaidBookingId?: string;
}

// called by provider webhooks, must be safe to call twice
export async function applyPaymentResult(
  paymentId: string,
  outcome: 'paid' | 'failed',
  txId: string
): Promise<WebhookResult> {
  const result = await prisma.$transaction(async (tx): Promise<WebhookResult> => {
    const payment = await tx.payment.findUnique({
      where: { id: paymentId },
      include: { booking: { include: { participants: true } } },
    });
    if (!payment) throw errors.notFound('payment');
    if (payment.status !== 'created') return { ok: true }; // duplicate delivery

    if (outcome === 'failed') {
      await tx.payment.update({
        where: { id: payment.id },
        data: { status: 'failed', externalId: txId },
      });
      return { ok: true };
    }

    const paid = await tx.payment.update({
      where: { id: payment.id },
      data: { status: 'paid', paidAt: new Date(), externalId: txId },
    });

    const booking = payment.booking;
    const expired =
      booking.status !== 'pending_payment' ||
      (booking.expiresAt !== null && booking.expiresAt.getTime() <= Date.now());

    if (payment.type === 'deposit') {
      if (expired) {
        // money arrived after the slot was released, give it back
        return { ok: true, refundNeeded: paid };
      }
      await tx.booking.update({
        where: { id: booking.id },
        data: { status: 'confirmed', expiresAt: null },
      });
      if (booking.isSplit) {
        // creator paid the whole thing, close all shares
        await tx.bookingParticipant.updateMany({
          where: { bookingId: booking.id, status: 'pending' },
          data: { status: 'paid', paidAt: new Date() },
        });
      }
      return { ok: true, confirmedBookingId: booking.id };
    }

    // split share
    const participant = booking.participants.find((p) => p.id === payment.participantId);
    if (!participant || participant.status !== 'pending' || expired) {
      // share got paid by someone else first, or the split timed out
      return { ok: true, refundNeeded: paid };
    }
    await tx.bookingParticipant.update({
      where: { id: participant.id },
      data: { status: 'paid', paidAt: new Date(), userId: payment.payerUserId },
    });

    const allPaid = booking.participants.every((p) =>
      p.id === participant.id ? true : p.status === 'paid'
    );
    if (allPaid) {
      await tx.booking.update({
        where: { id: booking.id },
        data: { status: 'confirmed', expiresAt: null },
      });
      return { ok: true, confirmedBookingId: booking.id };
    }
    return { ok: true, sharePaidBookingId: booking.id };
  });

  // side effects after the transaction commits
  if (result.refundNeeded) {
    await refundPayment(result.refundNeeded.id).catch((e) =>
      console.error('auto refund failed', e)
    );
  }
  if (result.confirmedBookingId) {
    const booking = await getBookingFull(result.confirmedBookingId);
    if (booking) await confirmedNotify(booking);
  }
  if (result.sharePaidBookingId) {
    const booking = await getBookingFull(result.sharePaidBookingId);
    if (booking) {
      const paidCount = booking.participants.filter((p) => p.status === 'paid').length;
      await notifier.notify(booking.userId, 'split_paid', {
        bookingId: booking.id,
        paid: paidCount,
        total: booking.participants.length,
      });
    }
  }
  return result;
}

// refund a paid payment, full by default, partial when amountTiyin is given
export async function refundPayment(paymentId: string, amountTiyin?: number): Promise<void> {
  const payment = await prisma.payment.findUnique({
    where: { id: paymentId },
    include: { refunds: { where: { status: 'paid' } } },
  });
  if (!payment) throw errors.notFound('payment');
  if (payment.type === 'refund') throw errors.paymentState();
  if (payment.status !== 'paid' && payment.status !== 'refunded') throw errors.paymentState();

  const refundedSoFar = payment.refunds.reduce((s, r) => s + r.amountTiyin, 0);
  const amount = amountTiyin ?? payment.amountTiyin - refundedSoFar;
  if (amount <= 0) return;
  if (refundedSoFar + amount > payment.amountTiyin) throw errors.paymentState();

  const result = await providerFor(payment.provider).refund(payment, amount);
  if (!result.ok) throw new Error('provider refund failed');

  await prisma.$transaction(async (tx) => {
    await tx.payment.create({
      data: {
        bookingId: payment.bookingId,
        participantId: payment.participantId,
        provider: payment.provider,
        type: 'refund',
        status: 'paid',
        amountTiyin: amount,
        idempotencyKey: randomUUID(),
        externalId: result.externalId,
        refundOfId: payment.id,
        paidAt: new Date(),
      },
    });
    if (refundedSoFar + amount >= payment.amountTiyin) {
      await tx.payment.update({ where: { id: payment.id }, data: { status: 'refunded' } });
      if (payment.participantId) {
        await tx.bookingParticipant.update({
          where: { id: payment.participantId },
          data: { status: 'refunded' },
        });
      }
    }
  });

  if (payment.payerUserId) {
    await notifier.notify(payment.payerUserId, 'refund_issued', {
      bookingId: payment.bookingId,
      amountTiyin: amount,
    });
  }
}

// full refund of everything paid on a booking, used by expiry and owner cancel
export async function refundAllBookingPayments(bookingId: string): Promise<number> {
  const paid = await prisma.payment.findMany({
    where: { bookingId, status: 'paid', type: { in: ['deposit', 'split_share'] } },
  });
  let total = 0;
  for (const p of paid) {
    await refundPayment(p.id);
    total += p.amountTiyin;
  }
  return total;
}
