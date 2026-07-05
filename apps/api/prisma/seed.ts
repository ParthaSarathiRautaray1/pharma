/**
 * Demo seed — one pharmacy, all five roles, catalog, stock with
 * low-stock / near-expiry / expired batches, purchases, sales with
 * ledger entries, customers, suppliers, patients and notifications.
 *
 * Idempotent: wipes and re-creates the demo pharmacy on every run.
 * Run: npm run prisma:seed
 */
import { PrismaClient, Prisma } from '@prisma/client';
import bcrypt from 'bcrypt';
import { addDays, addMonths, subDays, subMonths } from 'date-fns';

const prisma = new PrismaClient();
const D = (n: number | string) => new Prisma.Decimal(n);

const DEMO_PASSWORD = 'Demo@1234';

async function main() {
  console.log('🌱 Seeding PharmaCare demo data...');

  // ── Reset demo tenant (cascades to all owned rows) ────────────────
  await prisma.pharmacy.deleteMany({ where: { email: 'demo@pharmacare.app' } });
  await prisma.user.deleteMany({ where: { email: 'super@pharmacare.app' } });

  const passwordHash = await bcrypt.hash(DEMO_PASSWORD, 12);

  // ── Platform super admin (no pharmacy) ────────────────────────────
  await prisma.user.create({
    data: {
      name: 'Platform Admin',
      email: 'super@pharmacare.app',
      passwordHash,
      role: 'SUPER_ADMIN',
    },
  });

  // ── Tenant ────────────────────────────────────────────────────────
  const pharmacy = await prisma.pharmacy.create({
    data: {
      name: 'GreenLeaf Pharmacy',
      legalName: 'GreenLeaf Pharmacy Pvt. Ltd.',
      gstin: '21ABCDE1234F1Z5',
      drugLicenseNo: 'OD-CTC-123456',
      phone: '+91 98765 43210',
      email: 'demo@pharmacare.app',
      addressLine1: 'Plot 42, Link Road',
      city: 'Cuttack',
      state: 'Odisha',
      pincode: '753012',
      invoicePrefix: 'INV',
      settings: { nearExpiryDays: 90, loyaltyEarnRate: 1, receiptFooter: 'Get well soon!' },
    },
  });
  const pid = pharmacy.id;

  const [owner, pharmacist, cashier, invManager] = await Promise.all(
    (
      [
        ['Asha Mohanty', 'owner@pharmacare.app', 'OWNER'],
        ['Ravi Das', 'pharmacist@pharmacare.app', 'PHARMACIST'],
        ['Sunita Behera', 'cashier@pharmacare.app', 'CASHIER'],
        ['Manoj Sahu', 'inventory@pharmacare.app', 'INVENTORY_MANAGER'],
      ] as const
    ).map(([name, email, role]) =>
      prisma.user.create({ data: { pharmacyId: pid, name, email, passwordHash, role } }),
    ),
  );

  // ── Catalog ───────────────────────────────────────────────────────
  const categoryNames = [
    'Analgesics',
    'Antibiotics',
    'Antacids',
    'Vitamins & Supplements',
    'Diabetes Care',
    'Cardiac Care',
    'Cough & Cold',
    'Dermatology',
  ];
  const categories = Object.fromEntries(
    await Promise.all(
      categoryNames.map(async (name) => [
        name,
        (await prisma.category.create({ data: { pharmacyId: pid, name } })).id,
      ]),
    ),
  ) as Record<string, string>;

  const brandNames: [string, string][] = [
    ['Cipla', 'Cipla Ltd.'],
    ['Sun Pharma', 'Sun Pharmaceutical Industries'],
    ['Dr. Reddy’s', 'Dr. Reddy’s Laboratories'],
    ['Mankind', 'Mankind Pharma'],
    ['Zydus', 'Zydus Lifesciences'],
  ];
  const brands = Object.fromEntries(
    await Promise.all(
      brandNames.map(async ([name, manufacturer]) => [
        name,
        (await prisma.brand.create({ data: { pharmacyId: pid, name, manufacturer } })).id,
      ]),
    ),
  ) as Record<string, string>;

  // name, generic, category, brand, gst%, hsn, barcode, rack, minStock, rx?
  const medicineRows: [string, string, string, string, number, string, string, string, number, boolean][] = [
    ['Paracetamol 500mg', 'Paracetamol', 'Analgesics', 'Cipla', 12, '3004', '8901234500011', 'A1', 50, false],
    ['Azithromycin 500mg', 'Azithromycin', 'Antibiotics', 'Sun Pharma', 12, '3004', '8901234500028', 'B2', 30, true],
    ['Amoxicillin 250mg', 'Amoxicillin', 'Antibiotics', 'Mankind', 12, '3004', '8901234500035', 'B3', 40, true],
    ['Pantoprazole 40mg', 'Pantoprazole', 'Antacids', 'Dr. Reddy’s', 12, '3004', '8901234500042', 'C1', 40, false],
    ['Vitamin D3 60K', 'Cholecalciferol', 'Vitamins & Supplements', 'Zydus', 18, '3004', '8901234500059', 'D1', 25, false],
    ['Metformin 500mg', 'Metformin HCl', 'Diabetes Care', 'Sun Pharma', 12, '3004', '8901234500066', 'E1', 60, true],
    ['Atorvastatin 10mg', 'Atorvastatin', 'Cardiac Care', 'Cipla', 12, '3004', '8901234500073', 'E2', 30, true],
    ['Cetirizine 10mg', 'Cetirizine HCl', 'Cough & Cold', 'Mankind', 12, '3004', '8901234500080', 'A2', 50, false],
    ['Cough Syrup 100ml', 'Dextromethorphan', 'Cough & Cold', 'Zydus', 18, '3004', '8901234500097', 'F1', 20, false],
    ['Clotrimazole Cream', 'Clotrimazole', 'Dermatology', 'Dr. Reddy’s', 12, '3004', '8901234500103', 'G1', 15, false],
  ];

  const medicines: Record<string, string> = {};
  for (const [name, genericName, cat, brand, gst, hsn, barcode, rack, minStock, rx] of medicineRows) {
    const m = await prisma.medicine.create({
      data: {
        pharmacyId: pid,
        name,
        genericName,
        categoryId: categories[cat],
        brandId: brands[brand],
        unit: name.includes('Syrup') || name.includes('Cream') ? 'UNIT' : 'STRIP',
        gstRate: D(gst),
        hsnCode: hsn,
        barcode,
        rackNumber: rack,
        minStockLevel: minStock,
        requiresPrescription: rx,
      },
    });
    medicines[name] = m.id;
  }

  // ── Suppliers ─────────────────────────────────────────────────────
  const [supplier1, supplier2] = await Promise.all([
    prisma.supplier.create({
      data: {
        pharmacyId: pid, name: 'Odisha Medico Distributors', contactPerson: 'P. K. Swain',
        phone: '+91 94370 11111', email: 'sales@odishamedico.in', gstin: '21FGHIJ5678K1Z9',
        address: 'Madhupatna, Cuttack',
      },
    }),
    prisma.supplier.create({
      data: {
        pharmacyId: pid, name: 'Eastern Pharma Agencies', contactPerson: 'S. Mishra',
        phone: '+91 94370 22222', email: 'orders@easternpharma.in', gstin: '21KLMNO9012P1Z3',
        address: 'Unit-4, Bhubaneswar',
      },
    }),
  ]);

  // ── Stock via received purchases ──────────────────────────────────
  // med, batchNo, expiry, qty, cost, sell, mrp — includes an EXPIRED
  // batch, a NEAR-EXPIRY batch and LOW-STOCK levels to light up alerts.
  const now = new Date();
  const stockRows: [string, string, Date, number, number, number, number][] = [
    ['Paracetamol 500mg', 'PCM2401', addMonths(now, 18), 200, 8, 12, 14],
    ['Paracetamol 500mg', 'PCM2309', subDays(now, 20), 30, 7.5, 12, 14], // expired
    ['Azithromycin 500mg', 'AZI2402', addMonths(now, 12), 80, 42, 58, 65],
    ['Amoxicillin 250mg', 'AMX2403', addDays(now, 45), 60, 22, 32, 38], // near expiry
    ['Pantoprazole 40mg', 'PAN2404', addMonths(now, 20), 150, 25, 38, 45],
    ['Vitamin D3 60K', 'VTD2405', addMonths(now, 24), 12, 28, 42, 48], // low stock
    ['Metformin 500mg', 'MET2406', addMonths(now, 16), 250, 12, 18, 22],
    ['Atorvastatin 10mg', 'ATV2407', addMonths(now, 14), 8, 30, 45, 52], // low stock
    ['Cetirizine 10mg', 'CET2408', addMonths(now, 22), 180, 6, 10, 12],
    ['Cough Syrup 100ml', 'CSY2409', addDays(now, 75), 40, 55, 78, 90], // near expiry
    ['Clotrimazole Cream', 'CLT2410', addMonths(now, 19), 25, 38, 55, 62],
  ];

  let purchaseSeq = 0;
  for (const [supplier, rows] of [
    [supplier1, stockRows.slice(0, 6)],
    [supplier2, stockRows.slice(6)],
  ] as const) {
    purchaseSeq += 1;
    const orderDate = subMonths(now, 2);
    let subtotal = D(0);
    let taxAmount = D(0);

    const purchase = await prisma.purchase.create({
      data: {
        pharmacyId: pid,
        supplierId: supplier.id,
        createdById: invManager.id,
        purchaseNumber: `PO-2026-${String(purchaseSeq).padStart(5, '0')}`,
        supplierInvoiceNo: `SUP/${1000 + purchaseSeq}`,
        status: 'RECEIVED',
        orderDate,
        receivedDate: addDays(orderDate, 3),
      },
    });

    for (const [med, batchNumber, expiryDate, qty, cost, sell, mrp] of rows) {
      const gstRate = D(medicineRows.find((r) => r[0] === med)![4]);
      const lineBase = D(cost).mul(qty);
      const lineTax = lineBase.mul(gstRate).div(100);
      subtotal = subtotal.add(lineBase);
      taxAmount = taxAmount.add(lineTax);

      const batch = await prisma.batch.create({
        data: {
          medicineId: medicines[med]!,
          batchNumber,
          mfgDate: subMonths(expiryDate, 24),
          expiryDate,
          purchasePrice: D(cost),
          sellingPrice: D(sell),
          mrp: D(mrp),
          quantity: qty,
        },
      });

      await prisma.purchaseItem.create({
        data: {
          purchaseId: purchase.id, medicineId: medicines[med]!, batchId: batch.id,
          batchNumber, expiryDate, quantity: qty,
          purchasePrice: D(cost), sellingPrice: D(sell), mrp: D(mrp),
          gstRate, taxAmount: lineTax, total: lineBase.add(lineTax),
        },
      });

      await prisma.stockLedgerEntry.create({
        data: {
          pharmacyId: pid, medicineId: medicines[med]!, batchId: batch.id,
          movementType: 'PURCHASE', quantityChange: qty, balanceAfter: qty,
          refType: 'purchase', refId: purchase.id,
        },
      });
    }

    const grandTotal = subtotal.add(taxAmount);
    // First purchase fully paid; second left PARTIAL for the dashboard
    const paidAmount = purchaseSeq === 1 ? grandTotal : grandTotal.div(2).toDecimalPlaces(2);
    await prisma.purchase.update({
      where: { id: purchase.id },
      data: {
        subtotal, taxAmount, grandTotal, paidAmount,
        paymentStatus: purchaseSeq === 1 ? 'PAID' : 'PARTIAL',
      },
    });
    await prisma.payment.create({
      data: {
        purchaseId: purchase.id, receivedById: invManager.id,
        amount: paidAmount, method: 'UPI', reference: `TXN-PO-${purchaseSeq}`,
      },
    });
  }

  // ── Customers ─────────────────────────────────────────────────────
  const customers = await Promise.all(
    (
      [
        ['Bijay Pradhan', '+91 90000 11111', 'bijay@example.com'],
        ['Lipsa Nayak', '+91 90000 22222', 'lipsa@example.com'],
        ['Rakesh Jena', '+91 90000 33333', null],
      ] as const
    ).map(([name, phone, email]) =>
      prisma.customer.create({
        data: { pharmacyId: pid, name, phone, email, loyaltyPoints: 0 },
      }),
    ),
  );

  // ── Sales over the last 30 days ───────────────────────────────────
  // med, qty pairs per sale + payment split for realism
  const saleSpecs: { daysAgo: number; customer: number | null; lines: [string, number][]; paid: 'full' | 'partial' }[] = [
    { daysAgo: 28, customer: 0, lines: [['Paracetamol 500mg', 4], ['Cetirizine 10mg', 2]], paid: 'full' },
    { daysAgo: 21, customer: 1, lines: [['Metformin 500mg', 6], ['Atorvastatin 10mg', 2]], paid: 'full' },
    { daysAgo: 14, customer: null, lines: [['Pantoprazole 40mg', 3]], paid: 'full' },
    { daysAgo: 7, customer: 2, lines: [['Azithromycin 500mg', 2], ['Cough Syrup 100ml', 1]], paid: 'partial' },
    { daysAgo: 2, customer: 0, lines: [['Vitamin D3 60K', 2], ['Paracetamol 500mg', 3]], paid: 'full' },
    { daysAgo: 0, customer: 1, lines: [['Cetirizine 10mg', 3], ['Clotrimazole Cream', 1]], paid: 'full' },
  ];

  let invoiceSeq = 0;
  for (const spec of saleSpecs) {
    invoiceSeq += 1;
    const saleDate = subDays(now, spec.daysAgo);
    let subtotal = D(0);
    let taxAmount = D(0);

    const sale = await prisma.sale.create({
      data: {
        pharmacyId: pid,
        customerId: spec.customer === null ? null : customers[spec.customer]!.id,
        cashierId: cashier.id,
        invoiceNumber: `INV-2026-${String(invoiceSeq).padStart(5, '0')}`,
        saleDate,
        subtotal: D(0),
        grandTotal: D(0),
      },
    });

    for (const [med, qty] of spec.lines) {
      // Sell from the freshest non-expired batch (FEFO handled in app code;
      // seed just picks the valid batch)
      const batch = await prisma.batch.findFirst({
        where: { medicineId: medicines[med]!, expiryDate: { gt: now }, quantity: { gte: qty } },
        orderBy: { expiryDate: 'asc' },
      });
      if (!batch) continue;

      const base = batch.sellingPrice.mul(qty);
      const gstRate = D(medicineRows.find((r) => r[0] === med)![4]);
      const tax = base.mul(gstRate).div(100).toDecimalPlaces(2);
      subtotal = subtotal.add(base);
      taxAmount = taxAmount.add(tax);

      await prisma.saleItem.create({
        data: {
          saleId: sale.id, medicineId: medicines[med]!, batchId: batch.id,
          quantity: qty, unitPrice: batch.sellingPrice, mrp: batch.mrp,
          costPrice: batch.purchasePrice, gstRate, taxAmount: tax, total: base.add(tax),
        },
      });

      const updated = await prisma.batch.update({
        where: { id: batch.id },
        data: { quantity: { decrement: qty } },
      });
      await prisma.stockLedgerEntry.create({
        data: {
          pharmacyId: pid, medicineId: medicines[med]!, batchId: batch.id,
          movementType: 'SALE', quantityChange: -qty, balanceAfter: updated.quantity,
          refType: 'sale', refId: sale.id,
        },
      });
    }

    const grandTotal = subtotal.add(taxAmount).toDecimalPlaces(2);
    const paidAmount = spec.paid === 'full' ? grandTotal : grandTotal.div(2).toDecimalPlaces(2);
    await prisma.sale.update({
      where: { id: sale.id },
      data: {
        subtotal, taxAmount, grandTotal, paidAmount,
        paymentStatus: spec.paid === 'full' ? 'PAID' : 'PARTIAL',
      },
    });
    await prisma.payment.create({
      data: {
        saleId: sale.id,
        customerId: spec.customer === null ? null : customers[spec.customer]!.id,
        receivedById: cashier.id, amount: paidAmount,
        method: invoiceSeq % 2 === 0 ? 'UPI' : 'CASH',
        receivedAt: saleDate,
      },
    });
    // 1 loyalty point per ₹100
    if (spec.customer !== null) {
      await prisma.customer.update({
        where: { id: customers[spec.customer]!.id },
        data: { loyaltyPoints: { increment: grandTotal.div(100).floor().toNumber() } },
      });
    }
  }

  // ── Lab sample demo ───────────────────────────────────────────────
  const patient = await prisma.patient.create({
    data: { pharmacyId: pid, name: 'Gopal Rout', phone: '+91 90000 44444', age: 54, gender: 'M' },
  });
  await prisma.sampleCollection.create({
    data: {
      pharmacyId: pid, patientId: patient.id, createdById: pharmacist.id,
      sampleNumber: 'SMP-2026-00001', testName: 'Fasting Blood Sugar',
      barcode: 'SMP2026000001', status: 'TESTING', collectedAt: subDays(now, 1),
    },
  });

  // ── Alert notifications (normally produced by jobs) ───────────────
  await prisma.notification.createMany({
    data: [
      { pharmacyId: pid, type: 'LOW_STOCK', title: 'Low stock', message: 'Vitamin D3 60K is below minimum stock level (12 left).' },
      { pharmacyId: pid, type: 'LOW_STOCK', title: 'Low stock', message: 'Atorvastatin 10mg is below minimum stock level (6 left).' },
      { pharmacyId: pid, type: 'EXPIRED', title: 'Expired batch', message: 'Paracetamol 500mg batch PCM2309 has expired.' },
      { pharmacyId: pid, type: 'NEAR_EXPIRY', title: 'Near expiry', message: 'Amoxicillin 250mg batch AMX2403 expires in 45 days.' },
      { pharmacyId: pid, type: 'PENDING_PAYMENT', title: 'Pending payment', message: 'Purchase PO-2026-00002 has an outstanding balance.' },
    ],
  });

  await prisma.auditLog.create({
    data: {
      pharmacyId: pid, userId: owner.id, action: 'system.seed',
      entityType: 'pharmacy', entityId: pid, after: { seeded: true },
    },
  });

  console.log('✅ Seed complete.');
  console.log('   Logins (password for all): %s', DEMO_PASSWORD);
  console.log('   super@pharmacare.app / owner@ / pharmacist@ / cashier@ / inventory@pharmacare.app');
}

main()
  .catch((e) => {
    console.error('❌ Seed failed:', e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
