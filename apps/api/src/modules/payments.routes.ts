import type { FastifyInstance } from 'fastify';
import type { PaymentPublicView } from '@rentqil/shared';
import { mockWebhookSchema, paymentInitSchema } from '@rentqil/shared';
import { z } from 'zod';
import { prisma } from '../lib/db';
import type { PaymentProviderKind } from '../lib/db';
import { parse } from '../lib/validate';
import { errors } from '../lib/errors';
import { applyPaymentResult, initPayment } from '../services/payment.service';
import { MockProvider, mockSignature } from '../payments/mock';
import { ymdFromDb } from '../domain/slots';

const simulateSchema = z.object({ outcome: z.enum(['paid', 'failed']) });

const mock = new MockProvider();

export async function paymentsRoutes(app: FastifyInstance) {
  app.post('/payments/init', { preHandler: app.requireUser }, async (req) => {
    const body = parse(paymentInitSchema, req.body);
    return initPayment({
      userId: req.user!.id,
      bookingId: body.bookingId,
      participantId: body.participantId,
      provider: body.provider as PaymentProviderKind,
    });
  });

  // read model for the pay page, no auth on purpose: the link may be
  // opened in another browser, it exposes nothing sensitive
  app.get('/payments/:id/public', async (req) => {
    const { id } = req.params as { id: string };
    const payment = await prisma.payment.findUnique({
      where: { id },
      include: { booking: { include: { court: { include: { venue: true } } } } },
    });
    if (!payment || payment.type === 'refund') throw errors.notFound('payment');

    const b = payment.booking;
    const view: PaymentPublicView & { splitToken: string | null; isShare: boolean } = {
      id: payment.id,
      provider: payment.provider,
      amountTiyin: payment.amountTiyin,
      status: payment.status,
      bookingId: payment.bookingId,
      description: `${b.court.venue.name}, ${b.court.name}, ${ymdFromDb(b.date)} ${String(b.startHour).padStart(2, '0')}:00-${String(b.endHour).padStart(2, '0')}:00`,
      splitToken: b.splitToken,
      isShare: payment.type === 'split_share',
    };
    return view;
  });

  // the fake psp button on the pay page, it fires a signed webhook back at us
  app.post('/payments/mock/:id/simulate', async (req) => {
    const { id } = req.params as { id: string };
    const { outcome } = parse(simulateSchema, req.body);
    const payment = await prisma.payment.findUnique({ where: { id } });
    if (!payment) throw errors.notFound('payment');
    if (payment.status !== 'created') throw errors.paymentState();
    await mock.simulateOutcome(id, outcome);
    return { ok: true };
  });

  // what a real psp callback will look like, hmac guarded
  app.post('/webhooks/mock', async (req) => {
    const body = parse(mockWebhookSchema, req.body);
    if (body.sig !== mockSignature(body.paymentId, body.outcome)) {
      throw errors.forbidden();
    }
    const result = await applyPaymentResult(body.paymentId, body.outcome, body.txId);
    return { ok: result.ok };
  });
}
