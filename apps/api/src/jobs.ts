import { prisma } from './lib/db';
import { notifier } from './lib/notifier';
import { refundAllBookingPayments } from './services/payment.service';
import { getPlatformConfig } from './services/config.service';
import { slotStartDate, ymdFromDb } from './domain/slots';

// one interval loop covers all background work, good enough for a
// single instance deployment, move to a proper queue when we scale

const TICK_MS = 30_000;
let running = false;

export async function expirePendingBookings(): Promise<number> {
  const now = new Date();
  const stale = await prisma.booking.findMany({
    where: { status: 'pending_payment', expiresAt: { lt: now } },
    include: { participants: true, court: { include: { venue: true } } },
  });

  for (const booking of stale) {
    // recheck inside a transaction, a webhook may have won the race
    const updated = await prisma.$transaction(async (tx) => {
      const fresh = await tx.booking.findUnique({ where: { id: booking.id }, select: { status: true } });
      if (fresh?.status !== 'pending_payment') return false;
      await tx.booking.update({ where: { id: booking.id }, data: { status: 'expired' } });
      return true;
    });
    if (!updated) continue;

    const refunded = await refundAllBookingPayments(booking.id);
    if (booking.isSplit && refunded > 0) {
      await notifier.notify(booking.userId, 'split_expired', {
        bookingId: booking.id,
        venue: booking.court.venue.name,
      });
    }
  }
  return stale.length;
}

export async function completeFinishedBookings(): Promise<void> {
  const now = new Date();
  const candidates = await prisma.booking.findMany({
    where: { status: 'confirmed', date: { lte: now } },
    select: { id: true, date: true, endHour: true },
  });
  const doneIds = candidates
    .filter((b) => slotStartDate(ymdFromDb(b.date), b.endHour) <= now)
    .map((b) => b.id);
  if (doneIds.length > 0) {
    await prisma.booking.updateMany({
      where: { id: { in: doneIds }, status: 'confirmed' },
      data: { status: 'completed' },
    });
  }
}

export async function sendReminders(): Promise<void> {
  const config = await getPlatformConfig();
  const now = new Date();
  const upcoming = await prisma.booking.findMany({
    where: { status: 'confirmed', remindedAt: null, date: { gte: new Date(now.getTime() - 86_400_000), lte: new Date(now.getTime() + 2 * 86_400_000) } },
    include: { participants: true, court: { include: { venue: true } } },
  });

  for (const booking of upcoming) {
    const start = slotStartDate(ymdFromDb(booking.date), booking.startHour);
    const hoursLeft = (start.getTime() - now.getTime()) / 3_600_000;
    if (hoursLeft <= 0 || hoursLeft > config.reminderHours) continue;

    await prisma.booking.update({ where: { id: booking.id }, data: { remindedAt: now } });
    const userIds = new Set<string>([booking.userId]);
    for (const p of booking.participants) if (p.userId) userIds.add(p.userId);
    const payload = {
      bookingId: booking.id,
      venue: booking.court.venue.name,
      hours: Math.max(1, Math.round(hoursLeft)),
    };
    await Promise.all([...userIds].map((uid) => notifier.notify(uid, 'booking_reminder', payload)));
  }
}

async function tick(): Promise<void> {
  if (running) return;
  running = true;
  try {
    await expirePendingBookings();
    await completeFinishedBookings();
    await sendReminders();
  } catch (err) {
    console.error('job tick failed', err);
  } finally {
    running = false;
  }
}

export function startJobs(): void {
  setInterval(tick, TICK_MS);
  void tick();
}
