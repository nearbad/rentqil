import type { FastifyInstance } from 'fastify';
import { partnerApplySchema } from '@rentqil/shared';
import { prisma } from '../lib/db';
import { parse } from '../lib/validate';

export async function partnerRoutes(app: FastifyInstance) {
  // public form, guests included; abuse is kept out by the rate limiter
  app.post(
    '/partner/apply',
    { config: { rateLimit: { max: 5, windowMs: 3_600_000 } } },
    async (req) => {
      const body = parse(partnerApplySchema, req.body);
      await prisma.partnerRequest.create({
        data: {
          name: body.name,
          contact: body.contact,
          inn: body.inn ?? null,
          message: body.message ?? null,
        },
      });
      return { ok: true };
    }
  );
}
