import { createApp } from './app';
import { env } from './config/env';
import { logger } from './config/logger';
import { prisma } from './config/prisma';

const app = createApp();

const server = app.listen(env.PORT, () => {
  logger.info(`🚀 PharmaCare API listening on port ${env.PORT} [${env.NODE_ENV}]`);
});

// Graceful shutdown — lets PM2 / Render finish in-flight requests, and
// disconnects Prisma so pooled connections (and their prepared statements)
// are released. Without this, a `tsx watch` restart can leave stale
// prepared statements on Supabase's pgbouncer pool, causing intermittent
// "prepared statement already exists" 500s on the next boot.
let shuttingDown = false;
async function shutdown(signal: string) {
  if (shuttingDown) return;
  shuttingDown = true;
  logger.info(`${signal} received, shutting down gracefully`);

  const forceExit = setTimeout(() => process.exit(1), 10_000).unref();
  server.close(async () => {
    await prisma.$disconnect().catch(() => undefined);
    clearTimeout(forceExit as unknown as NodeJS.Timeout);
    logger.info('HTTP server closed, database disconnected');
    process.exit(0);
  });
}

process.on('SIGTERM', () => void shutdown('SIGTERM'));
process.on('SIGINT', () => void shutdown('SIGINT'));
// tsx watch sends SIGUSR2 before restarting — disconnect Prisma first
process.once('SIGUSR2', async () => {
  await prisma.$disconnect().catch(() => undefined);
  process.kill(process.pid, 'SIGUSR2');
});
