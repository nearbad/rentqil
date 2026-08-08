import Fastify from 'fastify';
import cors from '@fastify/cors';
import authPlugin from './plugins/auth';
import { AppError } from './lib/errors';
import { authRoutes } from './modules/auth.routes';
import { meRoutes } from './modules/me.routes';
import { catalogRoutes } from './modules/catalog.routes';
import { bookingsRoutes } from './modules/bookings.routes';
import { paymentsRoutes } from './modules/payments.routes';

export async function buildApp() {
  const app = Fastify({
    logger: {
      level: process.env.LOG_LEVEL ?? 'info',
      transport: undefined,
    },
  });

  await app.register(cors, { origin: true });
  await app.register(authPlugin);

  app.setErrorHandler((err: unknown, req, reply) => {
    if (err instanceof AppError) {
      return reply.status(err.statusCode).send({
        error: { code: err.code, message: err.message, details: err.details },
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

  return app;
}
