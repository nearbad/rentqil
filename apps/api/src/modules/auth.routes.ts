import type { FastifyInstance } from 'fastify';
import { createHash, randomInt } from 'node:crypto';
import { otpRequestSchema, otpVerifySchema } from '@rentqil/shared';
import { prisma } from '../lib/db';
import { parse } from '../lib/validate';
import { errors } from '../lib/errors';
import { createSmsProvider } from '../lib/sms';
import { config } from '../config';
import { meView } from './me.routes';

const OTP_TTL_MS = 5 * 60 * 1000;
const RESEND_COOLDOWN_MS = 60 * 1000;
const MAX_ATTEMPTS = 5;

const sms = createSmsProvider();

function hashCode(phone: string, code: string): string {
  return createHash('sha256').update(`${phone}:${code}:${config.jwtSecret}`).digest('hex');
}

export async function authRoutes(app: FastifyInstance) {
  app.post('/auth/otp/request', async (req) => {
    const { phone } = parse(otpRequestSchema, req.body);

    const last = await prisma.otpCode.findFirst({
      where: { phone },
      orderBy: { createdAt: 'desc' },
    });
    if (last && Date.now() - last.createdAt.getTime() < RESEND_COOLDOWN_MS) {
      throw errors.otpCooldown();
    }

    const code = randomInt(100000, 1000000).toString();
    await prisma.otpCode.create({
      data: {
        phone,
        codeHash: hashCode(phone, code),
        expiresAt: new Date(Date.now() + OTP_TTL_MS),
      },
    });
    await sms.send(phone, `rentqil: kirish kodi ${code}`);

    // dev convenience only, config guards it against production
    return { ok: true, ...(config.otpDevEcho ? { devCode: code } : {}) };
  });

  app.post('/auth/otp/verify', async (req) => {
    const { phone, code } = parse(otpVerifySchema, req.body);

    const otp = await prisma.otpCode.findFirst({
      where: { phone, consumedAt: null },
      orderBy: { createdAt: 'desc' },
    });
    if (!otp || otp.expiresAt.getTime() < Date.now()) throw errors.otpExpired();
    if (otp.attempts >= MAX_ATTEMPTS) throw errors.otpTooMany();

    if (otp.codeHash !== hashCode(phone, code)) {
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
      where: { phone },
      update: {},
      create: { phone },
      include: { ownerApplication: true },
    });
    if (user.blockedAt) throw errors.userBlocked();

    const token = app.jwt.sign({ sub: user.id }, { expiresIn: '30d' });
    return { token, me: meView(user, user.ownerApplication) };
  });
}
