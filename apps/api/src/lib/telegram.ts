import { config } from '../config';

// thin client for the telegram bot api, no sdk needed for two calls.
// everything here is best effort: a lost alert must never break a booking

const API = 'https://api.telegram.org';

export function telegramEnabled(): boolean {
  return Boolean(config.telegram.botToken && config.telegram.webhookSecret);
}

export async function sendTelegram(chatId: string, text: string): Promise<void> {
  if (!config.telegram.botToken) return;
  const res = await fetch(`${API}/bot${config.telegram.botToken}/sendMessage`, {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify({ chat_id: chatId, text }),
  });
  if (!res.ok) {
    const body = await res.text().catch(() => '');
    throw new Error(`telegram sendMessage failed: ${res.status} ${body.slice(0, 200)}`);
  }
}

// points the bot at our webhook, called once on boot
export async function registerTelegramWebhook(): Promise<void> {
  if (!telegramEnabled()) return;
  const url = `${config.publicApiUrl}/telegram/webhook/${config.telegram.webhookSecret}`;
  const res = await fetch(`${API}/bot${config.telegram.botToken}/setWebhook`, {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify({ url, allowed_updates: ['message'] }),
  });
  if (!res.ok) {
    const body = await res.text().catch(() => '');
    console.error(`telegram setWebhook failed: ${res.status} ${body.slice(0, 200)}`);
  }
}
