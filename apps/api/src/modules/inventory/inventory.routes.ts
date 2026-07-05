import { Router } from 'express';
import { requireAuth, requireRoles } from '../../middleware/auth';
import { validate } from '../../middleware/validate';
import { asyncHandler } from '../../shared/utils/async-handler';
import { inventoryController as c } from './inventory.controller';
import {
  batchBodySchema,
  batchListQuerySchema,
  brandBodySchema,
  categoryBodySchema,
  ledgerQuerySchema,
  medicineBodySchema,
  medicineListQuerySchema,
  medicineUpdateSchema,
  stockAdjustmentSchema,
} from './inventory.validators';

// Read = any staff; write = inventory managers, pharmacists, owners
const canRead = [requireAuth, requireRoles('STAFF')];
const canWrite = [requireAuth, requireRoles('INVENTORY')];

// ── /categories ──────────────────────────────────────────────────────
export const categoriesRouter = Router();
categoriesRouter.get('/', ...canRead, asyncHandler(c.listCategories));
categoriesRouter.post('/', ...canWrite, validate({ body: categoryBodySchema }), asyncHandler(c.createCategory));
categoriesRouter.patch('/:id', ...canWrite, validate({ body: categoryBodySchema.partial() }), asyncHandler(c.updateCategory));
categoriesRouter.delete('/:id', ...canWrite, asyncHandler(c.deleteCategory));

// ── /brands ──────────────────────────────────────────────────────────
export const brandsRouter = Router();
brandsRouter.get('/', ...canRead, asyncHandler(c.listBrands));
brandsRouter.post('/', ...canWrite, validate({ body: brandBodySchema }), asyncHandler(c.createBrand));
brandsRouter.patch('/:id', ...canWrite, validate({ body: brandBodySchema.partial() }), asyncHandler(c.updateBrand));
brandsRouter.delete('/:id', ...canWrite, asyncHandler(c.deleteBrand));

// ── /medicines ───────────────────────────────────────────────────────
export const medicinesRouter = Router();
medicinesRouter.get('/', ...canRead, validate({ query: medicineListQuerySchema }), asyncHandler(c.listMedicines));
medicinesRouter.get('/barcode/:code', ...canRead, asyncHandler(c.getByBarcode));
medicinesRouter.get('/:id', ...canRead, asyncHandler(c.getMedicine));
medicinesRouter.post('/', ...canWrite, validate({ body: medicineBodySchema }), asyncHandler(c.createMedicine));
medicinesRouter.patch('/:id', ...canWrite, validate({ body: medicineUpdateSchema }), asyncHandler(c.updateMedicine));
medicinesRouter.delete('/:id', ...canWrite, requireRoles('ADMINS'), asyncHandler(c.deleteMedicine));

// ── /batches ─────────────────────────────────────────────────────────
export const batchesRouter = Router();
batchesRouter.get('/', ...canRead, validate({ query: batchListQuerySchema }), asyncHandler(c.listBatches));
batchesRouter.post('/', ...canWrite, validate({ body: batchBodySchema }), asyncHandler(c.createBatch));

// ── /stock ───────────────────────────────────────────────────────────
export const stockRouter = Router();
stockRouter.get('/alerts', ...canRead, asyncHandler(c.alerts));
stockRouter.get('/ledger', ...canWrite, validate({ query: ledgerQuerySchema }), asyncHandler(c.ledger));
stockRouter.get('/adjustments', ...canWrite, validate({ query: ledgerQuerySchema }), asyncHandler(c.listAdjustments));
stockRouter.post('/adjustments', ...canWrite, validate({ body: stockAdjustmentSchema }), asyncHandler(c.adjustStock));
