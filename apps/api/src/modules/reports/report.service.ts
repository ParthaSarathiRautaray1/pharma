import { Prisma } from '@prisma/client';
import { format } from 'date-fns';
import { prisma } from '../../config/prisma';
import type { ReportQuery } from './report.validators';

function num(value: unknown): number {
  if (value === null || value === undefined) return 0;
  if (typeof value === 'bigint') return Number(value);
  if (value instanceof Prisma.Decimal) return value.toNumber();
  return Number(value);
}

function dateWhere(field: 'saleDate' | 'orderDate' | 'expiryDate', q: ReportQuery) {
  return q.from || q.to ? { [field]: { ...(q.from ? { gte: q.from } : {}), ...(q.to ? { lte: q.to } : {}) } } : {};
}

export const reportService = {
  async sales(pharmacyId: string, q: ReportQuery) {
    const bucket = q.groupBy === 'month' ? 'month' : 'day';
    const rows = await prisma.$queryRaw<{ period: Date; invoices: bigint; total: Prisma.Decimal; paid: Prisma.Decimal }[]>`
      SELECT date_trunc(${bucket}, s."saleDate") AS period,
             COUNT(*)::bigint AS invoices,
             COALESCE(SUM(s."grandTotal"), 0) AS total,
             COALESCE(SUM(s."paidAmount"), 0) AS paid
      FROM "Sale" s
      WHERE s."pharmacyId" = ${pharmacyId}::uuid
        AND (${q.from ?? null}::timestamp IS NULL OR s."saleDate" >= ${q.from ?? null})
        AND (${q.to ?? null}::timestamp IS NULL OR s."saleDate" <= ${q.to ?? null})
      GROUP BY 1 ORDER BY 1`;
    return rows.map((r) => ({ period: format(r.period, bucket === 'month' ? 'yyyy-MM' : 'yyyy-MM-dd'), invoices: num(r.invoices), total: num(r.total), paid: num(r.paid), outstanding: num(r.total) - num(r.paid) }));
  },

  async purchases(pharmacyId: string, q: ReportQuery) {
    const bucket = q.groupBy === 'month' ? 'month' : 'day';
    const rows = await prisma.$queryRaw<{ period: Date; orders: bigint; total: Prisma.Decimal; paid: Prisma.Decimal }[]>`
      SELECT date_trunc(${bucket}, p."orderDate") AS period,
             COUNT(*)::bigint AS orders,
             COALESCE(SUM(p."grandTotal"), 0) AS total,
             COALESCE(SUM(p."paidAmount"), 0) AS paid
      FROM "Purchase" p
      WHERE p."pharmacyId" = ${pharmacyId}::uuid
        AND (${q.from ?? null}::timestamp IS NULL OR p."orderDate" >= ${q.from ?? null})
        AND (${q.to ?? null}::timestamp IS NULL OR p."orderDate" <= ${q.to ?? null})
      GROUP BY 1 ORDER BY 1`;
    return rows.map((r) => ({ period: format(r.period, bucket === 'month' ? 'yyyy-MM' : 'yyyy-MM-dd'), orders: num(r.orders), total: num(r.total), paid: num(r.paid), outstanding: num(r.total) - num(r.paid) }));
  },

  async stock(pharmacyId: string) {
    const rows = await prisma.$queryRaw<{ id: string; name: string; stock: bigint; value: Prisma.Decimal }[]>`
      SELECT m.id, m.name, COALESCE(SUM(b.quantity), 0)::bigint AS stock,
             COALESCE(SUM(b.quantity * b."purchasePrice"), 0) AS value
      FROM "Medicine" m
      LEFT JOIN "Batch" b ON b."medicineId" = m.id
      WHERE m."pharmacyId" = ${pharmacyId}::uuid AND m."isActive" = true
      GROUP BY m.id, m.name
      ORDER BY m.name`;
    return rows.map((r) => ({ id: r.id, name: r.name, stock: num(r.stock), value: num(r.value) }));
  },

  async profit(pharmacyId: string, q: ReportQuery) {
    const rows = await prisma.$queryRaw<{ medicine: string; quantity: bigint; revenue: Prisma.Decimal; cost: Prisma.Decimal; profit: Prisma.Decimal }[]>`
      SELECT m.name AS medicine,
             COALESCE(SUM(si.quantity), 0)::bigint AS quantity,
             COALESCE(SUM(si.total), 0) AS revenue,
             COALESCE(SUM(si."costPrice" * si.quantity), 0) AS cost,
             COALESCE(SUM((si."unitPrice" - si."costPrice") * si.quantity), 0) AS profit
      FROM "SaleItem" si
      JOIN "Sale" s ON s.id = si."saleId"
      JOIN "Medicine" m ON m.id = si."medicineId"
      WHERE s."pharmacyId" = ${pharmacyId}::uuid
        AND (${q.from ?? null}::timestamp IS NULL OR s."saleDate" >= ${q.from ?? null})
        AND (${q.to ?? null}::timestamp IS NULL OR s."saleDate" <= ${q.to ?? null})
      GROUP BY m.id, m.name ORDER BY profit DESC`;
    return rows.map((r) => ({ medicine: r.medicine, quantity: num(r.quantity), revenue: num(r.revenue), cost: num(r.cost), profit: num(r.profit) }));
  },

  async gst(pharmacyId: string, q: ReportQuery) {
    const [sales, purchases] = await Promise.all([
      prisma.sale.aggregate({ where: { pharmacyId, ...dateWhere('saleDate', q) }, _sum: { taxAmount: true } }),
      prisma.purchase.aggregate({ where: { pharmacyId, ...dateWhere('orderDate', q) }, _sum: { taxAmount: true } }),
    ]);
    return { outputGst: num(sales._sum.taxAmount), inputGst: num(purchases._sum.taxAmount), netPayable: num(sales._sum.taxAmount) - num(purchases._sum.taxAmount) };
  },

  expiry(pharmacyId: string, q: ReportQuery) {
    return prisma.batch.findMany({
      where: { medicine: { pharmacyId }, quantity: { gt: 0 }, ...dateWhere('expiryDate', q) },
      include: { medicine: { select: { name: true } } },
      orderBy: { expiryDate: 'asc' },
    });
  },

  async customers(pharmacyId: string) {
    const rows = await prisma.$queryRaw<{ name: string; phone: string; invoices: bigint; total: Prisma.Decimal; outstanding: Prisma.Decimal }[]>`
      SELECT c.name, c.phone, COUNT(s.id)::bigint AS invoices,
             COALESCE(SUM(s."grandTotal"), 0) AS total,
             COALESCE(SUM(s."grandTotal" - s."paidAmount"), 0) AS outstanding
      FROM "Customer" c LEFT JOIN "Sale" s ON s."customerId" = c.id
      WHERE c."pharmacyId" = ${pharmacyId}::uuid
      GROUP BY c.id, c.name, c.phone ORDER BY total DESC`;
    return rows.map((r) => ({ name: r.name, phone: r.phone, invoices: num(r.invoices), total: num(r.total), outstanding: num(r.outstanding) }));
  },

  async suppliers(pharmacyId: string) {
    const rows = await prisma.$queryRaw<{ name: string; phone: string; purchases: bigint; total: Prisma.Decimal; outstanding: Prisma.Decimal }[]>`
      SELECT s.name, s.phone, COUNT(p.id)::bigint AS purchases,
             COALESCE(SUM(p."grandTotal"), 0) AS total,
             COALESCE(SUM(p."grandTotal" - p."paidAmount"), 0) AS outstanding
      FROM "Supplier" s LEFT JOIN "Purchase" p ON p."supplierId" = s.id
      WHERE s."pharmacyId" = ${pharmacyId}::uuid
      GROUP BY s.id, s.name, s.phone ORDER BY total DESC`;
    return rows.map((r) => ({ name: r.name, phone: r.phone, purchases: num(r.purchases), total: num(r.total), outstanding: num(r.outstanding) }));
  },
};
