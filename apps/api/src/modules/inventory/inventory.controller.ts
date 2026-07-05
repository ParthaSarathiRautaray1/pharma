import type { Request, Response } from 'express';
import { ok } from '../../shared/types/api';
import { requirePharmacyId } from '../../shared/utils/context';
import { toPageMeta } from '../../shared/utils/pagination';
import { inventoryService } from './inventory.service';
import { stockService } from './stock.service';
import type { BatchListQuery, LedgerQuery, MedicineListQuery } from './inventory.validators';

export const inventoryController = {
  // ── Categories ─────────────────────────────────────────────────────
  async listCategories(req: Request, res: Response) {
    res.json(ok(await inventoryService.listCategories(requirePharmacyId(req))));
  },
  async createCategory(req: Request, res: Response) {
    res.status(201).json(ok(await inventoryService.createCategory(requirePharmacyId(req), req.body)));
  },
  async updateCategory(req: Request, res: Response) {
    res.json(ok(await inventoryService.updateCategory(requirePharmacyId(req), req.params.id!, req.body)));
  },
  async deleteCategory(req: Request, res: Response) {
    await inventoryService.deleteCategory(requirePharmacyId(req), req.params.id!);
    res.json(ok({ deleted: true }));
  },

  // ── Brands ─────────────────────────────────────────────────────────
  async listBrands(req: Request, res: Response) {
    res.json(ok(await inventoryService.listBrands(requirePharmacyId(req))));
  },
  async createBrand(req: Request, res: Response) {
    res.status(201).json(ok(await inventoryService.createBrand(requirePharmacyId(req), req.body)));
  },
  async updateBrand(req: Request, res: Response) {
    res.json(ok(await inventoryService.updateBrand(requirePharmacyId(req), req.params.id!, req.body)));
  },
  async deleteBrand(req: Request, res: Response) {
    await inventoryService.deleteBrand(requirePharmacyId(req), req.params.id!);
    res.json(ok({ deleted: true }));
  },

  // ── Medicines ──────────────────────────────────────────────────────
  async listMedicines(req: Request, res: Response) {
    const q = req.query as unknown as MedicineListQuery;
    const { rows, total } = await inventoryService.listMedicines(requirePharmacyId(req), q);
    res.json(ok(rows, toPageMeta(q, total)));
  },
  async getMedicine(req: Request, res: Response) {
    res.json(ok(await inventoryService.getMedicine(requirePharmacyId(req), req.params.id!)));
  },
  async getByBarcode(req: Request, res: Response) {
    res.json(ok(await inventoryService.getByBarcode(requirePharmacyId(req), req.params.code!)));
  },
  async createMedicine(req: Request, res: Response) {
    const medicine = await inventoryService.createMedicine(requirePharmacyId(req), req.user!.id, req.body);
    res.status(201).json(ok(medicine));
  },
  async updateMedicine(req: Request, res: Response) {
    res.json(ok(await inventoryService.updateMedicine(requirePharmacyId(req), req.user!.id, req.params.id!, req.body)));
  },
  async deleteMedicine(req: Request, res: Response) {
    await inventoryService.deleteMedicine(requirePharmacyId(req), req.user!.id, req.params.id!);
    res.json(ok({ deleted: true }));
  },

  // ── Batches ────────────────────────────────────────────────────────
  async listBatches(req: Request, res: Response) {
    const q = req.query as unknown as BatchListQuery;
    const { rows, total } = await inventoryService.listBatches(requirePharmacyId(req), q);
    res.json(ok(rows, toPageMeta(q, total)));
  },
  async createBatch(req: Request, res: Response) {
    const batch = await inventoryService.createBatch(requirePharmacyId(req), req.user!.id, req.body);
    res.status(201).json(ok(batch));
  },

  // ── Stock ──────────────────────────────────────────────────────────
  async adjustStock(req: Request, res: Response) {
    const result = await stockService.adjust(requirePharmacyId(req), req.user!.id, req.body);
    res.status(201).json(ok(result));
  },
  async listAdjustments(req: Request, res: Response) {
    const q = req.query as unknown as LedgerQuery;
    const [rows, total] = await stockService.listAdjustments(
      requirePharmacyId(req),
      (q.page - 1) * q.pageSize,
      q.pageSize,
    );
    res.json(ok(rows, toPageMeta(q, total)));
  },
  async ledger(req: Request, res: Response) {
    const q = req.query as unknown as LedgerQuery;
    const [rows, total] = await stockService.ledger(
      requirePharmacyId(req),
      { medicineId: q.medicineId, batchId: q.batchId },
      (q.page - 1) * q.pageSize,
      q.pageSize,
    );
    res.json(ok(rows, toPageMeta(q, total)));
  },
  async alerts(req: Request, res: Response) {
    res.json(ok(await stockService.alerts(requirePharmacyId(req))));
  },
};
