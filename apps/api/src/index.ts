import { buildApp } from './app';
import { config } from './config';
import { startJobs } from './jobs';
import { registerTelegramWebhook } from './lib/telegram';

const app = await buildApp();

try {
  await app.listen({ port: config.port, host: config.host });
  startJobs();
  await registerTelegramWebhook();
} catch (err) {
  app.log.error(err);
  process.exit(1);
}
