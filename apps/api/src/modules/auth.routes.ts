import type { FastifyInstance } from 'fastify';
import { createHash, randomBytes, randomInt, scryptSync, timingSafeEqual } from 'node:crypto';
import { otpRequestSchema, otpVerifySchema, passwordAuthSchema, passwordSetSchema } from '@rentqil/shared';
import { prisma } from '../lib/db';
import { parse } from '../lib/validate';
import { errors } from '../lib/errors';
import { createEmailProvider } from '../lib/email';
import { config } from '../config';
import { meView } from './me.routes';

const OTP_TTL_MS = 5 * 60 * 1000;
const RESEND_COOLDOWN_MS = 60 * 1000;
const MAX_ATTEMPTS = 5;

const mailer = createEmailProvider();

function hashCode(email: string, code: string): string {
  return createHash('sha256').update(`${email}:${code}:${config.jwtSecret}`).digest('hex');
}

// scrypt with a per user salt, stored as salt:hash
function hashPassword(password: string): string {
  const salt = randomBytes(16);
  const hash = scryptSync(password, salt, 64);
  return `${salt.toString('hex')}:${hash.toString('hex')}`;
}

function verifyPassword(password: string, stored: string): boolean {
  const [saltHex, hashHex] = stored.split(':');
  if (!saltHex || !hashHex) return false;
  const hash = scryptSync(password, Buffer.from(saltHex, 'hex'), 64);
  return timingSafeEqual(hash, Buffer.from(hashHex, 'hex'));
}

async function issueSession(app: FastifyInstance, userId: string) {
  const user = await prisma.user.findUnique({
    where: { id: userId },
    include: { ownerApplication: true },
  });
  if (!user) throw errors.notFound('user');
  if (user.blockedAt) throw errors.userBlocked();
  const token = app.jwt.sign({ sub: user.id }, { expiresIn: '30d' });
  return { token, me: meView(user, user.ownerApplication) };
}

export async function authRoutes(app: FastifyInstance) {
  app.post('/auth/otp/request', async (req) => {
    const { email } = parse(otpRequestSchema, req.body);

    const last = await prisma.otpCode.findFirst({
      where: { identifier: email },
      orderBy: { createdAt: 'desc' },
    });
    if (last && Date.now() - last.createdAt.getTime() < RESEND_COOLDOWN_MS) {
      throw errors.otpCooldown();
    }

    const code = randomInt(100000, 1000000).toString();
    await prisma.otpCode.create({
      data: {
        identifier: email,
        codeHash: hashCode(email, code),
        expiresAt: new Date(Date.now() + OTP_TTL_MS),
      },
    });
    await mailer.send(email, 'rentqil: kirish kodi', `Kirish kodi: ${code}`);

    // dev convenience only, config guards it against production
    return { ok: true, ...(config.otpDevEcho ? { devCode: code } : {}) };
  });

  app.post('/auth/otp/verify', async (req) => {
    const { email, code } = parse(otpVerifySchema, req.body);

    const otp = await prisma.otpCode.findFirst({
      where: { identifier: email, consumedAt: null },
      orderBy: { createdAt: 'desc' },
    });
    if (!otp || otp.expiresAt.getTime() < Date.now()) throw errors.otpExpired();
    if (otp.attempts >= MAX_ATTEMPTS) throw errors.otpTooMany();

    if (otp.codeHash !== hashCode(email, code)) {
      await prisma.otpCode.update({
        where: { id: otp.id },
        data: { attempts: { increment: 1 } },
      });
      throw errors.otpInvalid();
    }

    await prisma.otpCode.update({
      where: { id: otp.id },
      data: { consumedAt: new Date() },
    });

    const user = await prisma.user.upsert({
      where: { email },
      update: {},
      create: { email, role: email === config.adminEmail ? 'admin' : 'user' },
    });
    return issueSession(app, user.id);
  });

  // classic email plus password. registration is not email verified yet,
  // the smtp stub blocks that; TODO send a confirm link once smtp is live
  app.post('/auth/register', async (req) => {
    const { email, password } = parse(passwordAuthSchema, req.body);
    const existing = await prisma.user.findUnique({ where: { email } });
    if (existing?.passwordHash) throw errors.emailTaken();

    const user = existing
      ? // account created earlier via code or google claims its password
        await prisma.user.update({
          where: { id: existing.id },
          data: { passwordHash: hashPassword(password) },
        })
      : await prisma.user.create({
          data: {
            email,
            passwordHash: hashPassword(password),
            role: email === config.adminEmail ? 'admin' : 'user',
          },
        });
    return issueSession(app, user.id);
  });

  app.post('/auth/password/login', async (req) => {
    const { email, password } = parse(passwordAuthSchema, req.body);
    const user = await prisma.user.findUnique({ where: { email } });
    if (!user?.passwordHash || !verifyPassword(password, user.passwordHash)) {
      throw errors.passwordInvalid();
    }
    return issueSession(app, user.id);
  });

  // set or replace the password from the profile, code login acts as reset
  app.post('/auth/password/set', { preHandler: app.requireUser }, async (req) => {
    const { password } = parse(passwordSetSchema, req.body);
    await prisma.user.update({
      where: { id: req.user!.id },
      data: { passwordHash: hashPassword(password) },
    });
    return { ok: true };
  });

  // google oauth, the classic server side code flow.
  // both routes 404 politely when the keys are not configured
  const googleReady = Boolean(config.google.clientId && config.google.clientSecret);
  const redirectUri = `${config.publicApiUrl}/auth/google/callback`;

  app.get('/auth/google', async (_req, reply) => {
    if (!googleReady) throw errors.notFound('google auth');
    const url = new URL('https://accounts.google.com/o/oauth2/v2/auth');
    url.searchParams.set('client_id', config.google.clientId);
    url.searchParams.set('redirect_uri', redirectUri);
    url.searchParams.set('response_type', 'code');
    url.searchParams.set('scope', 'openid email profile');
    url.searchParams.set('prompt', 'select_account');
    return reply.redirect(url.toString());
  });

  app.get('/auth/google/callback', async (req, reply) => {
    if (!googleReady) throw errors.notFound('google auth');
    const { code } = req.query as { code?: string };
    if (!code) return reply.redirect(`${config.webUrl}/login?error=google`);

    const tokenRes = await fetch('https://oauth2.googleapis.com/token', {
      method: 'POST',
      headers: { 'content-type': 'application/x-www-form-urlencoded' },
      body: new URLSearchParams({
        code,
        client_id: config.google.clientId,
        client_secret: config.google.clientSecret,
        redirect_uri: redirectUri,
        grant_type: 'authorization_code',
      }),
    });
    if (!tokenRes.ok) {
      req.log.error({ status: tokenRes.status }, 'google token exchange failed');
      return reply.redirect(`${config.webUrl}/login?error=google`);
    }
    const tokens = (await tokenRes.json()) as { id_token?: string };
    if (!tokens.id_token) return reply.redirect(`${config.webUrl}/login?error=google`);

    // the id token arrived straight from google over tls, decoding the
    // payload without a signature check is fine here
    const payloadPart = tokens.id_token.split('.')[1] ?? '';
    const payload = JSON.parse(Buffer.from(payloadPart, 'base64url').toString()) as {
      sub: string;
      email?: string;
      name?: string;
    };
    if (!payload.email) return reply.redirect(`${config.webUrl}/login?error=google`);
    const email = payload.email.toLowerCase();

    // match by google id first, then claim an existing email account
    let user = await prisma.user.findUnique({ where: { googleId: payload.sub } });
    if (!user) {
      user = await prisma.user.upsert({
        where: { email },
        update: { googleId: payload.sub, name: payload.name || undefined },
        create: {
          email,
          googleId: payload.sub,
          name: payload.name ?? null,
          role: email === config.adminEmail ? 'admin' : 'user',
        },
      });
    }
    if (user.blockedAt) return reply.redirect(`${config.webUrl}/login?error=blocked`);

    const token = app.jwt.sign({ sub: user.id }, { expiresIn: '30d' });
    return reply.redirect(`${config.webUrl}/login?token=${encodeURIComponent(token)}`);
  });
}
