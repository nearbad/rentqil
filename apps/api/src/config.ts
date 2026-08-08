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
  apiUrl: process.env.API_URL ?? 'http://localhost:3001',
  smsProvider: process.env.SMS_PROVIDER ?? 'mock',
  otpDevEcho: process.env.OTP_DEV_ECHO === '1' && dev,
  mockWebhookSecret: process.env.MOCK_WEBHOOK_SECRET ?? 'mock-secret',
  adminPhone: process.env.ADMIN_PHONE ?? '+998900000000',
  eskiz: {
    email: process.env.ESKIZ_EMAIL ?? '',
    password: process.env.ESKIZ_PASSWORD ?? '',
  },
};
