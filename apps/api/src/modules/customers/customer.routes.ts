import { Router } from 'express';
import { requireAuth, requireRoles } from '../../middleware/auth';
import { validate } from '../../middleware/validate';
import { asyncHandler } from '../../shared/utils/async-handler';
import { customerController } from './customer.controller';
import {
  customerBodySchema,
  customerListQuerySchema,
  customerPaymentSchema,
  customerUpdateSchema,
  prescriptionBodySchema,
} from './customer.validators';

export const customersRouter = Router();

customersRouter.use(requireAuth, requireRoles('BILLING'));

customersRouter.get('/analytics', requireRoles('ADMINS'), asyncHandler(customerController.analytics));
customersRouter.get('/', validate({ query: customerListQuerySchema }), asyncHandler(customerController.list));
customersRouter.post('/', validate({ body: customerBodySchema }), asyncHandler(customerController.create));
customersRouter.get('/:id', asyncHandler(customerController.get));
customersRouter.patch('/:id', validate({ body: customerUpdateSchema }), asyncHandler(customerController.update));
customersRouter.delete('/:id', asyncHandler(customerController.delete));
customersRouter.get('/:id/history', validate({ query: customerListQuerySchema }), asyncHandler(customerController.history));
customersRouter.get('/:id/outstanding', asyncHandler(customerController.outstanding));
customersRouter.post('/:id/payments', validate({ body: customerPaymentSchema }), asyncHandler(customerController.collectPayment));
customersRouter.get('/:id/prescriptions', asyncHandler(customerController.prescriptions));
customersRouter.post('/:id/prescriptions', validate({ body: prescriptionBodySchema }), asyncHandler(customerController.addPrescription));
