import type { Request, Response } from 'express';
import { ok } from '../../shared/types/api';
import { requirePharmacyId } from '../../shared/utils/context';
import { toPageMeta } from '../../shared/utils/pagination';
import { notificationService } from './notification.service';
import type { NotificationQuery } from './notification.validators';

export const notificationController = {
  async list(req: Request, res: Response) {
    const q = req.query as unknown as NotificationQuery;
    const [rows, total, unreadCount] = await notificationService.list(requirePharmacyId(req), req.user!.id, q);
    res.json(ok({ rows, unreadCount }, toPageMeta(q, total)));
  },

  async read(req: Request, res: Response) {
    await notificationService.read(requirePharmacyId(req), req.user!.id, req.params.id!);
    res.json(ok({ read: true }));
  },

  async readAll(req: Request, res: Response) {
    await notificationService.readAll(requirePharmacyId(req), req.user!.id);
    res.json(ok({ read: true }));
  },
};
