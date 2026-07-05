import { Router } from 'express';
import { requireAuth, requireRoles } from '../../middleware/auth';
import { validate } from '../../middleware/validate';
import { asyncHandler } from '../../shared/utils/async-handler';
import { billingController } from './billing.controller';
import {
  collectPaymentSchema,
  createReturnSchema,
  createSaleSchema,
  saleListQuerySchema,
} from './billing.validators';

export const salesRouter = Router();
export const returnsRouter = Router();

salesRouter.use(requireAuth, requireRoles('BILLING'));
returnsRouter.use(requireAuth, requireRoles('BILLING'));

salesRouter.get('/', validate({ query: saleListQuerySchema }), asyncHandler(billingController.listSales));
salesRouter.post('/', validate({ body: createSaleSchema }), asyncHandler(billingController.createSale));
salesRouter.get('/:id', asyncHandler(billingController.getSale));
salesRouter.get('/:id/whatsapp', asyncHandler(billingController.whatsapp));
salesRouter.post('/:id/payments', validate({ body: collectPaymentSchema }), asyncHandler(billingController.collectPayment));
salesRouter.post('/:id/returns', validate({ body: createReturnSchema }), asyncHandler(billingController.createReturn));

returnsRouter.get('/', validate({ query: saleListQuerySchema }), asyncHandler(billingController.listReturns));
