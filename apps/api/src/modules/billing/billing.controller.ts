import type { Request, Response } from 'express';
import { ok } from '../../shared/types/api';
import { requirePharmacyId } from '../../shared/utils/context';
import { toPageMeta } from '../../shared/utils/pagination';
import { billingService } from './billing.service';
import type { SaleListQuery } from './billing.validators';

export const billingController = {
  async createSale(req: Request, res: Response) {
    const sale = await billingService.createSale(requirePharmacyId(req), req.user!.id, req.body);
    res.status(201).json(ok(sale));
  },

  async listSales(req: Request, res: Response) {
    const q = req.query as unknown as SaleListQuery;
    const { rows, total } = await billingService.listSales(requirePharmacyId(req), q);
    res.json(ok(rows, toPageMeta(q, total)));
  },

  async getSale(req: Request, res: Response) {
    res.json(ok(await billingService.getSale(requirePharmacyId(req), req.params.id!)));
  },

  async collectPayment(req: Request, res: Response) {
    res.status(201).json(
      ok(await billingService.collectPayment(requirePharmacyId(req), req.user!.id, req.params.id!, req.body)),
    );
  },

  async createReturn(req: Request, res: Response) {
    res.status(201).json(
      ok(await billingService.createReturn(requirePharmacyId(req), req.user!.id, req.params.id!, req.body)),
    );
  },

  async listReturns(req: Request, res: Response) {
    const q = req.query as unknown as SaleListQuery;
    const { rows, total } = await billingService.listReturns(requirePharmacyId(req), q);
    res.json(ok(rows, toPageMeta(q, total)));
  },

  async whatsapp(req: Request, res: Response) {
    res.json(ok(await billingService.whatsappLink(requirePharmacyId(req), req.params.id!)));
  },
};
