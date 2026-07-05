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
