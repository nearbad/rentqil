import { prisma, type Prisma } from './db';
import { createEmailProvider } from './email';

// single entry point for user notifications: an in-app row always,
// plus an email for the events people actually care to see in the inbox

export interface Notifier {
  notify(userId: string, type: string, data: Record<string, unknown>): Promise<void>;
}

const mailer = createEmailProvider();

// short uz subjects, the in-app feed stays fully localized
const EMAIL_TEXTS: Record<string, (d: Record<string, unknown>) => { subject: string; text: string }> = {
  booking_confirmed: (d) => ({
    subject: 'rentqil: bron tasdiqlandi',
    text: `${d.venue ?? ''} - bron tasdiqlandi. ${d.date ?? ''} ${d.startHour ?? ''}:00`,
  }),
  booking_reminder: (d) => ({
    subject: `rentqil: o'yin ${d.hours ?? ''} soatdan keyin`,
    text: `${d.venue ?? ''} - o'yin boshlanishiga ${d.hours ?? ''} soat qoldi.`,
  }),
  booking_cancelled: (d) => ({
    subject: 'rentqil: bron bekor qilindi',
    text: `${d.venue ?? ''} - bron bekor qilindi.`,
  }),
  refund_issued: () => ({
    subject: 'rentqil: pul qaytarildi',
    text: "To'lovingiz qaytarildi, tafsilotlar saytda.",
  }),
};

class InAppNotifier implements Notifier {
  async notify(userId: string, type: string, data: Record<string, unknown>): Promise<void> {
    await prisma.notification.create({
      data: { userId, type, data: data as Prisma.InputJsonValue },
    });

    const template = EMAIL_TEXTS[type];
    if (!template) return;
    const user = await prisma.user.findUnique({ where: { id: userId }, select: { email: true } });
    if (!user?.email) return;
    const { subject, text } = template(data);
    // a lost email must never break the flow that triggered it
    await mailer.send(user.email, subject, text).catch((err) => {
      console.error('notification email failed', err);
    });
  }
}

export const notifier: Notifier = new InAppNotifier();
