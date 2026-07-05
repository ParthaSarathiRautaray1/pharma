import { Prisma } from '@prisma/client';
import { format, startOfDay, startOfMonth, subDays, subMonths } from 'date-fns';
import { prisma } from '../../config/prisma';

/** Postgres COUNT → BigInt, SUM(numeric) → string|Decimal. Coerce safely. */
function num(value: unknown): number {
  if (value === null || value === undefined) return 0;
  if (typeof value === 'bigint') return Number(value);
  if (value instanceof Prisma.Decimal) return value.toNumber();
  return Number(value);
}

export interface DashboardSummary {
  totalSales: number;
  todaySales: number;
  monthlySales: number;
  totalPurchase: number;
  profit: number;
  monthlyProfit: number;
  lowStock: number;
  expiredMedicines: number;
  nearExpiry: number;
  pendingPayments: { amount: number; count: number };
  activeCustomers: number;
}

export const dashboardService = {
  async summary(pharmacyId: string): Promise<DashboardSummary> {
    const now = new Date();
    const todayStart = startOfDay(now);
    const monthStart = startOfMonth(now);

    // Near-expiry window is tenant-configurable (default 90 days)
    const settings = await prisma.pharmacy.findUnique({
      where: { id: pharmacyId },
      select: { settings: true },
    });
    const nearExpiryDays =
      (settings?.settings as { nearExpiryDays?: number } | null)?.nearExpiryDays ?? 90;
    const nearExpiryLimit = subDays(now, -nearExpiryDays); // now + N days

    const [
      salesAgg,
      todayAgg,
      monthAgg,
      purchaseAgg,
      profitRows,
      monthlyProfitRows,
      lowStockRows,
      expiredAgg,
      nearExpiryAgg,
      pendingAgg,
      activeCustomerRows,
    ] = await Promise.all([
      prisma.sale.aggregate({ where: { pharmacyId }, _sum: { grandTotal: true } }),
      prisma.sale.aggregate({
        where: { pharmacyId, saleDate: { gte: todayStart } },
        _sum: { grandTotal: true },
      }),
      prisma.sale.aggregate({
        where: { pharmacyId, saleDate: { gte: monthStart } },
        _sum: { grandTotal: true },
      }),
      prisma.purchase.aggregate({
        where: { pharmacyId, status: 'RECEIVED' },
        _sum: { grandTotal: true },
      }),
      // Profit = Σ (unitPrice − costPrice) × qty over sold items
      prisma.$queryRaw<{ profit: Prisma.Decimal | null }[]>`
        SELECT COALESCE(SUM((si."unitPrice" - si."costPrice") * si.quantity), 0) AS profit
        FROM "SaleItem" si
        JOIN "Sale" s ON s.id = si."saleId"
        WHERE s."pharmacyId" = ${pharmacyId}::uuid`,
      prisma.$queryRaw<{ profit: Prisma.Decimal | null }[]>`
        SELECT COALESCE(SUM((si."unitPrice" - si."costPrice") * si.quantity), 0) AS profit
        FROM "SaleItem" si
        JOIN "Sale" s ON s.id = si."saleId"
        WHERE s."pharmacyId" = ${pharmacyId}::uuid AND s."saleDate" >= ${monthStart}`,
      // Sellable stock (non-expired batches) at or below the reorder point
      prisma.$queryRaw<{ count: bigint }[]>`
        SELECT COUNT(*)::bigint AS count FROM (
          SELECT m.id
          FROM "Medicine" m
          LEFT JOIN "Batch" b ON b."medicineId" = m.id AND b."expiryDate" > ${now}
          WHERE m."pharmacyId" = ${pharmacyId}::uuid AND m."isActive" = true
          GROUP BY m.id, m."minStockLevel"
          HAVING COALESCE(SUM(b.quantity), 0) <= m."minStockLevel"
        ) t`,
      prisma.batch.count({
        where: { medicine: { pharmacyId }, quantity: { gt: 0 }, expiryDate: { lt: now } },
      }),
      prisma.batch.count({
        where: {
          medicine: { pharmacyId },
          quantity: { gt: 0 },
          expiryDate: { gte: now, lte: nearExpiryLimit },
        },
      }),
      // Outstanding receivables: grandTotal − paidAmount on unpaid sales
      prisma.$queryRaw<{ amount: Prisma.Decimal | null; count: bigint }[]>`
        SELECT COALESCE(SUM(s."grandTotal" - s."paidAmount"), 0) AS amount,
               COUNT(*)::bigint AS count
        FROM "Sale" s
        WHERE s."pharmacyId" = ${pharmacyId}::uuid
          AND s."paymentStatus" <> 'PAID'`,
      // Customers with a purchase in the last 90 days
      prisma.$queryRaw<{ count: bigint }[]>`
        SELECT COUNT(DISTINCT s."customerId")::bigint AS count
        FROM "Sale" s
        WHERE s."pharmacyId" = ${pharmacyId}::uuid
          AND s."customerId" IS NOT NULL
          AND s."saleDate" >= ${subDays(now, 90)}`,
    ]);

    return {
      totalSales: num(salesAgg._sum.grandTotal),
      todaySales: num(todayAgg._sum.grandTotal),
      monthlySales: num(monthAgg._sum.grandTotal),
      totalPurchase: num(purchaseAgg._sum.grandTotal),
      profit: num(profitRows[0]?.profit),
      monthlyProfit: num(monthlyProfitRows[0]?.profit),
      lowStock: num(lowStockRows[0]?.count),
      expiredMedicines: expiredAgg,
      nearExpiry: nearExpiryAgg,
      pendingPayments: {
        amount: num(pendingAgg[0]?.amount),
        count: num(pendingAgg[0]?.count),
      },
      activeCustomers: num(activeCustomerRows[0]?.count),
    };
  },

  /** Daily revenue + profit timeseries, gap-filled so the chart has no holes. */
  async revenueSeries(pharmacyId: string, rangeDays: number) {
    const now = new Date();
    const from = startOfDay(subDays(now, rangeDays - 1));

    const rows = await prisma.$queryRaw<{ day: Date; revenue: Prisma.Decimal; profit: Prisma.Decimal }[]>`
      SELECT date_trunc('day', s."saleDate") AS day,
             COALESCE(SUM(s."grandTotal"), 0) AS revenue,
             COALESCE(SUM((si."unitPrice" - si."costPrice") * si.quantity), 0) AS profit
      FROM "Sale" s
      LEFT JOIN "SaleItem" si ON si."saleId" = s.id
      WHERE s."pharmacyId" = ${pharmacyId}::uuid AND s."saleDate" >= ${from}
      GROUP BY 1 ORDER BY 1`;

    // Key by calendar day in local time so labels never shift across the
    // UTC boundary (mixing local startOfDay with a UTC ISO string does).
    const byDay = new Map(rows.map((r) => [format(r.day, 'yyyy-MM-dd'), r]));
    return Array.from({ length: rangeDays }, (_, i) => {
      const date = startOfDay(subDays(now, rangeDays - 1 - i));
      const key = format(date, 'yyyy-MM-dd');
      const row = byDay.get(key);
      return { date: key, revenue: num(row?.revenue), profit: num(row?.profit) };
    });
  },

  /** Monthly sales vs purchases comparison. */
  async salesVsPurchases(pharmacyId: string, months: number) {
    const now = new Date();
    const from = startOfMonth(subMonths(now, months - 1));

    const [sales, purchases] = await Promise.all([
      prisma.$queryRaw<{ month: Date; total: Prisma.Decimal }[]>`
        SELECT date_trunc('month', "saleDate") AS month, COALESCE(SUM("grandTotal"),0) AS total
        FROM "Sale" WHERE "pharmacyId" = ${pharmacyId}::uuid AND "saleDate" >= ${from}
        GROUP BY 1`,
      prisma.$queryRaw<{ month: Date; total: Prisma.Decimal }[]>`
        SELECT date_trunc('month', "orderDate") AS month, COALESCE(SUM("grandTotal"),0) AS total
        FROM "Purchase" WHERE "pharmacyId" = ${pharmacyId}::uuid AND "orderDate" >= ${from}
          AND "status" = 'RECEIVED'
        GROUP BY 1`,
    ]);

    const salesByMonth = new Map(sales.map((r) => [format(r.month, 'yyyy-MM'), num(r.total)]));
    const purchasesByMonth = new Map(
      purchases.map((r) => [format(r.month, 'yyyy-MM'), num(r.total)]),
    );

    return Array.from({ length: months }, (_, i) => {
      const key = format(startOfMonth(subMonths(now, months - 1 - i)), 'yyyy-MM');
      return {
        month: key,
        sales: salesByMonth.get(key) ?? 0,
        purchases: purchasesByMonth.get(key) ?? 0,
      };
    });
  },

  /** Best sellers by quantity and revenue. */
  async topMedicines(pharmacyId: string, limit: number) {
    const rows = await prisma.$queryRaw<
      { name: string; quantity: bigint; revenue: Prisma.Decimal }[]
    >`
      SELECT m.name AS name,
             SUM(si.quantity)::bigint AS quantity,
             COALESCE(SUM(si.total), 0) AS revenue
      FROM "SaleItem" si
      JOIN "Sale" s ON s.id = si."saleId"
      JOIN "Medicine" m ON m.id = si."medicineId"
      WHERE s."pharmacyId" = ${pharmacyId}::uuid
      GROUP BY m.id, m.name
      ORDER BY quantity DESC
      LIMIT ${limit}`;

    return rows.map((r) => ({ name: r.name, quantity: num(r.quantity), revenue: num(r.revenue) }));
  },

  /** New vs returning customers per month. */
  async customerAnalytics(pharmacyId: string, months: number) {
    const now = new Date();
    const from = startOfMonth(subMonths(now, months - 1));

    // First-ever purchase month per customer → "new" that month
    const rows = await prisma.$queryRaw<{ month: Date; new_count: bigint; active_count: bigint }[]>`
      WITH first_sale AS (
        SELECT "customerId", date_trunc('month', MIN("saleDate")) AS first_month
        FROM "Sale"
        WHERE "pharmacyId" = ${pharmacyId}::uuid AND "customerId" IS NOT NULL
        GROUP BY "customerId"
      ),
      monthly AS (
        SELECT date_trunc('month', s."saleDate") AS month,
               COUNT(DISTINCT s."customerId") AS active_count
        FROM "Sale" s
        WHERE s."pharmacyId" = ${pharmacyId}::uuid AND s."customerId" IS NOT NULL
          AND s."saleDate" >= ${from}
        GROUP BY 1
      )
      SELECT mo.month,
             COALESCE(nc.new_count, 0)::bigint AS new_count,
             mo.active_count::bigint AS active_count
      FROM monthly mo
      LEFT JOIN (
        SELECT first_month AS month, COUNT(*) AS new_count
        FROM first_sale GROUP BY first_month
      ) nc ON nc.month = mo.month`;

    const byMonth = new Map(rows.map((r) => [format(r.month, 'yyyy-MM'), r]));
    return Array.from({ length: months }, (_, i) => {
      const key = format(startOfMonth(subMonths(now, months - 1 - i)), 'yyyy-MM');
      const row = byMonth.get(key);
      const active = num(row?.active_count);
      const created = num(row?.new_count);
      return { month: key, newCustomers: created, returning: Math.max(0, active - created) };
    });
  },
};
