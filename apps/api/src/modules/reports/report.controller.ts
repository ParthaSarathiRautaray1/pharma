import type { Request, Response } from 'express';
import { ok } from '../../shared/types/api';
import { requirePharmacyId } from '../../shared/utils/context';
import { reportService } from './report.service';
import type { ReportQuery } from './report.validators';

export const reportController = {
  async run(req: Request, res: Response) {
    const pharmacyId = requirePharmacyId(req);
    const q = req.query as unknown as ReportQuery;
    const kind = req.params.kind!;
    const data =
      kind === 'sales' ? await reportService.sales(pharmacyId, q)
      : kind === 'purchases' ? await reportService.purchases(pharmacyId, q)
      : kind === 'stock' ? await reportService.stock(pharmacyId)
      : kind === 'profit' ? await reportService.profit(pharmacyId, q)
      : kind === 'gst' ? await reportService.gst(pharmacyId, q)
      : kind === 'expiry' ? await reportService.expiry(pharmacyId, q)
      : kind === 'customers' ? await reportService.customers(pharmacyId)
      : kind === 'suppliers' ? await reportService.suppliers(pharmacyId)
      : null;

    if (!data) {
      res.status(404).json({ success: false, error: { code: 'NOT_FOUND', message: 'Report not found' } });
      return;
    }
    res.json(ok({ kind, format: q.format, data }));
  },
};
