import { Prisma } from '@prisma/client';
import { prisma } from '../../config/prisma';
import { AppError } from '../../shared/errors/app-error';
import { recordStockMovement } from './stock.service';
import type { BatchListQuery, MedicineListQuery } from './inventory.validators';

/** Attach computed sellable stock + nearest expiry to a set of medicines. */
async function withStock<T extends { id: string }>(medicines: T[]) {
  if (medicines.length === 0) return [] as (T & { stock: number; nearestExpiry: Date | null })[];
  const now = new Date();
  const grouped = await prisma.batch.groupBy({
    by: ['medicineId'],
    where: { medicineId: { in: medicines.map((m) => m.id) }, expiryDate: { gt: now } },
    _sum: { quantity: true },
    _min: { expiryDate: true },
  });
  const map = new Map(grouped.map((g) => [g.medicineId, g]));
  return medicines.map((m) => ({
    ...m,
    stock: map.get(m.id)?._sum.quantity ?? 0,
    nearestExpiry: map.get(m.id)?._min.expiryDate ?? null,
  }));
}

export const inventoryService = {
  // ── Categories ─────────────────────────────────────────────────────
  listCategories(pharmacyId: string) {
    return prisma.category.findMany({
      where: { pharmacyId },
      orderBy: { name: 'asc' },
      include: { _count: { select: { medicines: true } } },
    });
  },
  createCategory(pharmacyId: string, data: { name: string; description?: string }) {
    return prisma.category.create({ data: { ...data, pharmacyId } });
  },
  async updateCategory(pharmacyId: string, id: string, data: { name?: string; description?: string }) {
    await ensureOwned(prisma.category, pharmacyId, id, 'Category');
    return prisma.category.update({ where: { id }, data });
  },
  async deleteCategory(pharmacyId: string, id: string) {
    await ensureOwned(prisma.category, pharmacyId, id, 'Category');
    return prisma.category.delete({ where: { id } });
  },

  // ── Brands ─────────────────────────────────────────────────────────
  listBrands(pharmacyId: string) {
    return prisma.brand.findMany({
      where: { pharmacyId },
      orderBy: { name: 'asc' },
      include: { _count: { select: { medicines: true } } },
    });
  },
  createBrand(pharmacyId: string, data: { name: string; manufacturer?: string }) {
    return prisma.brand.create({ data: { ...data, pharmacyId } });
  },
  async updateBrand(pharmacyId: string, id: string, data: { name?: string; manufacturer?: string }) {
    await ensureOwned(prisma.brand, pharmacyId, id, 'Brand');
    return prisma.brand.update({ where: { id }, data });
  },
  async deleteBrand(pharmacyId: string, id: string) {
    await ensureOwned(prisma.brand, pharmacyId, id, 'Brand');
    return prisma.brand.delete({ where: { id } });
  },

  // ── Medicines ──────────────────────────────────────────────────────
  async listMedicines(pharmacyId: string, q: MedicineListQuery) {
    const now = new Date();
    const where: Prisma.MedicineWhereInput = {
      pharmacyId,
      ...(q.isActive === undefined ? {} : { isActive: q.isActive }),
      ...(q.categoryId ? { categoryId: q.categoryId } : {}),
      ...(q.brandId ? { brandId: q.brandId } : {}),
      ...(q.search
        ? {
            OR: [
              { name: { contains: q.search, mode: 'insensitive' } },
              { genericName: { contains: q.search, mode: 'insensitive' } },
              { barcode: { contains: q.search, mode: 'insensitive' } },
            ],
          }
        : {}),
    };

    // Aggregate-based filters resolve to an explicit id set first
    if (q.lowStock) {
      const ids = await prisma.$queryRaw<{ id: string }[]>`
        SELECT m.id FROM "Medicine" m
        LEFT JOIN "Batch" b ON b."medicineId" = m.id AND b."expiryDate" > ${now}
        WHERE m."pharmacyId" = ${pharmacyId}::uuid AND m."isActive" = true
        GROUP BY m.id, m."minStockLevel"
        HAVING COALESCE(SUM(b.quantity), 0) <= m."minStockLevel"`;
      where.id = { in: ids.map((r) => r.id) };
    }
    if (q.expired) {
      const expiredMeds = await prisma.batch.findMany({
        where: { medicine: { pharmacyId }, quantity: { gt: 0 }, expiryDate: { lt: now } },
        select: { medicineId: true },
        distinct: ['medicineId'],
      });
      const expiredIds = expiredMeds.map((b) => b.medicineId);
      where.id = where.id ? { in: expiredIds.filter((id) => (where.id as { in: string[] }).in.includes(id)) } : { in: expiredIds };
    }

    const orderBy: Prisma.MedicineOrderByWithRelationInput =
      q.sortBy && ['name', 'createdAt', 'minStockLevel'].includes(q.sortBy)
        ? { [q.sortBy]: q.sortOrder }
        : { name: 'asc' };

    const [rows, total] = await prisma.$transaction([
      prisma.medicine.findMany({
        where,
        include: { category: { select: { name: true } }, brand: { select: { name: true } } },
        orderBy,
        skip: (q.page - 1) * q.pageSize,
        take: q.pageSize,
      }),
      prisma.medicine.count({ where }),
    ]);

    return { rows: await withStock(rows), total };
  },

  async getMedicine(pharmacyId: string, id: string) {
    const medicine = await prisma.medicine.findFirst({
      where: { id, pharmacyId },
      include: {
        category: { select: { id: true, name: true } },
        brand: { select: { id: true, name: true } },
        batches: { orderBy: { expiryDate: 'asc' } },
      },
    });
    if (!medicine) throw AppError.notFound('Medicine');
    const now = new Date();
    const stock = medicine.batches
      .filter((b) => b.expiryDate > now)
      .reduce((sum, b) => sum + b.quantity, 0);
    return { ...medicine, stock };
  },

  async getByBarcode(pharmacyId: string, barcode: string) {
    const now = new Date();
    const medicine = await prisma.medicine.findFirst({
      where: { pharmacyId, barcode, isActive: true },
      include: {
        // Only sellable batches: not expired, in stock, FEFO order
        batches: {
          where: { expiryDate: { gt: now }, quantity: { gt: 0 } },
          orderBy: { expiryDate: 'asc' },
        },
      },
    });
    if (!medicine) throw AppError.notFound('Medicine');
    return medicine;
  },

  async createMedicine(pharmacyId: string, userId: string, data: Prisma.MedicineUncheckedCreateInput) {
    const medicine = await prisma.medicine.create({ data: { ...data, pharmacyId } });
    await audit(pharmacyId, userId, 'medicine.create', medicine.id, null, medicine);
    return medicine;
  },

  async updateMedicine(pharmacyId: string, userId: string, id: string, data: Prisma.MedicineUncheckedUpdateInput) {
    const before = await prisma.medicine.findFirst({ where: { id, pharmacyId } });
    if (!before) throw AppError.notFound('Medicine');
    const medicine = await prisma.medicine.update({ where: { id }, data });
    await audit(pharmacyId, userId, 'medicine.update', id, before, medicine);
    return medicine;
  },

  /** Soft delete — history (sales/batches) must survive. */
  async deleteMedicine(pharmacyId: string, userId: string, id: string) {
    const before = await prisma.medicine.findFirst({ where: { id, pharmacyId } });
    if (!before) throw AppError.notFound('Medicine');
    const medicine = await prisma.medicine.update({ where: { id }, data: { isActive: false } });
    await audit(pharmacyId, userId, 'medicine.delete', id, before, medicine);
    return medicine;
  },

  // ── Batches ────────────────────────────────────────────────────────
  async listBatches(pharmacyId: string, q: BatchListQuery) {
    const now = new Date();
    const where: Prisma.BatchWhereInput = {
      medicine: { pharmacyId },
      ...(q.medicineId ? { medicineId: q.medicineId } : {}),
      ...(q.expired ? { expiryDate: { lt: now } } : {}),
      ...(q.nearExpiry ? { expiryDate: { gte: now } } : {}),
    };
    const [rows, total] = await prisma.$transaction([
      prisma.batch.findMany({
        where,
        include: { medicine: { select: { name: true, unit: true } } },
        orderBy: { expiryDate: 'asc' },
        skip: (q.page - 1) * q.pageSize,
        take: q.pageSize,
      }),
      prisma.batch.count({ where }),
    ]);
    return { rows, total };
  },

  /** Add a batch directly (opening stock / manual receipt) → OPENING ledger. */
  async createBatch(
    pharmacyId: string,
    userId: string,
    data: {
      medicineId: string;
      batchNumber: string;
      mfgDate?: Date;
      expiryDate: Date;
      purchasePrice: number;
      sellingPrice: number;
      mrp: number;
      quantity: number;
    },
  ) {
    const medicine = await prisma.medicine.findFirst({ where: { id: data.medicineId, pharmacyId } });
    if (!medicine) throw AppError.notFound('Medicine');

    return prisma.$transaction(async (tx) => {
      const batch = await tx.batch.create({
        data: {
          medicineId: data.medicineId,
          batchNumber: data.batchNumber,
          mfgDate: data.mfgDate,
          expiryDate: data.expiryDate,
          purchasePrice: new Prisma.Decimal(data.purchasePrice),
          sellingPrice: new Prisma.Decimal(data.sellingPrice),
          mrp: new Prisma.Decimal(data.mrp),
          quantity: 0,
        },
      });
      // Route the opening quantity through the ledger so history is complete
      if (data.quantity > 0) {
        await recordStockMovement(tx, {
          pharmacyId,
          batchId: batch.id,
          medicineId: batch.medicineId,
          type: 'OPENING',
          quantityChange: data.quantity,
          refType: 'batch',
          refId: batch.id,
          note: 'Opening stock',
        });
      }
      await tx.auditLog.create({
        data: { pharmacyId, userId, action: 'batch.create', entityType: 'batch', entityId: batch.id, after: { ...batch, quantity: data.quantity } },
      });
      return { ...batch, quantity: data.quantity };
    });
  },
};

// ── Helpers ──────────────────────────────────────────────────────────

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
      entityType: 'medicine',
      entityId,
      before: before as Prisma.InputJsonValue,
      after: after as Prisma.InputJsonValue,
    },
  });
}

/** Guard that a categories/brands row belongs to the tenant before mutating. */
async function ensureOwned(
  model: { findFirst: (args: { where: { id: string; pharmacyId: string } }) => Promise<unknown> },
  pharmacyId: string,
  id: string,
  label: string,
) {
  const found = await model.findFirst({ where: { id, pharmacyId } });
  if (!found) throw AppError.notFound(label);
}
