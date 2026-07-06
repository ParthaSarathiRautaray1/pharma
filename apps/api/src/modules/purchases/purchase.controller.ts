import type { Request, Response } from 'express';
import { ok } from '../../shared/types/api';
import { requirePharmacyId } from '../../shared/utils/context';
import { toPageMeta } from '../../shared/utils/pagination';
import { purchaseService } from './purchase.service';
import type { PurchaseListQuery } from './purchase.validators';

export const purchaseController = {
  async create(req: Request, res: Response) {
    res.status(201).json(ok(await purchaseService.create(requirePharmacyId(req), req.user!.id, req.body)));
  },
  async list(req: Request, res: Response) {
    const q = req.query as unknown as PurchaseListQuery;
    const { rows, total } = await purchaseService.list(requirePharmacyId(req), q);
    res.json(ok(rows, toPageMeta(q, total)));
  },
  async get(req: Request, res: Response) {
    res.json(ok(await purchaseService.get(requirePharmacyId(req), req.params.id!)));
  },
  async update(req: Request, res: Response) {
    res.json(ok(await purchaseService.update(requirePharmacyId(req), req.user!.id, req.params.id!, req.body)));
  },
  async receive(req: Request, res: Response) {
    res.status(201).json(ok(await purchaseService.receive(requirePharmacyId(req), req.user!.id, req.params.id!)));
  },
  async collectPayment(req: Request, res: Response) {
    res.status(201).json(ok(await purchaseService.collectPayment(requirePharmacyId(req), req.user!.id, req.params.id!, req.body)));
  },
  async invoiceFile(req: Request, res: Response) {
    res.json(ok(await purchaseService.invoiceFile(requirePharmacyId(req), req.params.id!, req.body.invoiceFileUrl)));
  },
};
