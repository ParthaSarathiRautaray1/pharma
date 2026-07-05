import { Router } from 'express';
import { requireAuth, requireRoles } from '../../middleware/auth';
import { validate } from '../../middleware/validate';
import { asyncHandler } from '../../shared/utils/async-handler';
import { supplierController } from './supplier.controller';
import { supplierBodySchema, supplierListQuerySchema, supplierUpdateSchema } from './supplier.validators';

export const suppliersRouter = Router();

suppliersRouter.use(requireAuth, requireRoles('INVENTORY'));
suppliersRouter.get('/reports', asyncHandler(supplierController.reports));
suppliersRouter.get('/', validate({ query: supplierListQuerySchema }), asyncHandler(supplierController.list));
suppliersRouter.post('/', validate({ body: supplierBodySchema }), asyncHandler(supplierController.create));
suppliersRouter.get('/:id', asyncHandler(supplierController.get));
suppliersRouter.patch('/:id', validate({ body: supplierUpdateSchema }), asyncHandler(supplierController.update));
suppliersRouter.delete('/:id', asyncHandler(supplierController.delete));
suppliersRouter.get('/:id/outstanding', asyncHandler(supplierController.outstanding));
