import type { Request, Response } from 'express';
import { ok } from '../../shared/types/api';
import { requirePharmacyId } from '../../shared/utils/context';
import { toPageMeta } from '../../shared/utils/pagination';
import { supplierService } from './supplier.service';
import type { SupplierListQuery } from './supplier.validators';

export const supplierController = {
  async list(req: Request, res: Response) {
    const q = req.query as unknown as SupplierListQuery;
    const { rows, total } = await supplierService.list(requirePharmacyId(req), q);
    res.json(ok(rows, toPageMeta(q, total)));
  },
  async create(req: Request, res: Response) {
    res.status(201).json(ok(await supplierService.create(requirePharmacyId(req), req.user!.id, req.body)));
  },
  async get(req: Request, res: Response) {
    res.json(ok(await supplierService.get(requirePharmacyId(req), req.params.id!)));
  },
  async update(req: Request, res: Response) {
    res.json(ok(await supplierService.update(requirePharmacyId(req), req.user!.id, req.params.id!, req.body)));
  },
  async delete(req: Request, res: Response) {
    await supplierService.delete(requirePharmacyId(req), req.user!.id, req.params.id!);
    res.json(ok({ deleted: true }));
  },
  async outstanding(req: Request, res: Response) {
    res.json(ok(await supplierService.outstanding(requirePharmacyId(req), req.params.id!)));
  },
  async reports(req: Request, res: Response) {
    res.json(ok(await supplierService.reports(requirePharmacyId(req))));
  },
};
