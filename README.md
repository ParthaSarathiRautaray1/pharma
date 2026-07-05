# PharmaCare ERP

Enterprise Pharmacy ERP + Marketing Website — inventory, POS billing, GST invoicing, customers, suppliers, purchases, reports, and analytics.

## Monorepo Layout

| Path | Description |
|---|---|
| `apps/web` | React 19 + Vite + Tailwind + shadcn/ui — marketing site + ERP SPA |
| `apps/api` | Node.js + Express + TypeScript + Prisma — REST API |
| `docs/` | Architecture, folder structure, API design, deployment runbooks |

## Quick Start

```bash
# 1. Install (Node 20+)
npm install

# 2. Configure the API
cp apps/api/.env.example apps/api/.env    # then fill in DATABASE_URL etc.

# 3. Database
npm run prisma:migrate
npm run prisma:seed

# 4. Run both apps
npm run dev:api    # http://localhost:5000
npm run dev:web    # http://localhost:5173
```

## Scripts

| Command | Action |
|---|---|
| `npm run dev:api` / `dev:web` | Start API / frontend in watch mode |
| `npm run build` | Build all workspaces |
| `npm run lint` / `typecheck` / `format` | Quality gates (also run in CI) |
| `npm run prisma:studio` | Browse the database |

## Documentation

- [Architecture](docs/ARCHITECTURE.md)
- [Folder Structure](docs/FOLDER_STRUCTURE.md)
