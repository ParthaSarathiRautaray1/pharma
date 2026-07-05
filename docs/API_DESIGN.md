# API Design

Base URL: `/api/v1` · JSON only · JWT bearer auth · All timestamps ISO-8601 UTC.

## Response Envelope

Every endpoint returns the same shape — clients never branch on status code alone:

```jsonc
// Success
{ "success": true, "data": { ... }, "meta": { "page": 1, "pageSize": 20, "total": 143, "totalPages": 8 } }

// Failure
{ "success": false, "error": { "code": "VALIDATION_ERROR", "message": "Quantity must be positive", "details": [ { "path": "items.0.quantity", "message": "..." } ] } }
```

`meta` appears only on paginated list endpoints. `details` appears only on validation errors.

## Error Codes

| HTTP | Code | Meaning |
|---|---|---|
| 400 | `VALIDATION_ERROR` | Zod validation failed (details included) |
| 400 | `BAD_REQUEST` | Semantically invalid operation |
| 401 | `UNAUTHORIZED` | Missing/invalid/expired access token |
| 401 | `INVALID_CREDENTIALS` | Login failed |
| 401 | `TOKEN_EXPIRED` | Access token expired → client should refresh |
| 403 | `FORBIDDEN` | Authenticated but role lacks permission |
| 404 | `NOT_FOUND` | Resource doesn't exist (or belongs to another pharmacy) |
| 409 | `CONFLICT` | Unique constraint (duplicate barcode, phone, ...) |
| 409 | `INSUFFICIENT_STOCK` | Requested qty exceeds sellable batch stock |
| 409 | `EXPIRED_BATCH` | Attempt to sell from an expired batch |
| 422 | `BUSINESS_RULE` | Other domain rule violations (e.g. return qty > sold qty) |
| 429 | `RATE_LIMITED` | Too many requests |
| 500 | `INTERNAL` | Unhandled error (logged with requestId, never leaks internals) |

## Conventions

- **Pagination**: `?page=1&pageSize=20` (max 100). Sorting: `?sortBy=name&sortOrder=asc`.
- **Search/filter**: server-side via query params, e.g. `?search=para&categoryId=...&lowStock=true`.
- **Tenancy**: `pharmacyId` is NEVER accepted from the client — it is derived from the JWT and injected into every query. Cross-tenant access is structurally impossible.
- **Auth**: `Authorization: Bearer <accessToken>`; refresh via httpOnly-style rotation endpoint.
- **Mutations** return the full updated resource. Deletes are soft (`isActive: false`) unless noted.
- **Idempotent stock writes**: sale/purchase/return/adjustment endpoints run in a single DB transaction (batch update + ledger entry + counter + document).

## Endpoint Catalog

### Auth — `/auth` (public unless noted)
| Method | Path | Notes |
|---|---|---|
| POST | `/auth/login` | → user + accessToken + refreshToken |
| POST | `/auth/refresh` | Rotates refresh token |
| POST | `/auth/logout` | 🔒 Revokes refresh token |
| POST | `/auth/forgot-password` | Sends reset email (always 200) |
| POST | `/auth/reset-password` | Token + new password |
| POST | `/auth/change-password` | 🔒 Current + new password |
| GET | `/auth/me` | 🔒 Current user profile |

### Users — `/users` 🔒 OWNER+
CRUD: `GET /users`, `POST /users`, `GET/PATCH/DELETE /users/:id`

### Dashboard — `/dashboard` 🔒 PHARMACIST+
| Method | Path | Notes |
|---|---|---|
| GET | `/dashboard/summary` | All stat cards in one call |
| GET | `/dashboard/charts/revenue?range=30d` | Revenue timeseries |
| GET | `/dashboard/charts/sales-purchases?range=12m` | Comparison series |
| GET | `/dashboard/charts/top-medicines?limit=10` | By qty & value |
| GET | `/dashboard/charts/customers?range=12m` | New vs returning |

### Inventory — `/medicines`, `/categories`, `/brands`, `/batches`, `/stock` 🔒
| Method | Path | Role | Notes |
|---|---|---|---|
| GET | `/medicines` | any | search, category/brand/lowStock/expired filters, paginated |
| POST | `/medicines` | INV_MGR+ | |
| GET | `/medicines/:id` | any | includes batches + stock summary |
| PATCH | `/medicines/:id` | INV_MGR+ | |
| DELETE | `/medicines/:id` | OWNER | soft delete |
| GET | `/medicines/barcode/:code` | any | POS barcode lookup (exact) |
| GET/POST/PATCH/DELETE | `/categories`, `/brands` | INV_MGR+ | simple CRUD |
| GET | `/batches?medicineId=&nearExpiry=&expired=` | any | batch listing |
| POST | `/stock/adjustments` | INV_MGR+ | signed qty + reason; writes ledger |
| GET | `/stock/adjustments` | INV_MGR+ | history |
| GET | `/stock/ledger?medicineId=&batchId=` | INV_MGR+ | movement journal |
| GET | `/stock/alerts` | any | low-stock + near-expiry + expired lists |

### Billing — `/sales` 🔒 CASHIER+
| Method | Path | Notes |
|---|---|---|
| POST | `/sales` | POS checkout: items[{medicineId,batchId,qty,price}], discount, payments[] (split) — transactional |
| GET | `/sales` | filters: date range, customer, paymentStatus, cashier |
| GET | `/sales/:id` | full invoice detail |
| GET | `/sales/:id/pdf` | A4 invoice PDF |
| GET | `/sales/:id/receipt` | 80mm thermal receipt PDF |
| GET | `/sales/:id/whatsapp` | wa.me share link with invoice summary |
| POST | `/sales/:id/payments` | collect outstanding (split-capable) |
| POST | `/sales/:id/returns` | items[{saleItemId,qty}] → restock + refund, transactional |
| GET | `/returns` | return history |

### Customers — `/customers` 🔒 CASHIER+
CRUD + extras: `GET /customers/:id/history` (purchases), `GET /customers/:id/outstanding`,
`POST /customers/:id/prescriptions` (multipart upload), `GET /customers/:id/prescriptions`,
`POST /customers/:id/payments` (due collection), `GET /customers/analytics` (OWNER+)

### Suppliers — `/suppliers` 🔒 INV_MGR+
CRUD + `GET /suppliers/:id/purchases`, `GET /suppliers/:id/outstanding`, `GET /suppliers/reports`

### Purchases — `/purchases` 🔒 INV_MGR+
| Method | Path | Notes |
|---|---|---|
| POST | `/purchases` | Create order (status ORDERED) |
| POST | `/purchases/:id/receive` | GRN: creates batches, stock in, ledger — transactional |
| POST | `/purchases/:id/payments` | supplier payment |
| POST | `/purchases/:id/invoice-file` | multipart upload of supplier bill |
| GET | `/purchases`, `/purchases/:id`, `/purchases/:id/pdf` | list/detail/PO PDF |
| PATCH | `/purchases/:id` | edit while ORDERED; cancel via status |

### Samples — `/patients`, `/samples` 🔒 PHARMACIST+
Patients CRUD; `POST /samples` (generates sampleNumber + barcode),
`PATCH /samples/:id/status` (REGISTERED→COLLECTED→TESTING→COMPLETED→REPORT_READY),
`POST /samples/:id/report` (upload), `GET /samples?status=`

### Reports — `/reports` 🔒 PHARMACIST+ (financial: OWNER+)
`GET /reports/{sales|purchases|stock|profit|gst|expiry|customers|suppliers}`
Common params: `from`, `to`, `groupBy=day|month`. Every report supports
`&format=json|pdf|excel` — same data, three renderers.

### Notifications — `/notifications` 🔒
`GET /notifications?unread=true`, `PATCH /notifications/:id/read`, `POST /notifications/read-all`

### Email — `/email` 🔒 PHARMACIST+
`POST /email/invoice/:saleId`, `POST /email/report` (attaches PDF), `POST /email/purchase-order/:purchaseId`

### Settings — `/settings` 🔒 OWNER+
`GET /settings`, `PATCH /settings` (pharmacy profile, GST defaults, receipt footer, near-expiry window)

### Audit — `/audit-logs` 🔒 OWNER+
`GET /audit-logs?entityType=&userId=&from=&to=` (paginated, read-only)

## Role Shorthand

`CASHIER+` = CASHIER, PHARMACIST, OWNER, SUPER_ADMIN · `INV_MGR+` = INVENTORY_MANAGER, PHARMACIST*, OWNER, SUPER_ADMIN · exact matrix lives in `shared/constants/permissions.ts` and mirrors [ARCHITECTURE.md](ARCHITECTURE.md#5-rbac-model).
