import 'dotenv/config';

function required(name: string): string {
  const value = process.env[name];
  if (!value) throw new Error(`missing env ${name}`);
  return value;
}

const dev = process.env.NODE_ENV !== 'production';

export const config = {
  dev,
  port: Number(process.env.PORT ?? 3001),
  host: process.env.HOST ?? '0.0.0.0',
  databaseUrl: required('DATABASE_URL'),
  jwtSecret: process.env.JWT_SECRET ?? (dev ? 'dev-secret' : required('JWT_SECRET')),
  webUrl: process.env.WEB_URL ?? 'http://localhost:8081',
  // where the api posts to itself (mock psp webhooks), stays internal
  apiUrl: process.env.API_URL ?? 'http://localhost:3001',
  // what the browser can reach, used for the oauth redirect uri
  publicApiUrl: process.env.PUBLIC_API_URL ?? process.env.API_URL ?? 'http://localhost:3001',
  // login codes go out by email: mock logs them, resend actually sends
  emailProvider: process.env.EMAIL_PROVIDER ?? 'mock',
  resendApiKey: process.env.RESEND_API_KEY ?? '',
  emailFrom: process.env.EMAIL_FROM ?? 'rentqil <no-reply@rentqil.com>',
  smtp: {
    host: process.env.SMTP_HOST ?? '',
    port: Number(process.env.SMTP_PORT ?? 587),
    user: process.env.SMTP_USER ?? '',
    password: process.env.SMTP_PASSWORD ?? '',
    from: process.env.SMTP_FROM ?? 'rentqil <no-reply@rentqil.com>',
  },
  // google oauth, both empty means the button is hidden in the app
  google: {
    clientId: process.env.GOOGLE_CLIENT_ID ?? '',
    clientSecret: process.env.GOOGLE_CLIENT_SECRET ?? '',
  },
  otpDevEcho: process.env.OTP_DEV_ECHO === '1' && dev,
  mockWebhookSecret: process.env.MOCK_WEBHOOK_SECRET ?? 'mock-secret',
  adminEmail: (process.env.ADMIN_EMAIL ?? 'admin@rentqil.com').toLowerCase(),
  // sms stays for future booking notifications, auth does not use it anymore
  smsProvider: process.env.SMS_PROVIDER ?? 'mock',
  eskiz: {
    email: process.env.ESKIZ_EMAIL ?? '',
    password: process.env.ESKIZ_PASSWORD ?? '',
  },
  // owner booking alerts bot, empty token disables the whole feature
  telegram: {
    botToken: process.env.TELEGRAM_BOT_TOKEN ?? '',
    webhookSecret: process.env.TELEGRAM_WEBHOOK_SECRET ?? '',
    // public bot username without @, the owner cabinet links to it
    botUsername: process.env.TELEGRAM_BOT_USERNAME ?? '',
  },
};
