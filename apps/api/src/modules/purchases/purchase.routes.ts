import { Router } from 'express';
import { z } from 'zod';
import { requireAuth, requireRoles } from '../../middleware/auth';
import { validate } from '../../middleware/validate';
import { asyncHandler } from '../../shared/utils/async-handler';
import { purchaseController } from './purchase.controller';
import {
  createPurchaseSchema,
  purchaseListQuerySchema,
  purchasePaymentSchema,
  purchaseUpdateSchema,
} from './purchase.validators';

export const purchasesRouter = Router();

purchasesRouter.use(requireAuth, requireRoles('INVENTORY'));
purchasesRouter.get('/', validate({ query: purchaseListQuerySchema }), asyncHandler(purchaseController.list));
purchasesRouter.post('/', validate({ body: createPurchaseSchema }), asyncHandler(purchaseController.create));
purchasesRouter.get('/:id', asyncHandler(purchaseController.get));
purchasesRouter.patch('/:id', validate({ body: purchaseUpdateSchema }), asyncHandler(purchaseController.update));
purchasesRouter.post('/:id/receive', asyncHandler(purchaseController.receive));
purchasesRouter.post('/:id/payments', validate({ body: purchasePaymentSchema }), asyncHandler(purchaseController.collectPayment));
purchasesRouter.post(
  '/:id/invoice-file',
  validate({ body: z.object({ invoiceFileUrl: z.string().trim().min(1).max(1000) }) }),
  asyncHandler(purchaseController.invoiceFile),
);
