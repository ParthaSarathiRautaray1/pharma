# Build Progress

Phased, module-by-module build of PharmaCare ERP. Each module is committed separately.

| # | Module | Status | Notes |
|---|---|---|---|
| 1 | Architecture | Done | [ARCHITECTURE.md](ARCHITECTURE.md) - modular monolith, monorepo |
| 2 | Folder structure & tooling | Done | npm workspaces, TS/Vite/Tailwind, CI |
| 3 | Database schema | Done | [DATABASE.md](DATABASE.md) - 24 Prisma models, seed |
| - | Migration + seed on Supabase | Done | Live DB; demo tenant loaded |
| 4 | API design | Done | [API_DESIGN.md](API_DESIGN.md) + shared plumbing |
| 5 | Authentication | Done | JWT + rotating refresh, RBAC, login/forgot/reset UI |
| 6 | UI layout | Done | App shell, sidebar, theme, Ctrl+K palette |
| 7 | Dashboard | Done | 10 stat cards + 4 Recharts, real aggregation |
| 8 | Inventory | Done | Backend verified; frontend pages/dialogs built and routed |
| 9 | Billing / POS | Done | Transactional sales API + POS/sales frontend |
| 10 | Customers | Done | CRUD, history, dues, prescriptions, POS customer linking |
| 11 | Suppliers + Purchases | Done | Supplier CRUD + purchase order/receive/pay workflow |
| 12 | Reports + Notifications + Email/WhatsApp | Done | Reports, notifications, email helpers, WhatsApp links |
| 13 | Marketing website | Done | Public homepage with product, modules, workflow, trust, and demo CTA |
| 14 | Deployment | Pending | |

## Module 8 - Inventory

### Backend - Complete, typechecked, integration-tested against live Supabase
- `apps/api/src/modules/inventory/inventory.validators.ts` - all Zod schemas
- `apps/api/src/modules/inventory/stock.service.ts` - `recordStockMovement(tx, ...)` atomic batch-update + ledger primitive reused by billing/purchases/returns; `adjust`, `listAdjustments`, `ledger`, `alerts`
- `apps/api/src/modules/inventory/inventory.service.ts` - categories/brands/medicines/batches CRUD, computed sellable stock, barcode lookup (FEFO, excludes expired), soft-delete
- `apps/api/src/modules/inventory/inventory.controller.ts` + `inventory.routes.ts`
- Mounted in `app.ts`: `/categories /brands /medicines /batches /stock`
- Verified: medicine list + computed stock, lowStock filter, `/stock/alerts`, barcode lookup, stock adjustment (244 -> 239 + correct ledger balanceAfter), oversell guard -> `INSUFFICIENT_STOCK`, cashier blocked -> `FORBIDDEN`
- Test side-effect: Metformin batch `MET2406` qty reduced by 5 during testing (244 -> 239). Re-run `npm run prisma:seed` in `apps/api` to reset demo data if desired.

### Frontend - Complete
- UI primitives: `table.tsx`, `select.tsx`, `textarea.tsx`, `tabs.tsx` (Radix select/tabs installed)
- `components/common/DataTable.tsx` - reusable TanStack table with server pagination, skeletons, empty state
- `components/common/ConfirmDialog.tsx`
- `features/inventory/types.ts`, `features/inventory/api/inventory-api.ts` (all hooks)
- `features/inventory/components/StockBadge.tsx`, `ExpiryBadge.tsx`
- `features/inventory/components/MedicineFormDialog.tsx` - create/edit medicine with RHF+Zod, category/brand `Select`, GST rate, barcode, min stock level, prescription toggle
- `features/inventory/components/AddBatchDialog.tsx` - add batch/opening stock through `useCreateBatch`
- `features/inventory/components/AdjustStockDialog.tsx` - pick batch, signed quantity, reason through `useAdjustStock`
- `features/inventory/pages/InventoryPage.tsx` - main list with search, category/brand/lowStock filters, `DataTable`, stock/expiry badges, add medicine, row-to-detail
- `features/inventory/pages/MedicineDetailPage.tsx` - detail summary, batches tab, ledger tab, add/adjust stock, edit/delete
- `features/inventory/pages/StockAlertsPage.tsx` - low-stock, near-expiry, and expired lists via `useStockAlerts`
- `features/inventory/pages/CatalogPage.tsx` - categories and brands CRUD with `ConfirmDialog`
- Routes wired in `apps/web/src/app/router.tsx`: `/app/inventory`, `/app/inventory/:id`, `/app/inventory/alerts`, `/app/inventory/catalog`
- Verified with `npm run build --workspace=apps/web`

## Module 9 - Billing / POS

### Backend - Complete, typechecked, linted
- `apps/api/src/modules/billing/billing.validators.ts` - Zod schemas for checkout, sales filters, payment collection, and returns.
- `apps/api/src/modules/billing/billing.service.ts` - transactional checkout with invoice numbering, split payments, global discount, GST snapshots, loyalty points, audit logs, and guarded batch stock deduction via `recordStockMovement(tx, ...)`.
- `apps/api/src/modules/billing/billing.controller.ts` + `billing.routes.ts`.
- Mounted in `app.ts`: `/sales` and `/returns`.
- Implemented: `POST /sales`, `GET /sales`, `GET /sales/:id`, `POST /sales/:id/payments`, `POST /sales/:id/returns`, `GET /returns`, `GET /sales/:id/whatsapp`.
- Returns restock the original batch through the same stock ledger primitive and update sale return status.
- Verified with `npm run typecheck --workspace=apps/api` and `npm run lint --workspace=apps/api`.
- `npm run build --workspace=apps/api` currently reaches `prisma generate` and then fails on Windows with `EPERM rename ... query_engine-windows.dll.node`, likely because an existing Node/Prisma process or OneDrive has the DLL locked. TypeScript build/typecheck is clean.

### Frontend - Complete, typechecked, linted, built
- `features/billing/types.ts` - sale, sale item, payment, return, and POS cart DTOs.
- `features/billing/api/billing-api.ts` - TanStack Query hooks for sales, sale detail, checkout, payment collection, returns, and return history.
- `features/billing/pages/POSPage.tsx` - medicine search, batch selection, quantity/price controls, discount, payment capture, invoice creation.
- `features/billing/pages/SalesPage.tsx` - sales table, payment-status filter, invoice detail, collect-payment dialog, sale-return dialog.
- Routes wired in `apps/web/src/app/router.tsx`: `/app/billing` and `/app/sales`.
- Verified with `npm run typecheck --workspace=apps/web`, `npm run lint --workspace=apps/web`, and `npm run build --workspace=apps/web`.

## Module 10 - Customers

### Backend - Complete, typechecked, linted
- `apps/api/src/modules/customers/customer.validators.ts` - Zod schemas for customer CRUD, list filters, payment collection, and prescription records.
- `apps/api/src/modules/customers/customer.service.ts` - customer CRUD, derived outstanding balances, purchase history, due collection across oldest unpaid invoices, prescription records, and owner analytics.
- `apps/api/src/modules/customers/customer.controller.ts` + `customer.routes.ts`.
- Mounted in `app.ts`: `/customers`.
- Implemented: `GET/POST/PATCH/DELETE /customers`, `GET /customers/:id/history`, `GET /customers/:id/outstanding`, `POST /customers/:id/payments`, `GET/POST /customers/:id/prescriptions`, `GET /customers/analytics`.
- Verified with `npm run typecheck --workspace=apps/api` and `npm run lint --workspace=apps/api`.

### Frontend - Complete, typechecked, linted, built
- `features/customers/types.ts` and `features/customers/api/customer-api.ts` - customer DTOs and TanStack Query hooks.
- `features/customers/components/CustomerFormDialog.tsx` - create/edit customer.
- `features/customers/pages/CustomersPage.tsx` - searchable customer list, analytics cards, outstanding balances.
- `features/customers/pages/CustomerDetailPage.tsx` - customer summary, purchase history, outstanding invoices, collect due, prescriptions.
- POS customer linking added to `features/billing/pages/POSPage.tsx`.
- Routes wired in `apps/web/src/app/router.tsx`: `/app/customers` and `/app/customers/:id`.
- Verified with `npm run typecheck --workspace=apps/web`, `npm run lint --workspace=apps/web`, and `npm run build --workspace=apps/web`.

## Module 11 - Suppliers + Purchases

### Backend - Complete, typechecked, linted
- `apps/api/src/modules/suppliers/*` - supplier CRUD, outstanding balances, and supplier reports.
- `apps/api/src/modules/purchases/*` - purchase order creation, purchase listing/detail, receive workflow, invoice file URL, and supplier payment collection.
- Mounted in `app.ts`: `/suppliers` and `/purchases`.
- Implemented supplier endpoints: `GET/POST/PATCH/DELETE /suppliers`, `GET /suppliers/:id/outstanding`, `GET /suppliers/reports`.
- Implemented purchase endpoints: `GET/POST /purchases`, `GET/PATCH /purchases/:id`, `POST /purchases/:id/receive`, `POST /purchases/:id/payments`, `POST /purchases/:id/invoice-file`.
- Receiving a purchase creates or reuses batches and adds inventory through `recordStockMovement(tx, ...)` with `PURCHASE` ledger entries.
- Verified with `npm run typecheck --workspace=apps/api` and `npm run lint --workspace=apps/api`.
- `npm run build --workspace=apps/api` still reaches `prisma generate` and then fails on Windows with `EPERM rename ... query_engine-windows.dll.node`, the same locked Prisma engine DLL issue seen in Module 9.

### Frontend - Complete, typechecked, linted, built
- `features/suppliers/types.ts` and `features/suppliers/api/supplier-api.ts` - supplier DTOs and TanStack Query hooks.
- `features/suppliers/components/SupplierFormDialog.tsx` - create/edit suppliers.
- `features/suppliers/pages/SuppliersPage.tsx` - searchable supplier list, report cards, outstanding balances.
- `features/suppliers/pages/SupplierDetailPage.tsx` - supplier summary and purchase history.
- `features/purchases/types.ts` and `features/purchases/api/purchase-api.ts` - purchase DTOs and query/mutation hooks.
- `features/purchases/pages/PurchasesPage.tsx` - purchase list, status filter, new purchase dialog.
- `features/purchases/pages/PurchaseFormDialog.tsx` - purchase order entry with supplier, medicine lines, batch/pricing/GST fields, discount, and initial payment.
- `features/purchases/pages/PurchaseDetailPage.tsx` - purchase detail, receive into inventory, supplier payment dialog.
- Routes wired in `apps/web/src/app/router.tsx`: `/app/suppliers`, `/app/suppliers/:id`, `/app/purchases`, `/app/purchases/:id`.
- Verified with `npm run typecheck --workspace=apps/web`, `npm run lint --workspace=apps/web`, and `npm run build --workspace=apps/web`.

## Module 12 - Reports + Notifications + Email/WhatsApp

### Backend - Complete, typechecked, linted
- `apps/api/src/modules/reports/*` - report query validation and JSON reports for sales, purchases, stock, profit, GST, expiry, customers, and suppliers.
- `apps/api/src/modules/notifications/*` - notification inbox, unread count, mark-one-read, and mark-all-read.
- `apps/api/src/modules/reports/email.routes.ts` - SMTP/dev-log email helpers for invoices, reports, and purchase orders.
- Mounted in `app.ts`: `/reports`, `/notifications`, and `/email`.
- Implemented report endpoint: `GET /reports/:kind?from=&to=&groupBy=&format=json`.
- Implemented notification endpoints: `GET /notifications`, `PATCH /notifications/:id/read`, `POST /notifications/read-all`.
- Implemented email endpoints: `POST /email/invoice/:saleId`, `POST /email/report`, `POST /email/purchase-order/:purchaseId`.
- WhatsApp invoice sharing remains available from Module 9 through `GET /sales/:id/whatsapp`.
- Verified with `npm run typecheck --workspace=apps/api` and `npm run lint --workspace=apps/api`.
- `npm run build --workspace=apps/api` still reaches `prisma generate` and then fails on Windows with `EPERM rename ... query_engine-windows.dll.node`.

### Frontend - Complete, typechecked, linted, built
- `features/reports/types.ts` and `features/reports/api/report-api.ts` - report DTOs, report fetch hook, email-report mutation.
- `features/reports/pages/ReportsPage.tsx` - report selector, date filters, day/month grouping, JSON preview, email action.
- `features/notifications/types.ts` and `features/notifications/api/notification-api.ts` - notification DTOs and read actions.
- `features/notifications/pages/NotificationsPage.tsx` - notification list, unread count, mark read, mark all read.
- Routes wired in `apps/web/src/app/router.tsx`: `/app/reports` and `/app/notifications`.
- Verified with `npm run typecheck --workspace=apps/web`, `npm run lint --workspace=apps/web`, and `npm run build --workspace=apps/web`.

## Module 13 - Marketing website

### Frontend - Complete, typechecked, linted
- Replaced the placeholder public homepage at `features/marketing/pages/HomePage.tsx` with a complete responsive marketing website.
- Added fixed public navigation, mobile menu, hero section, product ERP visual, module grid, workflow section, trust/RBAC section, pricing/demo CTA, and footer.
- Kept the marketing route lazy-loaded at `/` so public visitors do not download the protected ERP routes upfront.
- Verified with `npm run typecheck --workspace=apps/web`, `npm run lint --workspace=apps/web`, and `npm run build --workspace=apps/web`.

## Modules 9-13 - Verification pass (before Module 14)

End-to-end verification of the modules built after Module 8. Both apps typecheck/lint clean and `apps/web` builds. API started against live Supabase; 16 read endpoints (suppliers/reports, purchases, customers/analytics, sales, returns, notifications, all 8 report kinds) all returned 200. RBAC confirmed: cashier blocked from `POST /suppliers` and `GET /reports/profit` (both `FORBIDDEN`). Purchase order -> receive -> stock-in (+qty verified) -> supplier payment, and POS checkout all confirmed working.

Two blocking bugs found and fixed during this pass:

1. **Document-number counter desync (seed).** `seed.ts` created `INV-2026-000xx` / `PO-2026-000xx` rows but never seeded the `counter` table. Runtime checkout/purchase creation regenerated from counter value 1, collided with seeded numbers, and the CONFLICT rolled back the increment - so new sales *and* purchases failed permanently on the demo tenant. Fixed by seeding `invoice:2026` / `purchase:2026` counters to the max seeded sequence in `seed.ts`, and repaired the live DB in place. Verified: `PO-2026-00003`, `INV-2026-00007` now issue cleanly.
2. **Prisma interactive-transaction 5s timeout.** Multi-step stock transactions (`purchase receive`, POS `checkout`, returns) exceeded the default 5000ms interactive-transaction timeout against the Supabase pooler (~5.5-7.9s observed), throwing `INTERNAL`. Fixed globally in `config/prisma.ts` via `transactionOptions: { maxWait: 10s, timeout: 20s }`. Verified receive (7.9s) and checkout (7.4s) now succeed.

Note: verification created demo rows (`PO-2026-00003` received, credit sale `INV-2026-00007`) that shifted some stock. Re-run `npm run prisma:seed` in `apps/api` to reset (now also seeds counters correctly).

## Persistent Build Note - Prisma on Windows

`npm run build --workspace=apps/api` consistently passes the TypeScript build step and then fails during `prisma generate` with:

```text
EPERM: operation not permitted, rename '...query_engine-windows.dll.node.tmp...' -> '...query_engine-windows.dll.node'
```

This appears to be a Windows/OneDrive or running Node/Prisma process lock on Prisma's generated query engine DLL, not a TypeScript/code failure. Current API verification should use `npm run typecheck --workspace=apps/api` and `npm run lint --workspace=apps/api` until the lock is cleared.

## Next Resume Point

Start Module 14 - Deployment.

## Notes for next session
- Follow existing patterns: `apiErrorMessage` for toasts, `PageHeader`, feature-based folders.
- Backend write routes require **INVENTORY** role group; DELETE medicine requires OWNER/SUPER_ADMIN.
- Do not run a local API test server while the user's `npm run dev:api` is running (shared Supabase pooler can cause intermittent `prepared statement already exists` 500s). Clean shutdown now disconnects Prisma.
- Commit style: plain conventional commits, no Claude co-author trailer.

## Demo Logins (password `Demo@1234`)

`super@` / `owner@` / `pharmacist@` / `cashier@` / `inventory@pharmacare.app`

## Run locally

```bash
npm run dev:api    # http://localhost:5000
npm run dev:web    # http://localhost:5173
```
