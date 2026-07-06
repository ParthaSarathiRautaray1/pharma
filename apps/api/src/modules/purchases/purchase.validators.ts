import { z } from 'zod';
import { paginationQuerySchema } from '../../shared/utils/pagination';

const money = z.coerce.number().nonnegative().max(9_999_999);
const uuid = z.string().uuid();

export const purchaseItemSchema = z.object({
  medicineId: uuid,
  batchNumber: z.string().trim().min(1).max(60),
  mfgDate: z.coerce.date().optional(),
  expiryDate: z.coerce.date(),
  quantity: z.coerce.number().int().min(1),
  freeQuantity: z.coerce.number().int().min(0).default(0),
  purchasePrice: money,
  sellingPrice: money,
  mrp: money,
  gstRate: z.coerce.number().min(0).max(100),
}).refine((v) => v.sellingPrice <= v.mrp, {
  path: ['sellingPrice'],
  message: 'Selling price cannot exceed MRP',
});

export const createPurchaseSchema = z.object({
  supplierId: uuid,
  supplierInvoiceNo: z.string().trim().max(100).optional(),
  orderDate: z.coerce.date().optional(),
  discountAmount: money.default(0),
  paidAmount: money.default(0),
  paymentMethod: z.enum(['CASH', 'UPI', 'CARD']).optional(),
  paymentReference: z.string().trim().max(120).optional(),
  invoiceFileUrl: z.string().trim().max(1000).optional(),
  notes: z.string().trim().max(1000).optional(),
  items: z.array(purchaseItemSchema).min(1),
});

export const purchaseListQuerySchema = paginationQuerySchema.extend({
  supplierId: uuid.optional(),
  status: z.enum(['ORDERED', 'RECEIVED', 'CANCELLED']).optional(),
  paymentStatus: z.enum(['PAID', 'PARTIAL', 'UNPAID']).optional(),
  from: z.coerce.date().optional(),
  to: z.coerce.date().optional(),
});

export const purchasePaymentSchema = z.object({
  amount: money.refine((value) => value > 0, 'Amount must be greater than zero'),
  method: z.enum(['CASH', 'UPI', 'CARD']),
  reference: z.string().trim().max(120).optional(),
});

export const purchaseUpdateSchema = z.object({
  supplierInvoiceNo: z.string().trim().max(100).optional(),
  invoiceFileUrl: z.string().trim().max(1000).optional(),
  notes: z.string().trim().max(1000).optional(),
  status: z.enum(['ORDERED', 'CANCELLED']).optional(),
});

export type CreatePurchaseInput = z.infer<typeof createPurchaseSchema>;
export type PurchaseListQuery = z.infer<typeof purchaseListQuerySchema>;
export type PurchasePaymentInput = z.infer<typeof purchasePaymentSchema>;
export type PurchaseUpdateInput = z.infer<typeof purchaseUpdateSchema>;
