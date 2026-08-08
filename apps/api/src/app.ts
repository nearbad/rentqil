import Fastify from 'fastify';
import cors from '@fastify/cors';
import multipart from '@fastify/multipart';
import fastifyStatic from '@fastify/static';
import authPlugin from './plugins/auth';
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

export async function buildApp() {
  const app = Fastify({
    logger: {
      level: process.env.LOG_LEVEL ?? 'info',
      transport: undefined,
    },
  });

  await app.register(cors, { origin: true });
  await app.register(multipart, { limits: { fileSize: 5 * 1024 * 1024, files: 1 } });
  await app.register(fastifyStatic, { root: UPLOAD_DIR, prefix: '/uploads/' });
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
  await app.register(splitRoutes);
  await app.register(ownerRoutes);
  await app.register(adminRoutes);
  await app.register(uploadsRoutes);

  return app;
}
