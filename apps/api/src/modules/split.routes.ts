import type { FastifyInstance } from 'fastify';
import type { SplitPublicView } from '@rentqil/shared';
import { splitPayInitSchema } from '@rentqil/shared';
import { prisma } from '../lib/db';
import type { PaymentProviderKind } from '../lib/db';
import { parse } from '../lib/validate';
import { errors } from '../lib/errors';
import { initPayment } from '../services/payment.service';
import { ymdFromDb } from '../domain/slots';

export async function splitRoutes(app: FastifyInstance) {
  // the share link, anyone with the token can see progress and pay a share
  app.get('/split/:token', { preHandler: app.optionalUser }, async (req) => {
    const { token } = req.params as { token: string };
    const booking = await prisma.booking.findUnique({
      where: { splitToken: token },
      include: {
        participants: { orderBy: { isCreator: 'desc' } },
        court: { include: { venue: true } },
      },
    });
    if (!booking || !booking.isSplit) throw errors.notFound('booking');

    const viewerId = req.user?.id ?? null;
    const view: SplitPublicView = {
      bookingId: booking.id,
      status: booking.status,
      venueName: booking.court.venue.name,
      courtName: booking.court.name,
      date: ymdFromDb(booking.date),
      startHour: booking.startHour,
      endHour: booking.endHour,
      sharesTotal: booking.participants.length,
      sharesPaid: booking.participants.filter((p) => p.status === 'paid').length,
      participants: booking.participants.map((p) => ({
        id: p.id,
        fullName: p.fullName,
        shareTiyin: p.shareTiyin,
        status: p.status,
        isCreator: p.isCreator,
        paidByMe: viewerId !== null && p.userId === viewerId,
      })),
      expiresAt: booking.expiresAt?.toISOString() ?? null,
      payNowTiyin: booking.totalTiyin + booking.serviceFeeTiyin,
    };
    return view;
  });

  // paying a share needs no account, the token is the authorization
  app.post('/split/:token/pay', { preHandler: app.optionalUser }, async (req) => {
    const { token } = req.params as { token: string };
    const body = parse(splitPayInitSchema, req.body);
    const booking = await prisma.booking.findUnique({
      where: { splitToken: token },
      select: { id: true, isSplit: true },
    });
    if (!booking || !booking.isSplit) throw errors.notFound('booking');
    return initPayment({
      userId: req.user?.id ?? null,
      bookingId: booking.id,
      participantId: body.participantId,
      remaining: body.remaining,
      provider: body.provider as PaymentProviderKind,
    });
  });
}
