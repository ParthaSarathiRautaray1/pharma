import { PrismaClient } from '@prisma/client';
import { isProd } from './env';

/**
 * Single PrismaClient for the process. tsx watch re-imports modules on
 * reload, so the instance is cached on globalThis in dev to avoid
 * exhausting the connection pool (critical on Supabase's free tier).
 */
const globalForPrisma = globalThis as unknown as { prisma?: PrismaClient };

export const prisma =
  globalForPrisma.prisma ??
  new PrismaClient({
    log: isProd ? ['error', 'warn'] : ['error', 'warn'],
    // Multi-step stock transactions (checkout, purchase receive, returns) run
    // several sequential round-trips. Against a pooled/remote DB the default
    // 5s interactive-transaction timeout is too tight, so give it headroom.
    transactionOptions: { maxWait: 10_000, timeout: 20_000 },
  });

if (!isProd) globalForPrisma.prisma = prisma;
