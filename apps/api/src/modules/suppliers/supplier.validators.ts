import { z } from 'zod';
import { paginationQuerySchema } from '../../shared/utils/pagination';

export const supplierBodySchema = z.object({
  name: z.string().trim().min(1).max(150),
  contactPerson: z.string().trim().max(150).optional(),
  phone: z.string().trim().min(5).max(30),
  email: z.string().trim().email().max(150).optional(),
  gstin: z.string().trim().max(30).optional(),
  address: z.string().trim().max(500).optional(),
});

export const supplierUpdateSchema = supplierBodySchema.partial();

export const supplierListQuerySchema = paginationQuerySchema.extend({
  search: z.string().trim().optional(),
  isActive: z.coerce.boolean().optional(),
});

export type SupplierBody = z.infer<typeof supplierBodySchema>;
export type SupplierListQuery = z.infer<typeof supplierListQuerySchema>;
