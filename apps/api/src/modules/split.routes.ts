import type { FastifyInstance } from 'fastify';
import type { SplitPublicView } from '@rentqil/shared';
import { prisma } from '../lib/db';
import { errors } from '../lib/errors';
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
        shareTiyin: p.shareTiyin,
        status: p.status,
        isCreator: p.isCreator,
        paidByMe: viewerId !== null && p.userId === viewerId,
      })),
      expiresAt: booking.expiresAt?.toISOString() ?? null,
      payNowTiyin: booking.depositTiyin + booking.serviceFeeTiyin,
    };
    return view;
  });
}
