import { z } from 'zod';
import { paginationQuerySchema } from '../../shared/utils/pagination';

const money = z.coerce.number().nonnegative().max(9_999_999);
const optionalDate = z.coerce.date().optional();

// ── Categories ───────────────────────────────────────────────────────
export const categoryBodySchema = z.object({
  name: z.string().trim().min(1).max(100),
  description: z.string().trim().max(500).optional(),
});

// ── Brands ───────────────────────────────────────────────────────────
export const brandBodySchema = z.object({
  name: z.string().trim().min(1).max(100),
  manufacturer: z.string().trim().max(150).optional(),
});

// ── Medicines ────────────────────────────────────────────────────────
export const medicineBodySchema = z.object({
  name: z.string().trim().min(1).max(200),
  genericName: z.string().trim().max(200).optional(),
  categoryId: z.string().uuid().optional(),
  brandId: z.string().uuid().optional(),
  unit: z.string().trim().max(30).default('STRIP'),
  packSize: z.string().trim().max(50).optional(),
  hsnCode: z.string().trim().max(20).optional(),
  gstRate: z.coerce.number().min(0).max(100).default(12),
  barcode: z.string().trim().max(60).optional(),
  rackNumber: z.string().trim().max(30).optional(),
  minStockLevel: z.coerce.number().int().min(0).default(10),
  requiresPrescription: z.coerce.boolean().default(false),
  description: z.string().trim().max(1000).optional(),
});

export const medicineUpdateSchema = medicineBodySchema.partial();

export const medicineListQuerySchema = paginationQuerySchema.extend({
  search: z.string().trim().optional(),
  categoryId: z.string().uuid().optional(),
  brandId: z.string().uuid().optional(),
  lowStock: z.coerce.boolean().optional(),
  expired: z.coerce.boolean().optional(),
  isActive: z.coerce.boolean().optional(),
});

// ── Batches ──────────────────────────────────────────────────────────
export const batchBodySchema = z
  .object({
    medicineId: z.string().uuid(),
    batchNumber: z.string().trim().min(1).max(60),
    mfgDate: optionalDate,
    expiryDate: z.coerce.date(),
    purchasePrice: money,
    sellingPrice: money,
    mrp: money,
    quantity: z.coerce.number().int().min(0).default(0),
  })
  .refine((b) => b.sellingPrice <= b.mrp, {
    path: ['sellingPrice'],
    message: 'Selling price cannot exceed MRP',
  });

export const batchListQuerySchema = paginationQuerySchema.extend({
  medicineId: z.string().uuid().optional(),
  nearExpiry: z.coerce.boolean().optional(),
  expired: z.coerce.boolean().optional(),
});

// ── Stock adjustment ─────────────────────────────────────────────────
export const stockAdjustmentSchema = z
  .object({
    batchId: z.string().uuid(),
    quantityChange: z.coerce.number().int().refine((n) => n !== 0, 'Quantity change cannot be zero'),
    reason: z.enum(['DAMAGE', 'EXPIRY', 'THEFT', 'RECOUNT', 'OTHER']),
    note: z.string().trim().max(500).optional(),
  });

export const ledgerQuerySchema = paginationQuerySchema.extend({
  medicineId: z.string().uuid().optional(),
  batchId: z.string().uuid().optional(),
});

export type MedicineListQuery = z.infer<typeof medicineListQuerySchema>;
export type BatchListQuery = z.infer<typeof batchListQuerySchema>;
export type LedgerQuery = z.infer<typeof ledgerQuerySchema>;
