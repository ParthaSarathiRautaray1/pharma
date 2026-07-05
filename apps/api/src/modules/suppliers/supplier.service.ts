import { Prisma } from '@prisma/client';
import { prisma } from '../../config/prisma';
import { AppError } from '../../shared/errors/app-error';
import type { SupplierBody, SupplierListQuery } from './supplier.validators';

async function withOutstanding<T extends { id: string }>(suppliers: T[]) {
  if (suppliers.length === 0) return [] as (T & { outstanding: Prisma.Decimal })[];
  const rows = await prisma.purchase.groupBy({
    by: ['supplierId'],
    where: { supplierId: { in: suppliers.map((s) => s.id) }, paymentStatus: { not: 'PAID' } },
    _sum: { grandTotal: true, paidAmount: true },
  });
  const map = new Map(
    rows.map((row) => [
      row.supplierId,
      (row._sum.grandTotal ?? new Prisma.Decimal(0)).sub(row._sum.paidAmount ?? new Prisma.Decimal(0)),
    ]),
  );
  return suppliers.map((supplier) => ({ ...supplier, outstanding: map.get(supplier.id) ?? new Prisma.Decimal(0) }));
}

export const supplierService = {
  async list(pharmacyId: string, q: SupplierListQuery) {
    const where: Prisma.SupplierWhereInput = {
      pharmacyId,
      ...(q.isActive === undefined ? {} : { isActive: q.isActive }),
      ...(q.search
        ? {
            OR: [
              { name: { contains: q.search, mode: 'insensitive' } },
              { phone: { contains: q.search, mode: 'insensitive' } },
              { contactPerson: { contains: q.search, mode: 'insensitive' } },
              { gstin: { contains: q.search, mode: 'insensitive' } },
            ],
          }
        : {}),
    };
    const [rows, total] = await prisma.$transaction([
      prisma.supplier.findMany({
        where,
        include: { _count: { select: { purchases: true } } },
        orderBy: { name: 'asc' },
        skip: (q.page - 1) * q.pageSize,
        take: q.pageSize,
      }),
      prisma.supplier.count({ where }),
    ]);
    return { rows: await withOutstanding(rows), total };
  },

  async get(pharmacyId: string, id: string) {
    const supplier = await prisma.supplier.findFirst({
      where: { id, pharmacyId },
      include: { _count: { select: { purchases: true } } },
    });
    if (!supplier) throw AppError.notFound('Supplier');
    return (await withOutstanding([supplier]))[0]!;
  },

  async create(pharmacyId: string, userId: string, data: SupplierBody) {
    const supplier = await prisma.supplier.create({ data: { ...data, pharmacyId } });
    await audit(pharmacyId, userId, 'supplier.create', supplier.id, null, supplier);
    return supplier;
  },

  async update(pharmacyId: string, userId: string, id: string, data: Partial<SupplierBody>) {
    const before = await prisma.supplier.findFirst({ where: { id, pharmacyId } });
    if (!before) throw AppError.notFound('Supplier');
    const supplier = await prisma.supplier.update({ where: { id }, data });
    await audit(pharmacyId, userId, 'supplier.update', id, before, supplier);
    return supplier;
  },

  async delete(pharmacyId: string, userId: string, id: string) {
    const before = await prisma.supplier.findFirst({ where: { id, pharmacyId } });
    if (!before) throw AppError.notFound('Supplier');
    const supplier = await prisma.supplier.update({ where: { id }, data: { isActive: false } });
    await audit(pharmacyId, userId, 'supplier.delete', id, before, supplier);
    return supplier;
  },

  async outstanding(pharmacyId: string, id: string) {
    await this.get(pharmacyId, id);
    const purchases = await prisma.purchase.findMany({
      where: { pharmacyId, supplierId: id, paymentStatus: { not: 'PAID' } },
      orderBy: { orderDate: 'asc' },
      select: { id: true, purchaseNumber: true, orderDate: true, grandTotal: true, paidAmount: true, paymentStatus: true },
    });
    const totalOutstanding = purchases.reduce(
      (sum, purchase) => sum.add(purchase.grandTotal.sub(purchase.paidAmount)),
      new Prisma.Decimal(0),
    );
    return { totalOutstanding, purchases };
  },

  async reports(pharmacyId: string) {
    const [total, active, outstandingRows, topSuppliers] = await Promise.all([
      prisma.supplier.count({ where: { pharmacyId } }),
      prisma.supplier.count({ where: { pharmacyId, isActive: true } }),
      prisma.$queryRaw<{ amount: Prisma.Decimal | null; count: bigint }[]>`
        SELECT COALESCE(SUM(p."grandTotal" - p."paidAmount"), 0) AS amount,
               COUNT(DISTINCT p."supplierId")::bigint AS count
        FROM "Purchase" p
        WHERE p."pharmacyId" = ${pharmacyId}::uuid AND p."paymentStatus" <> 'PAID'`,
      prisma.$queryRaw<{ id: string; name: string; phone: string; total: Prisma.Decimal; purchases: bigint }[]>`
        SELECT s.id, s.name, s.phone, COALESCE(SUM(p."grandTotal"),0) AS total, COUNT(p.id)::bigint AS purchases
        FROM "Supplier" s
        JOIN "Purchase" p ON p."supplierId" = s.id
        WHERE s."pharmacyId" = ${pharmacyId}::uuid
        GROUP BY s.id, s.name, s.phone
        ORDER BY total DESC
        LIMIT 5`,
    ]);
    return {
      total,
      active,
      outstandingAmount: outstandingRows[0]?.amount ?? new Prisma.Decimal(0),
      suppliersWithDue: Number(outstandingRows[0]?.count ?? 0),
      topSuppliers: topSuppliers.map((s) => ({ ...s, purchases: Number(s.purchases) })),
    };
  },
};

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
      entityType: 'supplier',
      entityId,
      before: before as Prisma.InputJsonValue,
      after: after as Prisma.InputJsonValue,
    },
  });
}
