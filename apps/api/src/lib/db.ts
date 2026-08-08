import { PrismaClient } from '../generated/prisma/client';
import { PrismaPg } from '@prisma/adapter-pg';
import { config } from '../config';

// single client for the whole api, backed by the pg driver adapter
const adapter = new PrismaPg({ connectionString: config.databaseUrl });

export const prisma = new PrismaClient({ adapter });

// generated model and enum types flow through here so the rest of the
// code never imports from the generated folder directly
export * from '../generated/prisma/client';
