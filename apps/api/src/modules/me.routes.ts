import type { FastifyInstance } from 'fastify';
import type { OwnerApplication, User } from '../lib/db';
import type { MeView, NotificationView } from '@rentqil/shared';
import { updateMeSchema } from '@rentqil/shared';
import { prisma } from '../lib/db';
import { errors } from '../lib/errors';
import { parse } from '../lib/validate';

export function meView(user: User, application: OwnerApplication | null): MeView {
  return {
    id: user.id,
    email: user.email,
    phone: user.phone,
    name: user.name,
    role: user.role,
    locale: user.locale,
    ownerApplicationStatus: application ? application.status : 'none',
  };
}

export async function meRoutes(app: FastifyInstance) {
  app.get('/me', { preHandler: app.requireUser }, async (req) => {
    const application = await prisma.ownerApplication.findUnique({
      where: { userId: req.user!.id },
    });
    return meView(req.user!, application);
  });

  app.patch('/me', { preHandler: app.requireUser }, async (req) => {
    const data = parse(updateMeSchema, req.body);
    try {
      const user = await prisma.user.update({
        where: { id: req.user!.id },
        data,
        include: { ownerApplication: true },
      });
      return meView(user, user.ownerApplication);
    } catch (err) {
      const fields = (err as { meta?: { constraint?: { fields?: string[] } } })?.meta;
      const isUnique = (err as { code?: string })?.code === 'P2002';
      if (isUnique) {
        const onPhone = JSON.stringify(fields ?? {}).includes('phone');
        throw onPhone ? errors.phoneTaken() : errors.emailTaken();
      }
      throw err;
    }
  });

  app.get('/me/notifications', { preHandler: app.requireUser }, async (req) => {
    const rows = await prisma.notification.findMany({
      where: { userId: req.user!.id },
      orderBy: { createdAt: 'desc' },
      take: 50,
    });
    const items: NotificationView[] = rows.map((n) => ({
      id: n.id,
      type: n.type,
      data: (n.data ?? {}) as Record<string, unknown>,
      readAt: n.readAt?.toISOString() ?? null,
      createdAt: n.createdAt.toISOString(),
    }));
    const unread = await prisma.notification.count({
      where: { userId: req.user!.id, readAt: null },
    });
    return { items, unread };
  });

  app.post('/me/notifications/read', { preHandler: app.requireUser }, async (req) => {
    await prisma.notification.updateMany({
      where: { userId: req.user!.id, readAt: null },
      data: { readAt: new Date() },
    });
    return { ok: true };
  });
}
