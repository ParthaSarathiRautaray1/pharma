import { z } from 'zod';
import { paginationQuerySchema } from '../../shared/utils/pagination';

const uuid = z.string().uuid();
const optionalText = z.string().trim().max(1000).optional();
const money = z.coerce.number().positive().max(9_999_999);

export const customerBodySchema = z.object({
  name: z.string().trim().min(1).max(150),
  phone: z.string().trim().min(5).max(30),
  email: z.string().trim().email().max(150).optional(),
  gender: z.string().trim().max(30).optional(),
  dateOfBirth: z.coerce.date().optional(),
  address: z.string().trim().max(500).optional(),
  notes: optionalText,
});

export const customerUpdateSchema = customerBodySchema.partial();

export const customerListQuerySchema = paginationQuerySchema.extend({
  search: z.string().trim().optional(),
  isActive: z.coerce.boolean().optional(),
});

export const customerPaymentSchema = z.object({
  amount: money,
  method: z.enum(['CASH', 'UPI', 'CARD']),
  reference: z.string().trim().max(120).optional(),
});

export const prescriptionBodySchema = z.object({
  fileUrl: z.string().trim().min(1).max(1000),
  note: optionalText,
  saleId: uuid.optional(),
});

export type CustomerListQuery = z.infer<typeof customerListQuerySchema>;
export type CustomerBody = z.infer<typeof customerBodySchema>;
export type CustomerPaymentInput = z.infer<typeof customerPaymentSchema>;
export type PrescriptionInput = z.infer<typeof prescriptionBodySchema>;
