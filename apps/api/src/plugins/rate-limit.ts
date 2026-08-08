import type { FastifyInstance, FastifyRequest } from 'fastify';
import fp from 'fastify-plugin';
import { errors } from '../lib/errors';

// small in-memory sliding window limiter, fine for a single api instance.
// defaults are generous, hot routes tighten themselves via route config:
//   { config: { rateLimit: { max: 10, windowMs: 60_000 } } }

interface RouteLimit {
  max: number;
  windowMs: number;
}

const GLOBAL_LIMIT: RouteLimit = { max: 300, windowMs: 60_000 };

interface Bucket {
  count: number;
  resetAt: number;
}

const buckets = new Map<string, Bucket>();

// drop stale buckets so the map never grows without bound
setInterval(() => {
  const now = Date.now();
  for (const [key, bucket] of buckets) {
    if (bucket.resetAt <= now) buckets.delete(key);
  }
}, 60_000).unref();

function hit(key: string, limit: RouteLimit): boolean {
  const now = Date.now();
  const bucket = buckets.get(key);
  if (!bucket || bucket.resetAt <= now) {
    buckets.set(key, { count: 1, resetAt: now + limit.windowMs });
    return true;
  }
  bucket.count += 1;
  return bucket.count <= limit.max;
}

function clientIp(req: FastifyRequest): string {
  // fastify resolves x-forwarded-for itself when trustProxy is on
  return req.ip ?? 'unknown';
}

export default fp(async function rateLimitPlugin(app: FastifyInstance) {
  app.addHook('onRequest', async (req) => {
    if (req.method === 'OPTIONS') return;
    const ip = clientIp(req);

    if (!hit(`g:${ip}`, GLOBAL_LIMIT)) throw errors.rateLimited();

    const routeLimit = (req.routeOptions?.config as { rateLimit?: RouteLimit } | undefined)
      ?.rateLimit;
    if (routeLimit) {
      const key = `r:${req.routeOptions.method}:${req.routeOptions.url}:${ip}`;
      if (!hit(key, routeLimit)) throw errors.rateLimited();
    }
  });
});
