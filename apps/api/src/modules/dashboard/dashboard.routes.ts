import { Router } from 'express';
import { requireAuth, requireRoles } from '../../middleware/auth';
import { validate } from '../../middleware/validate';
import { asyncHandler } from '../../shared/utils/async-handler';
import { dashboardController } from './dashboard.controller';
import {
  monthRangeQuerySchema,
  rangeQuerySchema,
  topMedicinesQuerySchema,
} from './dashboard.validators';

export const dashboardRouter = Router();

// Dashboard is management-facing: owners, pharmacists, super admins
dashboardRouter.use(requireAuth, requireRoles('CLINICAL'));

dashboardRouter.get('/summary', asyncHandler(dashboardController.summary));
dashboardRouter.get(
  '/charts/revenue',
  validate({ query: rangeQuerySchema }),
  asyncHandler(dashboardController.revenue),
);
dashboardRouter.get(
  '/charts/sales-purchases',
  validate({ query: monthRangeQuerySchema }),
  asyncHandler(dashboardController.salesPurchases),
);
dashboardRouter.get(
  '/charts/top-medicines',
  validate({ query: topMedicinesQuerySchema }),
  asyncHandler(dashboardController.topMedicines),
);
dashboardRouter.get(
  '/charts/customers',
  validate({ query: monthRangeQuerySchema }),
  asyncHandler(dashboardController.customers),
);
