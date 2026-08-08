import Fastify from 'fastify';
import cors from '@fastify/cors';
import multipart from '@fastify/multipart';
import fastifyStatic from '@fastify/static';
import authPlugin from './plugins/auth';
import rateLimitPlugin from './plugins/rate-limit';
import { uploadsRoutes, UPLOAD_DIR } from './modules/uploads.routes';
import { AppError } from './lib/errors';
import { authRoutes } from './modules/auth.routes';
import { meRoutes } from './modules/me.routes';
import { catalogRoutes } from './modules/catalog.routes';
import { bookingsRoutes } from './modules/bookings.routes';
import { paymentsRoutes } from './modules/payments.routes';
import { splitRoutes } from './modules/split.routes';
import { ownerRoutes } from './modules/owner.routes';
import { adminRoutes } from './modules/admin.routes';
import { partnerRoutes } from './modules/partner.routes';
import { telegramRoutes } from './modules/telegram.routes';

export async function buildApp() {
  const app = Fastify({
    logger: {
      level: process.env.LOG_LEVEL ?? 'info',
      transport: undefined,
    },
    // caddy fronts the api in prod, req.ip must come from x-forwarded-for
    trustProxy: true,
  });

  // the web client always sends content-type: application/json, even for
  // bodyless posts like /notifications/read, so treat an empty body as {}
  app.addContentTypeParser('application/json', { parseAs: 'string' }, (_req, body, done) => {
    const text = typeof body === 'string' ? body.trim() : '';
    if (text === '') return done(null, {});
    try {
      done(null, JSON.parse(text));
    } catch {
      done(new AppError('BAD_JSON', 400, 'invalid json body'), undefined);
    }
  });

  await app.register(cors, { origin: true });
  await app.register(multipart, { limits: { fileSize: 5 * 1024 * 1024, files: 1 } });
  await app.register(fastifyStatic, { root: UPLOAD_DIR, prefix: '/uploads/' });
  await app.register(authPlugin);
  await app.register(rateLimitPlugin);

  app.setErrorHandler((err: unknown, req, reply) => {
    if (err instanceof AppError) {
      return reply.status(err.statusCode).send({
        error: { code: err.code, message: err.message, details: err.details },
      });
    }
    // fastify's own errors (bad content type, body too large, rate limit)
    // carry a 4xx statusCode and must not surface as 500
    const fe = err as { statusCode?: number; code?: string; message?: string };
    if (typeof fe.statusCode === 'number' && fe.statusCode >= 400 && fe.statusCode < 500) {
      return reply.status(fe.statusCode).send({
        error: { code: fe.code ?? 'BAD_REQUEST', message: fe.message ?? 'bad request' },
      });
    }
    req.log.error(err);
    return reply.status(500).send({
      error: { code: 'UNKNOWN', message: 'internal error' },
    });
  });

  app.get('/health', async () => ({ ok: true }));

  await app.register(authRoutes);
  await app.register(meRoutes);
  await app.register(catalogRoutes);
  await app.register(bookingsRoutes);
  await app.register(paymentsRoutes);
  await app.register(splitRoutes);
  await app.register(ownerRoutes);
  await app.register(adminRoutes);
  await app.register(partnerRoutes);
  await app.register(telegramRoutes);
  await app.register(uploadsRoutes);

  return app;
}
