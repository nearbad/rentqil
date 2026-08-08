import fp from 'fastify-plugin';
import jwt from '@fastify/jwt';
import type { FastifyReply, FastifyRequest } from 'fastify';
import type { Role, User } from '../lib/db';
import { config } from '../config';
import { prisma } from '../lib/db';
import { errors } from '../lib/errors';

// @fastify/jwt owns the request.user decorator, we type it through its hook
declare module '@fastify/jwt' {
  interface FastifyJWT {
    payload: TokenPayload;
    user: User | null;
  }
}

declare module 'fastify' {
  interface FastifyInstance {
    optionalUser: (req: FastifyRequest, reply: FastifyReply) => Promise<void>;
    requireUser: (req: FastifyRequest, reply: FastifyReply) => Promise<void>;
    requireRole: (...roles: Role[]) => (req: FastifyRequest, reply: FastifyReply) => Promise<void>;
  }
}

interface TokenPayload {
  sub: string;
}

async function loadUser(req: FastifyRequest): Promise<User | null> {
  const header = req.headers.authorization;
  if (!header?.startsWith('Bearer ')) return null;
  let payload: TokenPayload;
  try {
    payload = await req.jwtVerify<TokenPayload>();
  } catch {
    return null;
  }
  // always hit the db so role changes and blocks apply immediately
  return prisma.user.findUnique({ where: { id: payload.sub } });
}

export default fp(async (app) => {
  await app.register(jwt, { secret: config.jwtSecret });

  app.decorate('optionalUser', async (req: FastifyRequest) => {
    req.user = await loadUser(req);
  });

  app.decorate('requireUser', async (req: FastifyRequest) => {
    const user = await loadUser(req);
    if (!user) throw errors.unauthorized();
    if (user.blockedAt) throw errors.userBlocked();
    req.user = user;
  });

  app.decorate('requireRole', (...roles: Role[]) => {
    return async (req: FastifyRequest) => {
      const user = await loadUser(req);
      if (!user) throw errors.unauthorized();
      if (user.blockedAt) throw errors.userBlocked();
      if (!roles.includes(user.role)) throw errors.forbidden();
      req.user = user;
    };
  });
});
