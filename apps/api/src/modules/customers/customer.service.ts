import { Prisma, type PaymentMethod, type PaymentStatus } from '@prisma/client';
import { prisma } from '../../config/prisma';
import { AppError } from '../../shared/errors/app-error';
import type {
  CustomerBody,
  CustomerListQuery,
  CustomerPaymentInput,
  PrescriptionInput,
} from './customer.validators';

type Tx = Prisma.TransactionClient;

function D(value: Prisma.Decimal.Value) {
  return new Prisma.Decimal(value);
}

function paymentStatus(grandTotal: Prisma.Decimal, paidAmount: Prisma.Decimal): PaymentStatus {
  if (paidAmount.gte(grandTotal)) return 'PAID';
  if (paidAmount.gt(0)) return 'PARTIAL';
  return 'UNPAID';
}

async function ensureCustomer(client: Tx | typeof prisma, pharmacyId: string, id: string) {
  const customer = await client.customer.findFirst({ where: { id, pharmacyId } });
  if (!customer) throw AppError.notFound('Customer');
  return customer;
}

export const customerService = {
  async list(pharmacyId: string, q: CustomerListQuery) {
    const where: Prisma.CustomerWhereInput = {
      pharmacyId,
      ...(q.isActive === undefined ? {} : { isActive: q.isActive }),
      ...(q.search
        ? {
            OR: [
              { name: { contains: q.search, mode: 'insensitive' } },
              { phone: { contains: q.search, mode: 'insensitive' } },
              { email: { contains: q.search, mode: 'insensitive' } },
            ],
          }
        : {}),
    };

    const [rows, total] = await prisma.$transaction([
      prisma.customer.findMany({
        where,
        include: { _count: { select: { sales: true, prescriptions: true } } },
        orderBy: { name: 'asc' },
        skip: (q.page - 1) * q.pageSize,
        take: q.pageSize,
      }),
      prisma.customer.count({ where }),
    ]);
    return { rows: await withOutstanding(rows), total };
  },

  async get(pharmacyId: string, id: string) {
    const customer = await prisma.customer.findFirst({
      where: { id, pharmacyId },
      include: { _count: { select: { sales: true, prescriptions: true } } },
    });
    if (!customer) throw AppError.notFound('Customer');
    const [withBalance] = await withOutstanding([customer]);
    return withBalance;
  },

  async create(pharmacyId: string, userId: string, data: CustomerBody) {
    const customer = await prisma.customer.create({ data: { ...data, pharmacyId } });
    await audit(pharmacyId, userId, 'customer.create', customer.id, null, customer);
    return customer;
  },

  async update(pharmacyId: string, userId: string, id: string, data: Partial<CustomerBody>) {
    const before = await ensureCustomer(prisma, pharmacyId, id);
    const customer = await prisma.customer.update({ where: { id }, data });
    await audit(pharmacyId, userId, 'customer.update', id, before, customer);
    return customer;
  },

  async delete(pharmacyId: string, userId: string, id: string) {
    const before = await ensureCustomer(prisma, pharmacyId, id);
    const customer = await prisma.customer.update({ where: { id }, data: { isActive: false } });
    await audit(pharmacyId, userId, 'customer.delete', id, before, customer);
    return customer;
  },

  async history(pharmacyId: string, customerId: string, q: CustomerListQuery) {
    await ensureCustomer(prisma, pharmacyId, customerId);
    const where: Prisma.SaleWhereInput = { pharmacyId, customerId };
    const [rows, total] = await prisma.$transaction([
      prisma.sale.findMany({
        where,
        include: {
          cashier: { select: { name: true } },
          items: {
            include: {
              medicine: { select: { name: true, unit: true } },
              batch: { select: { batchNumber: true } },
            },
          },
          payments: { orderBy: { receivedAt: 'asc' } },
        },
        orderBy: { saleDate: 'desc' },
        skip: (q.page - 1) * q.pageSize,
        take: q.pageSize,
      }),
      prisma.sale.count({ where }),
    ]);
    return { rows, total };
  },

  async outstanding(pharmacyId: string, customerId: string) {
    await ensureCustomer(prisma, pharmacyId, customerId);
    const sales = await prisma.sale.findMany({
      where: { pharmacyId, customerId, paymentStatus: { not: 'PAID' } },
      orderBy: { saleDate: 'asc' },
      select: {
        id: true,
        invoiceNumber: true,
        saleDate: true,
        grandTotal: true,
        paidAmount: true,
        paymentStatus: true,
      },
    });
    const totalOutstanding = sales.reduce(
      (sum, sale) => sum.add(sale.grandTotal.sub(sale.paidAmount)),
      new Prisma.Decimal(0),
    );
    return { totalOutstanding, sales };
  },

  async collectPayment(pharmacyId: string, userId: string, customerId: string, input: CustomerPaymentInput) {
    return prisma.$transaction(async (tx) => {
      await ensureCustomer(tx, pharmacyId, customerId);
      let remaining = D(input.amount);
      if (remaining.lte(0)) throw AppError.badRequest('Payment amount must be greater than zero');

      const sales = await tx.sale.findMany({
        where: { pharmacyId, customerId, paymentStatus: { not: 'PAID' } },
        orderBy: { saleDate: 'asc' },
      });

      const totalOutstanding = sales.reduce(
        (sum, sale) => sum.add(sale.grandTotal.sub(sale.paidAmount)),
        new Prisma.Decimal(0),
      );
      if (remaining.gt(totalOutstanding)) throw AppError.badRequest('Payment exceeds customer outstanding balance');

      for (const sale of sales) {
        if (remaining.lte(0)) break;
        const due = sale.grandTotal.sub(sale.paidAmount);
        if (due.lte(0)) continue;
        const applied = Prisma.Decimal.min(due, remaining);
        const paidAmount = sale.paidAmount.add(applied);

        await tx.payment.create({
          data: {
            saleId: sale.id,
            customerId,
            receivedById: userId,
            amount: applied,
            method: input.method as PaymentMethod,
            reference: input.reference,
          },
        });
        await tx.sale.update({
          where: { id: sale.id },
          data: { paidAmount, paymentStatus: paymentStatus(sale.grandTotal, paidAmount) },
        });
        remaining = remaining.sub(applied);
      }

      await tx.auditLog.create({
        data: {
          pharmacyId,
          userId,
          action: 'customer.payment',
          entityType: 'customer',
          entityId: customerId,
          after: { amount: input.amount, method: input.method },
        },
      });

      return this.outstanding(pharmacyId, customerId);
    });
  },

  async prescriptions(pharmacyId: string, customerId: string) {
    await ensureCustomer(prisma, pharmacyId, customerId);
    return prisma.prescription.findMany({
      where: { customerId, customer: { pharmacyId } },
      include: { sale: { select: { invoiceNumber: true } } },
      orderBy: { createdAt: 'desc' },
    });
  },

  async addPrescription(pharmacyId: string, customerId: string, input: PrescriptionInput) {
    await ensureCustomer(prisma, pharmacyId, customerId);
    if (input.saleId) {
      const sale = await prisma.sale.findFirst({
        where: { id: input.saleId, pharmacyId, customerId },
        select: { id: true },
      });
      if (!sale) throw AppError.notFound('Sale');
    }
    return prisma.prescription.create({
      data: {
        customerId,
        saleId: input.saleId,
        fileUrl: input.fileUrl,
        note: input.note,
      },
    });
  },

  async analytics(pharmacyId: string) {
    const [total, active, outstandingRows, topCustomers] = await Promise.all([
      prisma.customer.count({ where: { pharmacyId } }),
      prisma.customer.count({ where: { pharmacyId, isActive: true } }),
      prisma.$queryRaw<{ amount: Prisma.Decimal | null; count: bigint }[]>`
        SELECT COALESCE(SUM(s."grandTotal" - s."paidAmount"), 0) AS amount,
               COUNT(DISTINCT s."customerId")::bigint AS count
        FROM "Sale" s
        WHERE s."pharmacyId" = ${pharmacyId}::uuid
          AND s."customerId" IS NOT NULL
          AND s."paymentStatus" <> 'PAID'`,
      prisma.$queryRaw<{ id: string; name: string; phone: string; total: Prisma.Decimal; invoices: bigint }[]>`
        SELECT c.id, c.name, c.phone,
               COALESCE(SUM(s."grandTotal"), 0) AS total,
               COUNT(s.id)::bigint AS invoices
        FROM "Customer" c
        JOIN "Sale" s ON s."customerId" = c.id
        WHERE c."pharmacyId" = ${pharmacyId}::uuid
        GROUP BY c.id, c.name, c.phone
        ORDER BY total DESC
        LIMIT 5`,
    ]);

    return {
      total,
      active,
      outstandingAmount: outstandingRows[0]?.amount ?? new Prisma.Decimal(0),
      customersWithDue: Number(outstandingRows[0]?.count ?? 0),
      topCustomers: topCustomers.map((row) => ({
        ...row,
        invoices: Number(row.invoices),
      })),
    };
  },
};

async function withOutstanding<T extends { id: string }>(customers: T[]) {
  if (customers.length === 0) return [] as (T & { outstanding: Prisma.Decimal })[];
  const rows = await prisma.sale.groupBy({
    by: ['customerId'],
    where: { customerId: { in: customers.map((c) => c.id) }, paymentStatus: { not: 'PAID' } },
    _sum: { grandTotal: true, paidAmount: true },
  });
  const map = new Map(
    rows.map((row) => [
      row.customerId,
      (row._sum.grandTotal ?? new Prisma.Decimal(0)).sub(row._sum.paidAmount ?? new Prisma.Decimal(0)),
    ]),
  );
  return customers.map((customer) => ({ ...customer, outstanding: map.get(customer.id) ?? new Prisma.Decimal(0) }));
}

async function audit(
  pharmacyId: string,
  userId: string,
  action: string,
  entityId: string,
  before: unknown,
  after: unknown,
) {
  await prisma.auditLog.create({
    data: {
      pharmacyId,
      userId,
      action,
      entityType: 'customer',
      entityId,
      before: before as Prisma.InputJsonValue,
      after: after as Prisma.InputJsonValue,
    },
  });
}
