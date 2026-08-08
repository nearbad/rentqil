import { createHash, randomInt } from 'node:crypto';
import type { FastifyInstance } from 'fastify';
import { prisma } from '../lib/db';
import { config } from '../config';
import { createEmailProvider } from '../lib/email';
import { sendTelegram } from '../lib/telegram';

// linking flow inside the bot chat:
//   /start -> bot asks for the account email
//   <email> -> we mail a 6 digit code to that address
//   <code>  -> the chat is linked, booking alerts start coming
//   /stop   -> unlink
// replies are uz + ru in one message, the bot has no locale of its own

const mailer = createEmailProvider();

const LINK_TTL_MS = 10 * 60_000;
const MAX_ATTEMPTS = 5;

function hashLinkCode(chatId: string, code: string): string {
  return createHash('sha256').update(`tg:${chatId}:${code}:${config.jwtSecret}`).digest('hex');
}

const TEXTS = {
  start:
    "rentqil bot.\n\nHisobingiz emailini yuboring, tasdiqlash kodi shu emailga boradi.\n\nОтправьте email вашего аккаунта rentqil - на него придёт код подтверждения.",
  noAccount:
    'Bu email bilan hisob topilmadi.\n\nАккаунт с таким email не найден. Сначала зарегистрируйтесь на rentqil.com.',
  codeSent:
    'Kod emailga yubordik, shu yerga yozing.\n\nКод отправлен на почту. Введите его сюда одним сообщением.',
  linked:
    "Ulandi! Endi bronlar haqida xabarlar shu yerga keladi.\n\nГотово! Уведомления о бронях будут приходить сюда. Отключить: /stop",
  badCode: "Kod noto'g'ri yoki eskirgan. /start dan qayta boshlang.\n\nКод неверный или устарел. Начните заново: /start",
  unlinked: "O'chirildi.\n\nУведомления отключены. Подключить снова: /start",
  help:
    "Email yoki kodni yuboring. Boshlash: /start\n\nОтправьте email аккаунта или код из письма. Начать заново: /start, отключить уведомления: /stop",
};

interface TgUpdate {
  message?: { chat?: { id?: number | string }; text?: string };
}

export async function telegramRoutes(app: FastifyInstance) {
  app.post('/telegram/webhook/:secret', async (req, reply) => {
    const { secret } = req.params as { secret: string };
    // wrong secret gets a 200 with nothing done, no oracle for guessers
    if (!config.telegram.webhookSecret || secret !== config.telegram.webhookSecret) {
      return reply.send({ ok: true });
    }

    const update = req.body as TgUpdate;
    const chatIdRaw = update.message?.chat?.id;
    const text = (update.message?.text ?? '').trim();
    if (chatIdRaw === undefined || !text) return reply.send({ ok: true });
    const chatId = String(chatIdRaw);

    // telegram retries on errors, so reply 200 no matter what happens inside
    try {
      await handleMessage(chatId, text);
    } catch (err) {
      req.log.error({ err }, 'telegram webhook handler failed');
    }
    return reply.send({ ok: true });
  });
}

async function handleMessage(chatId: string, text: string): Promise<void> {
  if (text === '/start') {
    await sendTelegram(chatId, TEXTS.start);
    return;
  }

  if (text === '/stop') {
    await prisma.user.updateMany({ where: { telegramChatId: chatId }, data: { telegramChatId: null } });
    await sendTelegram(chatId, TEXTS.unlinked);
    return;
  }

  if (/^\S+@\S+\.\S+$/.test(text)) {
    const email = text.toLowerCase();
    const user = await prisma.user.findUnique({ where: { email } });
    if (!user) {
      await sendTelegram(chatId, TEXTS.noAccount);
      return;
    }
    const code = randomInt(100000, 1000000).toString();
    await prisma.telegramLinkCode.create({
      data: {
        userId: user.id,
        chatId,
        codeHash: hashLinkCode(chatId, code),
        expiresAt: new Date(Date.now() + LINK_TTL_MS),
      },
    });
    await mailer.send(
      email,
      'rentqil: telegram tasdiqlash kodi',
      `Telegram botni ulash kodi / код подключения telegram-бота: ${code}`
    );
    await sendTelegram(chatId, TEXTS.codeSent);
    return;
  }

  if (/^\d{6}$/.test(text)) {
    const link = await prisma.telegramLinkCode.findFirst({
      where: { chatId, consumedAt: null, expiresAt: { gt: new Date() } },
      orderBy: { createdAt: 'desc' },
    });
    if (!link || link.attempts >= MAX_ATTEMPTS || link.codeHash !== hashLinkCode(chatId, text)) {
      if (link) {
        await prisma.telegramLinkCode.update({
          where: { id: link.id },
          data: { attempts: { increment: 1 } },
        });
      }
      await sendTelegram(chatId, TEXTS.badCode);
      return;
    }
    await prisma.$transaction([
      prisma.telegramLinkCode.update({ where: { id: link.id }, data: { consumedAt: new Date() } }),
      // one chat belongs to one account, steal it from any previous owner
      prisma.user.updateMany({ where: { telegramChatId: chatId }, data: { telegramChatId: null } }),
      prisma.user.update({ where: { id: link.userId }, data: { telegramChatId: chatId } }),
    ]);
    await sendTelegram(chatId, TEXTS.linked);
    return;
  }

  await sendTelegram(chatId, TEXTS.help);
}
