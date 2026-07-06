import { Prisma, type PaymentMethod, type PaymentStatus } from '@prisma/client';
import { startOfDay } from 'date-fns';
import { prisma } from '../../config/prisma';
import { AppError } from '../../shared/errors/app-error';
import { recordStockMovement } from '../inventory/stock.service';
import type {
  CreatePurchaseInput,
  PurchaseListQuery,
  PurchasePaymentInput,
  PurchaseUpdateInput,
} from './purchase.validators';

type Tx = Prisma.TransactionClient;

function D(value: Prisma.Decimal.Value) {
  return new Prisma.Decimal(value);
}

function paymentStatus(grandTotal: Prisma.Decimal, paidAmount: Prisma.Decimal): PaymentStatus {
  if (paidAmount.gte(grandTotal)) return 'PAID';
  if (paidAmount.gt(0)) return 'PARTIAL';
  return 'UNPAID';
}

async function nextPurchaseNumber(tx: Tx, pharmacyId: string) {
  const year = new Date().getFullYear();
  const key = `purchase:${year}`;
  const counter = await tx.counter.upsert({
    where: { pharmacyId_key: { pharmacyId, key } },
    create: { pharmacyId, key, value: 1 },
    update: { value: { increment: 1 } },
  });
  return `PO-${year}-${String(counter.value).padStart(5, '0')}`;
}

export const purchaseService = {
  async create(pharmacyId: string, userId: string, input: CreatePurchaseInput) {
    return prisma.$transaction(async (tx) => {
      const supplier = await tx.supplier.findFirst({ where: { id: input.supplierId, pharmacyId, isActive: true } });
      if (!supplier) throw AppError.notFound('Supplier');

      const medicineIds = input.items.map((item) => item.medicineId);
      const medicines = await tx.medicine.findMany({
        where: { id: { in: medicineIds }, pharmacyId, isActive: true },
        select: { id: true },
      });
      if (medicines.length !== new Set(medicineIds).size) throw AppError.notFound('Medicine');

      let subtotal = new Prisma.Decimal(0);
      let taxAmount = new Prisma.Decimal(0);
      const lineItems = input.items.map((item) => {
        const base = D(item.purchasePrice).mul(item.quantity);
        const tax = base.mul(item.gstRate).div(100).toDecimalPlaces(2);
        subtotal = subtotal.add(base);
        taxAmount = taxAmount.add(tax);
        return { item, tax, total: base.add(tax).toDecimalPlaces(2) };
      });
      const discountAmount = D(input.discountAmount ?? 0);
      if (discountAmount.gt(subtotal.add(taxAmount))) throw AppError.badRequest('Discount exceeds purchase total');
      const grandTotal = subtotal.add(taxAmount).sub(discountAmount).toDecimalPlaces(2);
      const paidAmount = D(input.paidAmount ?? 0).toDecimalPlaces(2);
      if (paidAmount.gt(grandTotal)) throw AppError.badRequest('Paid amount cannot exceed purchase total');

      const purchase = await tx.purchase.create({
        data: {
          pharmacyId,
          supplierId: input.supplierId,
          createdById: userId,
          purchaseNumber: await nextPurchaseNumber(tx, pharmacyId),
          supplierInvoiceNo: input.supplierInvoiceNo,
          orderDate: input.orderDate,
          subtotal,
          discountAmount,
          taxAmount,
          grandTotal,
          paidAmount,
          paymentStatus: paymentStatus(grandTotal, paidAmount),
          invoiceFileUrl: input.invoiceFileUrl,
          notes: input.notes,
        },
      });

      for (const line of lineItems) {
        await tx.purchaseItem.create({
          data: {
            purchaseId: purchase.id,
            medicineId: line.item.medicineId,
            batchNumber: line.item.batchNumber,
            mfgDate: line.item.mfgDate,
            expiryDate: line.item.expiryDate,
            quantity: line.item.quantity,
            freeQuantity: line.item.freeQuantity,
            purchasePrice: D(line.item.purchasePrice),
            sellingPrice: D(line.item.sellingPrice),
            mrp: D(line.item.mrp),
            gstRate: D(line.item.gstRate),
            taxAmount: line.tax,
            total: line.total,
          },
        });
      }

      if (paidAmount.gt(0)) {
        await tx.payment.create({
          data: {
            purchaseId: purchase.id,
            receivedById: userId,
            amount: paidAmount,
            method: (input.paymentMethod ?? 'UPI') as PaymentMethod,
            reference: input.paymentReference,
          },
        });
      }

      await tx.auditLog.create({
        data: {
          pharmacyId,
          userId,
          action: 'purchase.create',
          entityType: 'purchase',
          entityId: purchase.id,
          after: { purchaseNumber: purchase.purchaseNumber, grandTotal },
        },
      });

      return this.getWithTx(tx, pharmacyId, purchase.id);
    });
  },

  async list(pharmacyId: string, q: PurchaseListQuery) {
    const where: Prisma.PurchaseWhereInput = {
      pharmacyId,
      ...(q.supplierId ? { supplierId: q.supplierId } : {}),
      ...(q.status ? { status: q.status } : {}),
      ...(q.paymentStatus ? { paymentStatus: q.paymentStatus } : {}),
      ...(q.from || q.to
        ? { orderDate: { ...(q.from ? { gte: startOfDay(q.from) } : {}), ...(q.to ? { lte: q.to } : {}) } }
        : {}),
    };
    const [rows, total] = await prisma.$transaction([
      prisma.purchase.findMany({
        where,
        include: { supplier: { select: { name: true, phone: true } }, createdBy: { select: { name: true } }, _count: { select: { items: true } } },
        orderBy: { orderDate: 'desc' },
        skip: (q.page - 1) * q.pageSize,
        take: q.pageSize,
      }),
      prisma.purchase.count({ where }),
    ]);
    return { rows, total };
  },

  get(pharmacyId: string, id: string) {
    return this.getWithTx(prisma, pharmacyId, id);
  },

  async update(pharmacyId: string, userId: string, id: string, input: PurchaseUpdateInput) {
    const before = await prisma.purchase.findFirst({ where: { id, pharmacyId } });
    if (!before) throw AppError.notFound('Purchase');
    if (before.status !== 'ORDERED' && input.status) throw AppError.businessRule('Only ordered purchases can be cancelled');
    const purchase = await prisma.purchase.update({ where: { id }, data: input });
    await prisma.auditLog.create({
      data: { pharmacyId, userId, action: 'purchase.update', entityType: 'purchase', entityId: id, before, after: purchase },
    });
    return this.get(pharmacyId, id);
  },

  async receive(pharmacyId: string, userId: string, id: string) {
    return prisma.$transaction(async (tx) => {
      const purchase = await tx.purchase.findFirst({
        where: { id, pharmacyId },
        include: { items: true },
      });
      if (!purchase) throw AppError.notFound('Purchase');
      if (purchase.status !== 'ORDERED') throw AppError.businessRule('Only ordered purchases can be received');

      for (const item of purchase.items) {
        let batch = await tx.batch.findFirst({
          where: { medicineId: item.medicineId, batchNumber: item.batchNumber },
        });
        if (!batch) {
          batch = await tx.batch.create({
            data: {
              medicineId: item.medicineId,
              batchNumber: item.batchNumber,
              mfgDate: item.mfgDate,
              expiryDate: item.expiryDate,
              purchasePrice: item.purchasePrice,
              sellingPrice: item.sellingPrice,
              mrp: item.mrp,
              quantity: 0,
            },
          });
        }
        const quantity = item.quantity + item.freeQuantity;
        await recordStockMovement(tx, {
          pharmacyId,
          batchId: batch.id,
          medicineId: item.medicineId,
          type: 'PURCHASE',
          quantityChange: quantity,
          refType: 'purchase',
          refId: purchase.id,
          note: purchase.purchaseNumber,
        });
        await tx.purchaseItem.update({ where: { id: item.id }, data: { batchId: batch.id } });
      }

      await tx.purchase.update({
        where: { id },
        data: { status: 'RECEIVED', receivedDate: new Date() },
      });
      await tx.auditLog.create({
        data: { pharmacyId, userId, action: 'purchase.receive', entityType: 'purchase', entityId: id, after: { received: true } },
      });
      return this.getWithTx(tx, pharmacyId, id);
    });
  },

  async collectPayment(pharmacyId: string, userId: string, id: string, input: PurchasePaymentInput) {
    return prisma.$transaction(async (tx) => {
      const purchase = await tx.purchase.findFirst({ where: { id, pharmacyId } });
      if (!purchase) throw AppError.notFound('Purchase');
      const paidAmount = purchase.paidAmount.add(D(input.amount)).toDecimalPlaces(2);
      if (paidAmount.gt(purchase.grandTotal)) throw AppError.badRequest('Payment exceeds outstanding balance');
      await tx.payment.create({
        data: {
          purchaseId: id,
          receivedById: userId,
          amount: D(input.amount),
          method: input.method as PaymentMethod,
          reference: input.reference,
        },
      });
      await tx.purchase.update({
        where: { id },
        data: { paidAmount, paymentStatus: paymentStatus(purchase.grandTotal, paidAmount) },
      });
      await tx.auditLog.create({
        data: { pharmacyId, userId, action: 'purchase.payment', entityType: 'purchase', entityId: id, after: { paidAmount } },
      });
      return this.getWithTx(tx, pharmacyId, id);
    });
  },

  async invoiceFile(pharmacyId: string, id: string, invoiceFileUrl: string) {
    const purchase = await prisma.purchase.findFirst({ where: { id, pharmacyId } });
    if (!purchase) throw AppError.notFound('Purchase');
    return prisma.purchase.update({ where: { id }, data: { invoiceFileUrl } });
  },

  async getWithTx(client: Tx | typeof prisma, pharmacyId: string, id: string) {
    const purchase = await client.purchase.findFirst({
      where: { id, pharmacyId },
      include: {
        supplier: { select: { id: true, name: true, phone: true, gstin: true } },
        createdBy: { select: { name: true } },
        items: { include: { medicine: { select: { id: true, name: true, unit: true } }, batch: { select: { id: true, batchNumber: true } } } },
        payments: { orderBy: { receivedAt: 'asc' } },
      },
    });
    if (!purchase) throw AppError.notFound('Purchase');
    return purchase;
  },
};
