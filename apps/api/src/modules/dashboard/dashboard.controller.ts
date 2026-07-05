import type { Request, Response } from 'express';
import { ok } from '../../shared/types/api';
import { requirePharmacyId } from '../../shared/utils/context';
import { dashboardService } from './dashboard.service';

const RANGE_DAYS: Record<string, number> = { '7d': 7, '30d': 30, '90d': 90 };

export const dashboardController = {
  async summary(req: Request, res: Response) {
    const pharmacyId = requirePharmacyId(req);
    res.json(ok(await dashboardService.summary(pharmacyId)));
  },

  async revenue(req: Request, res: Response) {
    const pharmacyId = requirePharmacyId(req);
    const { range } = req.query as { range: string };
    res.json(ok(await dashboardService.revenueSeries(pharmacyId, RANGE_DAYS[range] ?? 30)));
  },

  async salesPurchases(req: Request, res: Response) {
    const pharmacyId = requirePharmacyId(req);
    const { months } = req.query as unknown as { months: number };
    res.json(ok(await dashboardService.salesVsPurchases(pharmacyId, months)));
  },

  async topMedicines(req: Request, res: Response) {
    const pharmacyId = requirePharmacyId(req);
    const { limit } = req.query as unknown as { limit: number };
    res.json(ok(await dashboardService.topMedicines(pharmacyId, limit)));
  },

  async customers(req: Request, res: Response) {
    const pharmacyId = requirePharmacyId(req);
    const { months } = req.query as unknown as { months: number };
    res.json(ok(await dashboardService.customerAnalytics(pharmacyId, months)));
  },
};
