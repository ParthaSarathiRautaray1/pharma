# Database Design

Schema source of truth: [`apps/api/prisma/schema.prisma`](../apps/api/prisma/schema.prisma) — fully commented.
This doc covers the reasoning that isn't obvious from the model definitions.

## Entity Groups

```
Tenant/Identity   Pharmacy · Branch · User · RefreshToken · PasswordResetToken
Catalog/Stock     Category · Brand · Medicine · Batch · StockLedgerEntry · StockAdjustment
Purchasing        Supplier · Purchase · PurchaseItem
Selling           Customer · Prescription · Sale · SaleItem · SaleReturn · SaleReturnItem · Payment
Lab               Patient · SampleCollection
Platform          Notification · AuditLog · Counter
```

## Key Design Decisions

**Stock lives on `Batch`, not `Medicine`.**
Pharmacy stock is legally batch-tracked (batch number, mfg/expiry, batch-specific MRP).
`Medicine.currentStock` is always derived as `SUM(batches.quantity)` — never stored, so it can never drift.
Expired stock is excluded from *sellable* stock in queries (`expiryDate > now()`).

**`StockLedgerEntry` is an append-only journal.**
Every movement (purchase receive, sale, return, adjustment) writes a signed `quantityChange`
plus `balanceAfter`, inside the same transaction that mutates `Batch.quantity`.
This gives free audit history and lets any balance be verified or rebuilt.

**Prices are snapshotted onto transaction items.**
`SaleItem` stores `unitPrice`, `mrp`, `costPrice`, `gstRate`, `taxAmount` at the moment of sale.
Profit reports = `(unitPrice − costPrice) × qty` from sale items alone — immune to later
price edits, and no joins back to live batch prices.

**Document numbering uses the `Counter` table.**
`SELECT … FOR UPDATE` on `(pharmacyId, key)` inside the sale/purchase transaction produces
gap-free, collision-safe sequences per pharmacy per year: `INV-2026-00042`, `PO-2026-00007`,
`RET-…`, `SMP-…`. Safe under concurrent cashiers and future multi-branch.

**Outstanding balances are derived, not stored.**
Customer outstanding = `SUM(sale.grandTotal − sale.paidAmount)` over unpaid/partial sales;
supplier outstanding likewise from purchases. Avoids the classic drifting-balance bug.
`paidAmount`/`paymentStatus` on the document are updated transactionally with each `Payment` row.

**Split payments = multiple `Payment` rows** (CASH + UPI on one invoice is two rows).
The same table records supplier payments and standalone customer due collections.

**Multi-branch**: `branchId` is nullable on `Batch` (and `Branch` exists under `Pharmacy`).
Single-branch pharmacies leave it null. Enabling branches later = populate the column;
uniqueness (`medicineId, batchNumber, branchId`) and all queries already account for it.

**Deletion policy**: tenant data cascades from `Pharmacy` (clean tenant offboarding);
transactional references (`Sale → cashier`, `PurchaseItem → Medicine`) use restrictive/`SetNull`
semantics so history is never silently destroyed. Business-level deletes are soft (`isActive`).

## Hot-Path Indexes

| Query | Index |
|---|---|
| POS medicine search | `Medicine(pharmacyId, name)`, unique barcode per pharmacy |
| Expiry alerts | `Batch(expiryDate)`, `Batch(medicineId, expiryDate)` |
| Dashboard sales ranges | `Sale(pharmacyId, saleDate)` |
| Pending payments | `Sale(pharmacyId, paymentStatus)`, `Purchase(pharmacyId, paymentStatus)` |
| Stock history | `StockLedgerEntry(medicineId, createdAt)`, `(batchId)` |
| Notifications badge | `Notification(pharmacyId, isRead, createdAt)` |
| Audit trail | `AuditLog(entityType, entityId)`, `(pharmacyId, createdAt)` |

## Seed Data

`prisma/seed.ts` creates a demo tenant (idempotent — safe to re-run):

- 5 users, one per role — password `Demo@1234`
  (`super@` / `owner@` / `pharmacist@` / `cashier@` / `inventory@pharmacare.app`)
- 8 categories, 5 brands, 10 medicines, 11 batches via 2 received purchases
- Deliberate alert states: 1 **expired** batch, 2 **near-expiry**, 2 **low-stock**, 1 purchase with **outstanding balance**
- 6 sales across the last 30 days with ledger entries, split cash/UPI payments, loyalty points
- 1 lab patient + sample in TESTING, 5 seeded notifications

## Workflow

```bash
npm run prisma:migrate   # create/apply migrations (dev)
npm run prisma:seed      # load demo data
npm run prisma:studio    # inspect
```
