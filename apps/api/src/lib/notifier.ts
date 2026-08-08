import { formatMoney } from '@rentqil/shared';
import { prisma, type Prisma } from './db';
import { createEmailProvider } from './email';
import { sendTelegram } from './telegram';

// single entry point for user notifications: an in-app row always,
// plus an email for the events people actually care to see in the inbox,
// plus telegram when the user linked a chat through the bot

export interface Notifier {
  notify(userId: string, type: string, data: Record<string, unknown>): Promise<void>;
}

const mailer = createEmailProvider();

function ownerBookingLine(d: Record<string, unknown>): string {
  const time = `${d.date ?? ''} ${d.startHour ?? ''}:00-${d.endHour ?? ''}:00`;
  const amount = typeof d.amountTiyin === 'number' ? formatMoney(d.amountTiyin) : '';
  return `${d.venue ?? ''} / ${d.court ?? ''}\n${time}\n${amount}\ntel: ${d.contactPhone ?? '-'}`;
}

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
  owner_new_booking: (d) => ({
    subject: 'rentqil: yangi bron / новая бронь',
    text: `Sizda yangi bron / у вас новая бронь:\n${ownerBookingLine(d)}`,
  }),
};

// what lands in the telegram chat, owners live on booking alerts
const TELEGRAM_TEXTS: Record<string, (d: Record<string, unknown>) => string> = {
  owner_new_booking: (d) => `Yangi bron / новая бронь\n${ownerBookingLine(d)}`,
  booking_cancelled: (d) => `Bron bekor qilindi / бронь отменена: ${d.venue ?? ''}`,
};

class InAppNotifier implements Notifier {
  async notify(userId: string, type: string, data: Record<string, unknown>): Promise<void> {
    await prisma.notification.create({
      data: { userId, type, data: data as Prisma.InputJsonValue },
    });

    const emailTemplate = EMAIL_TEXTS[type];
    const tgTemplate = TELEGRAM_TEXTS[type];
    if (!emailTemplate && !tgTemplate) return;
    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: { email: true, telegramChatId: true },
    });
    if (!user) return;

    // a lost email or telegram message must never break the flow that triggered it
    if (emailTemplate && user.email) {
      const { subject, text } = emailTemplate(data);
      await mailer.send(user.email, subject, text).catch((err) => {
        console.error('notification email failed', err);
      });
    }
    if (tgTemplate && user.telegramChatId) {
      await sendTelegram(user.telegramChatId, tgTemplate(data)).catch((err) => {
        console.error('notification telegram failed', err);
      });
    }
  }
}

export const notifier: Notifier = new InAppNotifier();
