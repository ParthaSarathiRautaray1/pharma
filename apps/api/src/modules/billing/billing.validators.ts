import { z } from 'zod';
import { paginationQuerySchema } from '../../shared/utils/pagination';

const money = z.coerce.number().nonnegative().max(9_999_999);
const uuid = z.string().uuid();

export const paymentSchema = z.object({
  method: z.enum(['CASH', 'UPI', 'CARD']),
  amount: money,
  reference: z.string().trim().max(120).optional(),
});

export const saleItemSchema = z.object({
  medicineId: uuid,
  batchId: uuid,
  quantity: z.coerce.number().int().min(1).max(10_000),
  unitPrice: money.optional(),
});

export const createSaleSchema = z.object({
  customerId: uuid.optional(),
  items: z.array(saleItemSchema).min(1),
  discountType: z.enum(['PERCENTAGE', 'FLAT']).optional(),
  discountValue: money.default(0),
  payments: z.array(paymentSchema).default([]),
  notes: z.string().trim().max(1000).optional(),
});

export const saleListQuerySchema = paginationQuerySchema.extend({
  from: z.coerce.date().optional(),
  to: z.coerce.date().optional(),
  customerId: uuid.optional(),
  paymentStatus: z.enum(['PAID', 'PARTIAL', 'UNPAID']).optional(),
  cashierId: uuid.optional(),
});

export const collectPaymentSchema = z.object({
  payments: z.array(paymentSchema).min(1),
});

export const returnItemSchema = z.object({
  saleItemId: uuid,
  quantity: z.coerce.number().int().min(1).max(10_000),
});

export const createReturnSchema = z.object({
  items: z.array(returnItemSchema).min(1),
  reason: z.string().trim().max(500).optional(),
  refundMethod: z.enum(['CASH', 'UPI', 'CARD']).default('CASH'),
});

export type CreateSaleInput = z.infer<typeof createSaleSchema>;
export type SaleListQuery = z.infer<typeof saleListQuerySchema>;
export type CollectPaymentInput = z.infer<typeof collectPaymentSchema>;
export type CreateReturnInput = z.infer<typeof createReturnSchema>;
