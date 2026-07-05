import { Prisma, type DiscountType, type PaymentMethod, type PaymentStatus } from '@prisma/client';
import { startOfDay } from 'date-fns';
import { prisma } from '../../config/prisma';
import { AppError } from '../../shared/errors/app-error';
import { recordStockMovement } from '../inventory/stock.service';
import type {
  CollectPaymentInput,
  CreateReturnInput,
  CreateSaleInput,
  SaleListQuery,
} from './billing.validators';

type Tx = Prisma.TransactionClient;

const zero = new Prisma.Decimal(0);

function D(value: Prisma.Decimal.Value) {
  return new Prisma.Decimal(value);
}

function decimalSum(values: Prisma.Decimal[]) {
  return values.reduce((sum, value) => sum.add(value), zero);
}

function paymentStatus(grandTotal: Prisma.Decimal, paidAmount: Prisma.Decimal): PaymentStatus {
  if (paidAmount.gte(grandTotal)) return 'PAID';
  if (paidAmount.gt(0)) return 'PARTIAL';
  return 'UNPAID';
}

async function nextNumber(tx: Tx, pharmacyId: string, keyPrefix: 'invoice' | 'return', docPrefix: string) {
  const year = new Date().getFullYear();
  const key = `${keyPrefix}:${year}`;
  const counter = await tx.counter.upsert({
    where: { pharmacyId_key: { pharmacyId, key } },
    create: { pharmacyId, key, value: 1 },
    update: { value: { increment: 1 } },
  });
  return `${docPrefix}-${year}-${String(counter.value).padStart(5, '0')}`;
}

async function pharmacyInvoicePrefix(tx: Tx, pharmacyId: string) {
  const pharmacy = await tx.pharmacy.findUnique({
    where: { id: pharmacyId },
    select: { invoicePrefix: true },
  });
  return pharmacy?.invoicePrefix || 'INV';
}

export const billingService = {
  async createSale(pharmacyId: string, cashierId: string, input: CreateSaleInput) {
    return prisma.$transaction(async (tx) => {
      if (input.customerId) {
        const customer = await tx.customer.findFirst({
          where: { id: input.customerId, pharmacyId, isActive: true },
          select: { id: true },
        });
        if (!customer) throw AppError.notFound('Customer');
      }

      const now = new Date();
      const lines = [];

      for (const item of input.items) {
        const batch = await tx.batch.findFirst({
          where: {
            id: item.batchId,
            medicineId: item.medicineId,
            medicine: { pharmacyId, isActive: true },
          },
          include: { medicine: true },
        });
        if (!batch) throw AppError.notFound('Batch');
        if (batch.expiryDate <= now) throw AppError.expiredBatch(batch.medicine.name);
        if (batch.quantity < item.quantity) {
          throw AppError.insufficientStock(batch.medicine.name, batch.quantity);
        }

        const unitPrice = item.unitPrice === undefined ? batch.sellingPrice : D(item.unitPrice);
        const base = unitPrice.mul(item.quantity).toDecimalPlaces(2);
        lines.push({ item, batch, unitPrice, base });
      }

      const subtotal = decimalSum(lines.map((line) => line.base)).toDecimalPlaces(2);
      const discountValue = D(input.discountValue ?? 0);
      let discountAmount = zero;
      if (input.discountType === 'PERCENTAGE') {
        if (discountValue.gt(100)) throw AppError.badRequest('Discount percentage cannot exceed 100');
        discountAmount = subtotal.mul(discountValue).div(100).toDecimalPlaces(2);
      } else if (input.discountType === 'FLAT') {
        if (discountValue.gt(subtotal)) throw AppError.badRequest('Discount cannot exceed subtotal');
        discountAmount = discountValue.toDecimalPlaces(2);
      }

      const lineTotals = lines.map((line) => {
        const share = subtotal.gt(0) ? line.base.div(subtotal) : zero;
        const lineDiscount = discountAmount.mul(share).toDecimalPlaces(2);
        const taxable = line.base.sub(lineDiscount);
        const taxAmount = taxable.mul(line.batch.medicine.gstRate).div(100).toDecimalPlaces(2);
        return {
          ...line,
          discountAmount: lineDiscount,
          taxAmount,
          total: taxable.add(taxAmount).toDecimalPlaces(2),
        };
      });

      const taxAmount = decimalSum(lineTotals.map((line) => line.taxAmount)).toDecimalPlaces(2);
      const grandTotal = subtotal.sub(discountAmount).add(taxAmount).toDecimalPlaces(2);
      const paidAmount = decimalSum(input.payments.map((p) => D(p.amount))).toDecimalPlaces(2);
      if (paidAmount.gt(grandTotal)) throw AppError.badRequest('Paid amount cannot exceed invoice total');

      const invoiceNumber = await nextNumber(
        tx,
        pharmacyId,
        'invoice',
        await pharmacyInvoicePrefix(tx, pharmacyId),
      );

      const sale = await tx.sale.create({
        data: {
          pharmacyId,
          customerId: input.customerId,
          cashierId,
          invoiceNumber,
          subtotal,
          discountType: input.discountType as DiscountType | undefined,
          discountValue,
          discountAmount,
          taxAmount,
          roundOff: zero,
          grandTotal,
          paidAmount,
          paymentStatus: paymentStatus(grandTotal, paidAmount),
          notes: input.notes,
        },
      });

      for (const line of lineTotals) {
        await tx.saleItem.create({
          data: {
            saleId: sale.id,
            medicineId: line.item.medicineId,
            batchId: line.item.batchId,
            quantity: line.item.quantity,
            unitPrice: line.unitPrice,
            mrp: line.batch.mrp,
            costPrice: line.batch.purchasePrice,
            gstRate: line.batch.medicine.gstRate,
            discountAmount: line.discountAmount,
            taxAmount: line.taxAmount,
            total: line.total,
          },
        });

        await recordStockMovement(tx, {
          pharmacyId,
          batchId: line.item.batchId,
          medicineId: line.item.medicineId,
          type: 'SALE',
          quantityChange: -line.item.quantity,
          refType: 'sale',
          refId: sale.id,
          note: invoiceNumber,
        });
      }

      for (const payment of input.payments) {
        if (D(payment.amount).eq(0)) continue;
        await tx.payment.create({
          data: {
            saleId: sale.id,
            customerId: input.customerId,
            receivedById: cashierId,
            amount: D(payment.amount),
            method: payment.method,
            reference: payment.reference,
          },
        });
      }

      if (input.customerId) {
        await tx.customer.update({
          where: { id: input.customerId },
          data: { loyaltyPoints: { increment: grandTotal.div(100).floor().toNumber() } },
        });
      }

      await tx.auditLog.create({
        data: {
          pharmacyId,
          userId: cashierId,
          action: 'sale.create',
          entityType: 'sale',
          entityId: sale.id,
          after: { invoiceNumber, grandTotal, paidAmount },
        },
      });

      return this.getSaleWithTx(tx, pharmacyId, sale.id);
    });
  },

  async listSales(pharmacyId: string, q: SaleListQuery) {
    const where: Prisma.SaleWhereInput = {
      pharmacyId,
      ...(q.customerId ? { customerId: q.customerId } : {}),
      ...(q.cashierId ? { cashierId: q.cashierId } : {}),
      ...(q.paymentStatus ? { paymentStatus: q.paymentStatus } : {}),
      ...(q.from || q.to
        ? {
            saleDate: {
              ...(q.from ? { gte: startOfDay(q.from) } : {}),
              ...(q.to ? { lte: q.to } : {}),
            },
          }
        : {}),
    };
    const [rows, total] = await prisma.$transaction([
      prisma.sale.findMany({
        where,
        include: {
          customer: { select: { name: true, phone: true } },
          cashier: { select: { name: true } },
          _count: { select: { items: true } },
        },
        orderBy: { saleDate: 'desc' },
        skip: (q.page - 1) * q.pageSize,
        take: q.pageSize,
      }),
      prisma.sale.count({ where }),
    ]);
    return { rows, total };
  },

  getSale(pharmacyId: string, id: string) {
    return this.getSaleWithTx(prisma, pharmacyId, id);
  },

  async collectPayment(pharmacyId: string, userId: string, saleId: string, input: CollectPaymentInput) {
    return prisma.$transaction(async (tx) => {
      const sale = await tx.sale.findFirst({ where: { id: saleId, pharmacyId } });
      if (!sale) throw AppError.notFound('Sale');
      const newPayment = decimalSum(input.payments.map((p) => D(p.amount))).toDecimalPlaces(2);
      if (newPayment.lte(0)) throw AppError.badRequest('Payment amount must be greater than zero');
      const paidAmount = sale.paidAmount.add(newPayment).toDecimalPlaces(2);
      if (paidAmount.gt(sale.grandTotal)) throw AppError.badRequest('Payment exceeds outstanding balance');

      for (const payment of input.payments) {
        await tx.payment.create({
          data: {
            saleId,
            customerId: sale.customerId,
            receivedById: userId,
            amount: D(payment.amount),
            method: payment.method,
            reference: payment.reference,
          },
        });
      }

      await tx.sale.update({
        where: { id: saleId },
        data: { paidAmount, paymentStatus: paymentStatus(sale.grandTotal, paidAmount) },
      });

      await tx.auditLog.create({
        data: {
          pharmacyId,
          userId,
          action: 'sale.payment',
          entityType: 'sale',
          entityId: saleId,
          after: { paidAmount },
        },
      });

      return this.getSaleWithTx(tx, pharmacyId, saleId);
    });
  },

  async createReturn(pharmacyId: string, userId: string, saleId: string, input: CreateReturnInput) {
    return prisma.$transaction(async (tx) => {
      const sale = await tx.sale.findFirst({
        where: { id: saleId, pharmacyId },
        include: { items: true },
      });
      if (!sale) throw AppError.notFound('Sale');

      const saleItems = new Map(sale.items.map((item) => [item.id, item]));
      let refundAmount = zero;
      const returnLines = [];
      for (const item of input.items) {
        const saleItem = saleItems.get(item.saleItemId);
        if (!saleItem) throw AppError.notFound('Sale item');
        const returnable = saleItem.quantity - saleItem.returnedQuantity;
        if (item.quantity > returnable) {
          throw AppError.businessRule(`Only ${returnable} unit(s) can be returned for this item`);
        }
        const amount = saleItem.total.div(saleItem.quantity).mul(item.quantity).toDecimalPlaces(2);
        refundAmount = refundAmount.add(amount);
        returnLines.push({ saleItem, quantity: item.quantity, amount });
      }

      const returnNumber = await nextNumber(tx, pharmacyId, 'return', 'RET');
      const saleReturn = await tx.saleReturn.create({
        data: {
          pharmacyId,
          saleId,
          createdById: userId,
          returnNumber,
          reason: input.reason,
          refundAmount,
          refundMethod: input.refundMethod as PaymentMethod,
        },
      });

      for (const line of returnLines) {
        await tx.saleReturnItem.create({
          data: {
            saleReturnId: saleReturn.id,
            saleItemId: line.saleItem.id,
            quantity: line.quantity,
            amount: line.amount,
          },
        });
        await tx.saleItem.update({
          where: { id: line.saleItem.id },
          data: { returnedQuantity: { increment: line.quantity } },
        });
        await recordStockMovement(tx, {
          pharmacyId,
          batchId: line.saleItem.batchId,
          medicineId: line.saleItem.medicineId,
          type: 'SALE_RETURN',
          quantityChange: line.quantity,
          refType: 'sale_return',
          refId: saleReturn.id,
          note: returnNumber,
        });
      }

      const updatedItems = await tx.saleItem.findMany({ where: { saleId } });
      const allReturned = updatedItems.every((item) => item.returnedQuantity >= item.quantity);
      await tx.sale.update({
        where: { id: saleId },
        data: { status: allReturned ? 'RETURNED' : 'PARTIALLY_RETURNED' },
      });

      await tx.auditLog.create({
        data: {
          pharmacyId,
          userId,
          action: 'sale.return',
          entityType: 'sale_return',
          entityId: saleReturn.id,
          after: { saleId, returnNumber, refundAmount },
        },
      });

      return this.getSaleWithTx(tx, pharmacyId, saleId);
    });
  },

  async listReturns(pharmacyId: string, q: SaleListQuery) {
    const where: Prisma.SaleReturnWhereInput = {
      pharmacyId,
      ...(q.from || q.to
        ? {
            createdAt: {
              ...(q.from ? { gte: startOfDay(q.from) } : {}),
              ...(q.to ? { lte: q.to } : {}),
            },
          }
        : {}),
    };
    const [rows, total] = await prisma.$transaction([
      prisma.saleReturn.findMany({
        where,
        include: {
          sale: { select: { invoiceNumber: true } },
          createdBy: { select: { name: true } },
          _count: { select: { items: true } },
        },
        orderBy: { createdAt: 'desc' },
        skip: (q.page - 1) * q.pageSize,
        take: q.pageSize,
      }),
      prisma.saleReturn.count({ where }),
    ]);
    return { rows, total };
  },

  async whatsappLink(pharmacyId: string, id: string) {
    const sale = await this.getSale(pharmacyId, id);
    const text = encodeURIComponent(
      `Invoice ${sale.invoiceNumber}\nTotal: Rs ${sale.grandTotal}\nPaid: Rs ${sale.paidAmount}`,
    );
    return { url: `https://wa.me/?text=${text}` };
  },

  async getSaleWithTx(client: Tx | typeof prisma, pharmacyId: string, id: string) {
    const sale = await client.sale.findFirst({
      where: { id, pharmacyId },
      include: {
        customer: { select: { id: true, name: true, phone: true, email: true } },
        cashier: { select: { id: true, name: true } },
        items: {
          include: {
            medicine: { select: { id: true, name: true, unit: true } },
            batch: { select: { id: true, batchNumber: true, expiryDate: true } },
          },
          orderBy: { id: 'asc' },
        },
        payments: { orderBy: { receivedAt: 'asc' } },
        returns: {
          include: { items: true, createdBy: { select: { name: true } } },
          orderBy: { createdAt: 'desc' },
        },
      },
    });
    if (!sale) throw AppError.notFound('Sale');
    return sale;
  },
};
