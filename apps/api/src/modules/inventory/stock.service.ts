import { Prisma, type StockMovementType } from '@prisma/client';
import { subDays } from 'date-fns';
import { prisma } from '../../config/prisma';
import { AppError } from '../../shared/errors/app-error';

type Tx = Prisma.TransactionClient;

interface MovementParams {
  pharmacyId: string;
  batchId: string;
  medicineId: string;
  type: StockMovementType;
  /** Signed: +inbound (purchase/return/opening), −outbound (sale/adjust down). */
  quantityChange: number;
  refType?: string;
  refId?: string;
  note?: string;
}

/**
 * The single choke point for every stock change in the system. Updates
 * Batch.quantity and appends an immutable ledger entry in the SAME
 * transaction, so stock and its audit journal can never diverge. Callers
 * MUST pass a transaction client (tx) so the whole business operation
 * (sale, purchase receive, return, adjustment) is atomic.
 *
 * Outbound moves use a guarded conditional update, so two concurrent
 * sales can never oversell a batch below zero.
 */
export async function recordStockMovement(tx: Tx, params: MovementParams) {
  const { batchId, quantityChange } = params;

  if (quantityChange < 0) {
    const res = await tx.batch.updateMany({
      where: { id: batchId, quantity: { gte: -quantityChange } },
      data: { quantity: { increment: quantityChange } },
    });
    if (res.count === 0) {
      const batch = await tx.batch.findUnique({
        where: { id: batchId },
        include: { medicine: { select: { name: true } } },
      });
      throw AppError.insufficientStock(batch?.medicine.name ?? 'this medicine', batch?.quantity ?? 0);
    }
  } else {
    await tx.batch.update({ where: { id: batchId }, data: { quantity: { increment: quantityChange } } });
  }

  const batch = await tx.batch.findUniqueOrThrow({ where: { id: batchId } });
  await tx.stockLedgerEntry.create({
    data: {
      pharmacyId: params.pharmacyId,
      medicineId: params.medicineId,
      batchId,
      movementType: params.type,
      quantityChange,
      balanceAfter: batch.quantity,
      refType: params.refType,
      refId: params.refId,
      note: params.note,
    },
  });
  return batch;
}

export const stockService = {
  /** Manual stock correction — damage, expiry write-off, recount, theft. */
  async adjust(
    pharmacyId: string,
    userId: string,
    input: { batchId: string; quantityChange: number; reason: Prisma.StockAdjustmentCreateInput['reason']; note?: string },
  ) {
    return prisma.$transaction(async (tx) => {
      const batch = await tx.batch.findFirst({
        where: { id: input.batchId, medicine: { pharmacyId } },
      });
      if (!batch) throw AppError.notFound('Batch');

      const updated = await recordStockMovement(tx, {
        pharmacyId,
        batchId: batch.id,
        medicineId: batch.medicineId,
        type: 'ADJUSTMENT',
        quantityChange: input.quantityChange,
        refType: 'adjustment',
        note: input.note,
      });

      const adjustment = await tx.stockAdjustment.create({
        data: {
          pharmacyId,
          batchId: batch.id,
          adjustedById: userId,
          quantityChange: input.quantityChange,
          reason: input.reason,
          note: input.note,
        },
      });

      await tx.auditLog.create({
        data: {
          pharmacyId,
          userId,
          action: 'stock.adjust',
          entityType: 'batch',
          entityId: batch.id,
          after: { quantityChange: input.quantityChange, reason: input.reason, balanceAfter: updated.quantity },
        },
      });

      return { ...adjustment, balanceAfter: updated.quantity };
    });
  },

  listAdjustments(pharmacyId: string, skip: number, take: number) {
    return prisma.$transaction([
      prisma.stockAdjustment.findMany({
        where: { pharmacyId },
        include: {
          batch: { include: { medicine: { select: { name: true } } } },
          adjustedBy: { select: { name: true } },
        },
        orderBy: { createdAt: 'desc' },
        skip,
        take,
      }),
      prisma.stockAdjustment.count({ where: { pharmacyId } }),
    ]);
  },

  ledger(pharmacyId: string, filters: { medicineId?: string; batchId?: string }, skip: number, take: number) {
    const where: Prisma.StockLedgerEntryWhereInput = {
      pharmacyId,
      ...(filters.medicineId ? { medicineId: filters.medicineId } : {}),
      ...(filters.batchId ? { batchId: filters.batchId } : {}),
    };
    return prisma.$transaction([
      prisma.stockLedgerEntry.findMany({
        where,
        include: {
          medicine: { select: { name: true } },
          batch: { select: { batchNumber: true } },
        },
        orderBy: { createdAt: 'desc' },
        skip,
        take,
      }),
      prisma.stockLedgerEntry.count({ where }),
    ]);
  },

  /** Low-stock, near-expiry and expired lists for the alerts view + badges. */
  async alerts(pharmacyId: string) {
    const now = new Date();
    const settings = await prisma.pharmacy.findUnique({
      where: { id: pharmacyId },
      select: { settings: true },
    });
    const nearExpiryDays =
      (settings?.settings as { nearExpiryDays?: number } | null)?.nearExpiryDays ?? 90;
    const nearExpiryLimit = subDays(now, -nearExpiryDays);

    const [lowStock, nearExpiry, expired] = await Promise.all([
      prisma.$queryRaw<{ id: string; name: string; minStockLevel: number; stock: bigint }[]>`
        SELECT m.id, m.name, m."minStockLevel", COALESCE(SUM(b.quantity), 0)::bigint AS stock
        FROM "Medicine" m
        LEFT JOIN "Batch" b ON b."medicineId" = m.id AND b."expiryDate" > ${now}
        WHERE m."pharmacyId" = ${pharmacyId}::uuid AND m."isActive" = true
        GROUP BY m.id, m.name, m."minStockLevel"
        HAVING COALESCE(SUM(b.quantity), 0) <= m."minStockLevel"
        ORDER BY stock ASC`,
      prisma.batch.findMany({
        where: {
          medicine: { pharmacyId },
          quantity: { gt: 0 },
          expiryDate: { gte: now, lte: nearExpiryLimit },
        },
        include: { medicine: { select: { name: true } } },
        orderBy: { expiryDate: 'asc' },
      }),
      prisma.batch.findMany({
        where: { medicine: { pharmacyId }, quantity: { gt: 0 }, expiryDate: { lt: now } },
        include: { medicine: { select: { name: true } } },
        orderBy: { expiryDate: 'asc' },
      }),
    ]);

    return {
      lowStock: lowStock.map((r) => ({
        medicineId: r.id,
        name: r.name,
        minStockLevel: r.minStockLevel,
        stock: Number(r.stock),
      })),
      nearExpiry,
      expired,
    };
  },
};
