import { prisma, type Prisma } from './db';

// single entry point for user notifications
// v1 only writes in-app rows, sms/telegram/push implementations
// plug in here later without touching call sites

export interface Notifier {
  notify(userId: string, type: string, data: Record<string, unknown>): Promise<void>;
}

class InAppNotifier implements Notifier {
  async notify(userId: string, type: string, data: Record<string, unknown>): Promise<void> {
    await prisma.notification.create({
      data: { userId, type, data: data as Prisma.InputJsonValue },
    });
  }
}

export const notifier: Notifier = new InAppNotifier();
