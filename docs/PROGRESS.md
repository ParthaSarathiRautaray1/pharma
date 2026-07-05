# Build Progress

Phased, module-by-module build of PharmaCare ERP. Each module is committed separately.

| # | Module | Status | Notes |
|---|---|---|---|
| 1 | Architecture | ✅ Done | [ARCHITECTURE.md](ARCHITECTURE.md) — modular monolith, monorepo |
| 2 | Folder structure & tooling | ✅ Done | npm workspaces, TS/Vite/Tailwind, CI |
| 3 | Database schema | ✅ Done | [DATABASE.md](DATABASE.md) — 24 Prisma models, seed |
| — | Migration + seed on Supabase | ✅ Done | Live DB; demo tenant loaded |
| 4 | API design | ✅ Done | [API_DESIGN.md](API_DESIGN.md) + shared plumbing |
| 5 | Authentication | ✅ Done | JWT + rotating refresh, RBAC, login/forgot/reset UI |
| 6 | UI layout | ✅ Done | App shell, sidebar, theme, Ctrl+K palette |
| 7 | Dashboard | ✅ Done | 10 stat cards + 4 Recharts, real aggregation |
| 8 | Inventory | 🚧 **Backend done + verified; frontend ~60%** | See resume notes below |
| 9 | Billing / POS | ⬜ Pending | |
| 10 | Customers | ⬜ Pending | |
| 11 | Suppliers + Purchases | ⬜ Pending | |
| 12 | Reports + Notifications + Email/WhatsApp | ⬜ Pending | |
| 13 | Marketing website | ⬜ Pending | |
| 14 | Deployment | ⬜ Pending | |

## 🔖 Resume point — Module 8 (Inventory)

### ✅ Backend — COMPLETE, typechecked, integration-tested against live Supabase
- `apps/api/src/modules/inventory/inventory.validators.ts` — all Zod schemas
- `apps/api/src/modules/inventory/stock.service.ts` — **`recordStockMovement(tx, …)`** (the atomic
  batch-update + ledger primitive reused by billing/purchases/returns), `adjust`, `listAdjustments`,
  `ledger`, `alerts`
- `apps/api/src/modules/inventory/inventory.service.ts` — categories/brands/medicines/batches CRUD,
  computed sellable stock, barcode lookup (FEFO, excludes expired), soft-delete
- `apps/api/src/modules/inventory/inventory.controller.ts` + `inventory.routes.ts`
- Mounted in `app.ts`: `/categories /brands /medicines /batches /stock`
- Verified: medicine list + computed stock, lowStock filter, `/stock/alerts`, barcode lookup,
  stock adjustment (244→239 + correct ledger balanceAfter), oversell guard → `INSUFFICIENT_STOCK`,
  cashier blocked → `FORBIDDEN`
- ⚠️ Test side-effect: Metformin batch `MET2406` qty reduced by 5 during testing (244→239).
  Re-run `npm run prisma:seed` in `apps/api` to reset demo data if desired.

### ✅ Frontend — shared plumbing DONE
- UI primitives: `table.tsx`, `select.tsx`, `textarea.tsx`, `tabs.tsx` (Radix select/tabs installed)
- `components/common/DataTable.tsx` — **reusable** TanStack table w/ server pagination, skeletons, empty state
- `components/common/ConfirmDialog.tsx`
- `features/inventory/types.ts`, `features/inventory/api/inventory-api.ts` (all hooks)
- `features/inventory/components/StockBadge.tsx`, `ExpiryBadge.tsx`

### ⬜ Frontend — STILL TO BUILD (next session starts here)
1. `features/inventory/components/MedicineFormDialog.tsx` — create/edit medicine (RHF+Zod,
   category/brand `Select`, gstRate, barcode, minStockLevel, requiresPrescription)
2. `features/inventory/components/AddBatchDialog.tsx` — add batch/opening stock (uses `useCreateBatch`)
3. `features/inventory/components/AdjustStockDialog.tsx` — pick batch, signed qty, reason (uses `useAdjustStock`)
4. `features/inventory/pages/InventoryPage.tsx` — main list: search box, category/brand/lowStock filters,
   `DataTable` with StockBadge + ExpiryBadge, "Add medicine" button, row → detail
5. `features/inventory/pages/MedicineDetailPage.tsx` — Tabs: Batches (+ add/adjust), Ledger; edit/delete
6. `features/inventory/pages/StockAlertsPage.tsx` — low-stock / near-expiry / expired lists (uses `useStockAlerts`)
7. `features/inventory/pages/CatalogPage.tsx` — manage categories & brands (CRUD, ConfirmDialog)
8. Wire routes in `apps/web/src/app/router.tsx`: replace `ComingSoon` for `/app/inventory`; add
   `/app/inventory/:id` (detail), `/app/inventory/alerts`, `/app/inventory/catalog`. Add nav entries if needed.
9. `npm run build --workspace=apps/web` to verify, then commit Module 8.

### Notes for next session
- Follow existing patterns: `apiErrorMessage` for toasts, `PageHeader`, feature-based folders.
- Backend write routes require **INVENTORY** role group; DELETE medicine requires OWNER/SUPER_ADMIN.
- Don't run a local API test server while the user's `npm run dev:api` is running (shared Supabase
  pooler → intermittent `prepared statement already exists` 500s). Clean shutdown now disconnects Prisma.
- Commit style: plain conventional commits, **no Claude co-author trailer**.

## Demo Logins (password `Demo@1234`)

`super@` · `owner@` · `pharmacist@` · `cashier@` · `inventory@pharmacare.app`

## Run locally

```bash
npm run dev:api    # http://localhost:5000
npm run dev:web    # http://localhost:5173
```


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
| 11 | Suppliers + Purchases | Pending | |
| 12 | Reports + Notifications + Email/WhatsApp | Pending | |
| 13 | Marketing website | Pending | |
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

## Next Resume Point

Start Module 11 - Suppliers + Purchases.

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
