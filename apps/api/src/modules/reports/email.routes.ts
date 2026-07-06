import { Router } from 'express';
import { z } from 'zod';
import { requireAuth, requireRoles } from '../../middleware/auth';
import { validate } from '../../middleware/validate';
import { asyncHandler } from '../../shared/utils/async-handler';
import { sendMail } from '../../config/mail';
import { prisma } from '../../config/prisma';
import { ok } from '../../shared/types/api';
import { requirePharmacyId } from '../../shared/utils/context';
import { reportService } from './report.service';
import { reportQuerySchema } from './report.validators';

export const emailRouter = Router();

const body = z.object({ to: z.string().email() });
emailRouter.use(requireAuth, requireRoles('CLINICAL'));

emailRouter.post('/invoice/:saleId', validate({ body }), asyncHandler(async (req, res) => {
  const sale = await prisma.sale.findFirst({ where: { id: req.params.saleId!, pharmacyId: requirePharmacyId(req) }, include: { customer: true } });
  if (!sale) {
    res.status(404).json({ success: false, error: { code: 'NOT_FOUND', message: 'Sale not found' } });
    return;
  }
  await sendMail({
    to: req.body.to,
    subject: `Invoice ${sale.invoiceNumber}`,
    html: `<p>Invoice ${sale.invoiceNumber}</p><p>Total: Rs ${sale.grandTotal}</p><p>Paid: Rs ${sale.paidAmount}</p>`,
  });
  res.json(ok({ sent: true }));
}));

emailRouter.post('/report', validate({ body: body.merge(reportQuerySchema).extend({ kind: z.string() }) }), asyncHandler(async (req, res) => {
  const pharmacyId = requirePharmacyId(req);
  const data = req.body.kind === 'sales' ? await reportService.sales(pharmacyId, req.body) : await reportService.purchases(pharmacyId, req.body);
  await sendMail({
    to: req.body.to,
    subject: `${req.body.kind} report`,
    html: `<pre>${JSON.stringify(data, null, 2)}</pre>`,
  });
  res.json(ok({ sent: true }));
}));

emailRouter.post('/purchase-order/:purchaseId', validate({ body }), asyncHandler(async (req, res) => {
  const purchase = await prisma.purchase.findFirst({ where: { id: req.params.purchaseId!, pharmacyId: requirePharmacyId(req) }, include: { supplier: true } });
  if (!purchase) {
    res.status(404).json({ success: false, error: { code: 'NOT_FOUND', message: 'Purchase not found' } });
    return;
  }
  await sendMail({
    to: req.body.to,
    subject: `Purchase order ${purchase.purchaseNumber}`,
    html: `<p>Purchase order ${purchase.purchaseNumber}</p><p>Supplier: ${purchase.supplier.name}</p><p>Total: Rs ${purchase.grandTotal}</p>`,
  });
  res.json(ok({ sent: true }));
}));
