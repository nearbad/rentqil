import type { PlatformConfig } from '../lib/db';
import { prisma } from '../lib/db';

// platform config is one db row edited from the admin panel
// cached briefly so hot paths do not hammer the db

let cached: PlatformConfig | null = null;
let cachedAt = 0;
const TTL_MS = 5000;

export async function getPlatformConfig(): Promise<PlatformConfig> {
  const now = Date.now();
  if (cached && now - cachedAt < TTL_MS) return cached;
  cached = await prisma.platformConfig.upsert({
    where: { id: 1 },
    update: {},
    create: { id: 1 },
  });
  cachedAt = now;
  return cached;
}

export function invalidateConfigCache(): void {
  cached = null;
}
