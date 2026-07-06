// PM2 process file for the self-hosted VPS path (production).
//   Build first:  npm ci && npm run build:api && npm run prisma:deploy --workspace=apps/api
//   Start:        pm2 start apps/api/ecosystem.config.cjs
//   Persist boot: pm2 save && pm2 startup
//
// Env is read from apps/api/.env by the app itself (dotenv), so secrets stay
// out of this file and out of git.
module.exports = {
  apps: [
    {
      name: 'pharmacare-api',
      cwd: __dirname,
      script: 'dist/server.js',
      // Cluster across cores. SAFE today because no in-process cron jobs exist.
      // If you later add scheduled jobs (expiry/low-stock scans), either run
      // them in a single `fork` instance or guard them with
      // `process.env.NODE_APP_INSTANCE === '0'` so they don't fire N times.
      instances: 'max',
      exec_mode: 'cluster',
      max_memory_restart: '400M',
      env: { NODE_ENV: 'production' },
      // Graceful shutdown: server.ts closes the HTTP server and disconnects
      // Prisma on SIGTERM/SIGINT within 10s.
      kill_timeout: 11000,
    },
  ],
};
