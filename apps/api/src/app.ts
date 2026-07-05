import compression from 'compression';
import cors from 'cors';
import express, { type Express, type Request, type Response } from 'express';
import rateLimit from 'express-rate-limit';
import helmet from 'helmet';
import { env } from './config/env';
import { errorHandler } from './middleware/error-handler';
import { authRouter } from './modules/auth/auth.routes';
import { returnsRouter, salesRouter } from './modules/billing/billing.routes';
import { customersRouter } from './modules/customers/customer.routes';
import { dashboardRouter } from './modules/dashboard/dashboard.routes';
import {
  batchesRouter,
  brandsRouter,
  categoriesRouter,
  medicinesRouter,
  stockRouter,
} from './modules/inventory/inventory.routes';
import './shared/types/auth';

/**
 * Express application factory. Feature routers are mounted here as
 * modules are built (auth, inventory, billing, ...). Keeping app
 * creation separate from server startup makes the app testable.
 */
export function createApp(): Express {
  const app = express();

  // Behind a reverse proxy (Render / Nginx) — trust X-Forwarded-* headers
  app.set('trust proxy', 1);

  app.use(helmet());
  app.use(
    cors({
      origin: env.CORS_ORIGINS,
      credentials: true,
    }),
  );
  app.use(compression());
  app.use(express.json({ limit: '2mb' }));
  app.use(express.urlencoded({ extended: true }));
  app.use(
    rateLimit({
      windowMs: env.RATE_LIMIT_WINDOW_MS,
      max: env.RATE_LIMIT_MAX,
      standardHeaders: true,
      legacyHeaders: false,
    }),
  );

  // Health check — used by Render, uptime monitors, and deploy scripts
  app.get('/health', (_req: Request, res: Response) => {
    res.json({ success: true, data: { status: 'ok', uptime: process.uptime() } });
  });

  // API v1 routes
  app.use('/api/v1/auth', authRouter);
  app.use('/api/v1/dashboard', dashboardRouter);
  app.use('/api/v1/categories', categoriesRouter);
  app.use('/api/v1/brands', brandsRouter);
  app.use('/api/v1/medicines', medicinesRouter);
  app.use('/api/v1/batches', batchesRouter);
  app.use('/api/v1/stock', stockRouter);
  app.use('/api/v1/sales', salesRouter);
  app.use('/api/v1/returns', returnsRouter);
  app.use('/api/v1/customers', customersRouter);

  // 404 for unknown API routes
  app.use((_req: Request, res: Response) => {
    res.status(404).json({
      success: false,
      error: { code: 'NOT_FOUND', message: 'Resource not found' },
    });
  });

  // Must be registered last
  app.use(errorHandler);

  return app;
}
