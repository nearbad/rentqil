import type { FastifyInstance } from 'fastify';
import { createBookingSchema, quoteQuerySchema } from '@rentqil/shared';
import { parse } from '../lib/validate';
import { errors } from '../lib/errors';
import {
  bookingView,
  createBooking,
  getBookingFull,
  myBookings,
  quoteResponse,
} from '../services/booking.service';
import { cancelBooking, cancelQuote } from '../services/cancel.service';

export async function bookingsRoutes(app: FastifyInstance) {
  app.get('/bookings/quote', async (req) => {
    const q = parse(quoteQuerySchema, req.query);
    return quoteResponse({ courtId: q.courtId, date: q.date, startHour: q.start, endHour: q.end });
  });

  app.post('/bookings', { preHandler: app.requireUser }, async (req) => {
    const body = parse(createBookingSchema, req.body);
    return createBooking(req.user!.id, {
      courtId: body.courtId,
      date: body.date,
      startHour: body.startHour,
      endHour: body.endHour,
      split: body.split,
    });
  });

  app.get('/bookings/my', { preHandler: app.requireUser }, async (req) => {
    return myBookings(req.user!.id);
  });

  app.get('/bookings/:id/cancel-quote', { preHandler: app.requireUser }, async (req) => {
    const { id } = req.params as { id: string };
    return cancelQuote(id, req.user!.id);
  });

  app.post('/bookings/:id/cancel', { preHandler: app.requireUser }, async (req) => {
    const { id } = req.params as { id: string };
    return cancelBooking(id, req.user!.id);
  });

  app.get('/bookings/:id', { preHandler: app.requireUser }, async (req) => {
    const { id } = req.params as { id: string };
    const booking = await getBookingFull(id);
    if (!booking) throw errors.notFound('booking');

    const user = req.user!;
    const isCreator = booking.userId === user.id;
    const isParticipant = booking.participants.some((p) => p.userId === user.id);
    const isVenueOwner = booking.court.venue.ownerId === user.id;
    if (!isCreator && !isParticipant && !isVenueOwner && user.role !== 'admin') {
      throw errors.forbidden();
    }
    return bookingView(booking, user.id);
  });
}
