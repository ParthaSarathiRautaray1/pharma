# Folder Structure

Feature-based architecture: each business module owns its full vertical slice.
Shared code lives outside feature folders and never imports from them.

## Root

```
pharma/
├── apps/
│   ├── api/                     # Express + Prisma backend
│   └── web/                     # React frontend (marketing + ERP)
├── docs/                        # Architecture & design docs
├── .github/workflows/ci.yml    # Lint → typecheck → build on every push
├── package.json                 # npm workspaces root
├── .prettierrc  .editorconfig  .gitignore
└── README.md
```

## Backend — `apps/api`

```
apps/api/
├── prisma/
│   ├── schema.prisma            # Full schema (Module 3)
│   ├── migrations/              # Prisma migrations (committed)
│   └── seed.ts                  # Roles, admin user, demo data
├── src/
│   ├── config/                  # env.ts (Zod-validated), logger.ts, prisma.ts, mail.ts
│   ├── middleware/              # auth, rbac, validate, error-handler, audit, upload
│   ├── modules/                 # ── one folder per business feature ──
│   │   ├── auth/                #   auth.routes.ts / auth.controller.ts /
│   │   ├── users/               #   auth.service.ts / auth.validators.ts /
│   │   ├── dashboard/           #   auth.types.ts  (same pattern in every module)
│   │   ├── inventory/
│   │   ├── billing/
│   │   ├── customers/
│   │   ├── suppliers/
│   │   ├── purchases/
│   │   ├── samples/
│   │   ├── reports/
│   │   ├── notifications/
│   │   ├── settings/
│   │   └── audit/
│   ├── jobs/                    # node-cron: expiry scan, low-stock scan, daily summary
│   ├── shared/
│   │   ├── errors/              # AppError hierarchy + error codes
│   │   ├── utils/               # invoice numbers, GST math, pagination, pdf, excel
│   │   ├── types/               # response envelope, request context
│   │   └── constants/           # roles, permissions, GST slabs, payment modes
│   ├── app.ts                   # Express app factory (middleware + route mounting)
│   └── server.ts                # Bootstrap + graceful shutdown
├── logs/                        # Winston file output (dev/VPS only, gitignored)
├── uploads/                     # Local storage driver target (gitignored)
├── .env.example
├── eslint.config.js
├── package.json
└── tsconfig.json                # strict, @/* → src/*
```

**Module file pattern** (every folder in `modules/`):

| File | Responsibility |
|---|---|
| `*.routes.ts` | Router: paths + middleware chain (auth → rbac → validate) |
| `*.controller.ts` | HTTP only — parse request, call service, send envelope |
| `*.service.ts` | Business logic, transactions; the only layer touching Prisma |
| `*.validators.ts` | Zod schemas for body/query/params |
| `*.types.ts` | DTOs and module-local types |

## Frontend — `apps/web`

```
apps/web/
├── public/                      # favicon, og-image, robots.txt
├── src/
│   ├── app/                     # App.tsx, router.tsx, providers.tsx
│   ├── assets/                  # images, illustrations
│   ├── components/
│   │   ├── ui/                  # shadcn/ui primitives (generated)
│   │   ├── common/              # DataTable, PageHeader, EmptyState, Skeletons,
│   │   │                        # ConfirmDialog, SearchInput, StatCard, ...
│   │   └── layout/              # AppShell, Sidebar, Topbar, CommandPalette
│   ├── features/                # ── one folder per business feature ──
│   │   ├── marketing/           #   pages/ components/ (public site)
│   │   ├── auth/                #   pages/ components/ api/ hooks/ types/
│   │   ├── dashboard/           #   (same pattern in every feature)
│   │   ├── inventory/
│   │   ├── billing/
│   │   ├── customers/
│   │   ├── suppliers/
│   │   ├── purchases/
│   │   ├── samples/
│   │   ├── reports/
│   │   ├── notifications/
│   │   └── settings/
│   ├── hooks/                   # useDebounce, usePagination, useHotkeys, ...
│   ├── lib/                     # axios client + interceptors, utils (cn), query client
│   ├── stores/                  # Zustand: auth, theme, POS cart, UI prefs
│   ├── types/                   # Shared API types (response envelope, entities)
│   ├── constants/               # routes map, role permissions, nav config
│   ├── config/                  # env access (import.meta.env), app metadata
│   ├── index.css                # Tailwind v4 + design tokens (light/dark)
│   └── main.tsx
├── components.json              # shadcn/ui config
├── index.html                   # SEO meta + theme-flash prevention
├── vite.config.ts               # @ alias, /api dev proxy, vendor chunk splitting
└── package.json / tsconfigs / eslint.config.js
```

**Feature folder pattern** (every folder in `features/`):

| Folder | Contents |
|---|---|
| `pages/` | Route components (lazy-loaded in router) |
| `components/` | Feature-specific UI |
| `api/` | TanStack Query hooks + axios calls for this feature |
| `hooks/` | Feature-specific hooks |
| `types.ts` | Feature DTOs (mirror API types) |

## Import Rules

1. `features/*` may import from `components/`, `hooks/`, `lib/`, `stores/`, `types/`, `constants/` — never from another feature.
2. Cross-feature needs (e.g. billing needs customer search) are met via shared components or the feature's public `api/` hooks.
3. Backend `modules/*` follow the same rule; cross-module orchestration happens in services via explicit imports of other services (e.g. `BillingService` → `StockService`).
