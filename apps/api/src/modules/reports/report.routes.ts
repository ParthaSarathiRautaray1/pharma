import { Router } from 'express';
import { requireAuth, requireRoles } from '../../middleware/auth';
import { validate } from '../../middleware/validate';
import { asyncHandler } from '../../shared/utils/async-handler';
import { reportController } from './report.controller';
import { reportQuerySchema } from './report.validators';

export const reportsRouter = Router();

reportsRouter.use(requireAuth, requireRoles('CLINICAL'));
reportsRouter.get('/:kind', validate({ query: reportQuerySchema }), asyncHandler(reportController.run));
