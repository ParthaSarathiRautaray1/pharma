import type { Request, Response } from 'express';
import { ok } from '../../shared/types/api';
import { requirePharmacyId } from '../../shared/utils/context';
import { toPageMeta } from '../../shared/utils/pagination';
import { customerService } from './customer.service';
import type { CustomerListQuery } from './customer.validators';

export const customerController = {
  async list(req: Request, res: Response) {
    const q = req.query as unknown as CustomerListQuery;
    const { rows, total } = await customerService.list(requirePharmacyId(req), q);
    res.json(ok(rows, toPageMeta(q, total)));
  },

  async create(req: Request, res: Response) {
    res.status(201).json(ok(await customerService.create(requirePharmacyId(req), req.user!.id, req.body)));
  },

  async get(req: Request, res: Response) {
    res.json(ok(await customerService.get(requirePharmacyId(req), req.params.id!)));
  },

  async update(req: Request, res: Response) {
    res.json(ok(await customerService.update(requirePharmacyId(req), req.user!.id, req.params.id!, req.body)));
  },

  async delete(req: Request, res: Response) {
    await customerService.delete(requirePharmacyId(req), req.user!.id, req.params.id!);
    res.json(ok({ deleted: true }));
  },

  async history(req: Request, res: Response) {
    const q = req.query as unknown as CustomerListQuery;
    const { rows, total } = await customerService.history(requirePharmacyId(req), req.params.id!, q);
    res.json(ok(rows, toPageMeta(q, total)));
  },

  async outstanding(req: Request, res: Response) {
    res.json(ok(await customerService.outstanding(requirePharmacyId(req), req.params.id!)));
  },

  async collectPayment(req: Request, res: Response) {
    res.status(201).json(
      ok(await customerService.collectPayment(requirePharmacyId(req), req.user!.id, req.params.id!, req.body)),
    );
  },

  async prescriptions(req: Request, res: Response) {
    res.json(ok(await customerService.prescriptions(requirePharmacyId(req), req.params.id!)));
  },

  async addPrescription(req: Request, res: Response) {
    res.status(201).json(ok(await customerService.addPrescription(requirePharmacyId(req), req.params.id!, req.body)));
  },

  async analytics(req: Request, res: Response) {
    res.json(ok(await customerService.analytics(requirePharmacyId(req))));
  },
};
