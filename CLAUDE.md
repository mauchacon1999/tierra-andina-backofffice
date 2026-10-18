# CLAUDE.md — Tierra Andina

Administrative system for **Tierra Andina**, a fruit and vegetable shop in Caracas, Venezuela.
It replaces the notebook, WhatsApp and Excel workflow: purchases at the wholesale market,
cost and price calculation, daily cash closings, expenses, debts and weekly reports.
Business context and phases live in `docs/plan.md`. Read it before starting a new feature.

> **Current state (2026-10-18):** monorepo, full database schema in `@ta/db` (35 tables,
> migrations, idempotent seed, integration tests), Hono API with `/health`, Better Auth
> (`/api/auth/*`), `requireRole`, audit helper and `GET /api/v1/me`; Next.js status page.
> Web: login (`/login`), session-protected home. The owner sees this week's
> collected cash, deposited cash, open debts, fiado balances and real alerts
> (`GET /api/v1/home`); there is no bank balance.
> Modules done: **products** (core rules + pricing, validators, `/api/v1/products`, owner screens
> `/products`, `/products/new`, `/products/[id]`); **store settings** (`/api/v1/settings`);
> **daily rates** (BCV, Coche, sale: `/api/v1/exchange-rates`, owner screen `/rates`);
> **purchase trips** (`/api/v1/purchase-trips`, `/api/v1/suppliers`, owner screens `/purchases`,
> `/purchases/[id]`: one open trip at a time (close it first; the home screen links to it),
> the shopping list on the trip (Comprar opens that product's line), add products one after another — optional
> crates, quantity, price in dollars or in bolívares at the Coche rate, shrinkage copied from the product —
> live costing, close). **i18n**: next-intl in the web (es-VE messages, typed keys, no hard-coded text) and
> validation message tokens shared with the API. **Backoffice**: sidebar shell, DataTable
> (TanStack Table) on every list. **Truck receipt**: `/receipt` for receiver and owner
> (`/api/v1/receipts`, `PATCH …/lines/:lineId/receipt`), grouped into still to buy, on the way and received, with a check that marks a line received. Live pending count on the trip.
> **Shopping list**: `/shopping-list` — what to buy before Coche; a purchase line checks it off.
> **Price list**: closing a trip publishes `/prices` (`GET /api/v1/price-lists/current`).
> A sale-rate change that moves a rounded Bs price proposes a list the owner approves
> (`GET/POST /api/v1/price-lists/proposal`, `/prices/proposal`). A BCV change only warns.
> **Daily close** (phase 2): `/close` (manager/owner: amounts only, each in its currency; the date is
> today and only the owner can change it; lote,
> credit sales, expenses) and `/closes` (owner: list like the Excel, filter by week, month or dates, chips with that period's sales in Bs and in dollars, correct, approve or delete; pending
> counter in the menu) — `/api/v1/daily-closes`, `/payment-methods`, `/customers`.
> **Tasks**: `/tasks` (owner and manager assign a name, description and person, and can
> reassign; high priority is an orange border and a flag and stays first; pending is blue,
> in progress violet, observation amber, finished green; a receiver can change the status)
> — `/api/v1/tasks`.
> **Users**: `/users` (owner: create managers/receivers, edit, deactivate, set passwords;
> users never change their own) — `/api/v1/users`.
> **Home** (`GET /api/v1/home`, owner): week result from daily closes (USD and Bs
> apart), cash marked deposited versus kept, open payables, fiado balances, and
> alerts only when the row exists.
> Next (docs/plan.md): phase 1 leftovers (push,
> offline) and phase 3 (debts, expenses, payroll).
> Business rules and DB design: `docs/domain-model.md`; working with the DB: `docs/database.md`;
> per-module specs: `docs/modules/`.

---

## 1. Stack

| Layer                     | Choice                                                                      |
| ------------------------- | --------------------------------------------------------------------------- |
| Runtime / package manager | Bun (workspaces) + Turborepo                                                |
| API                       | Hono on Bun — `apps/api`, port 4000                                         |
| Frontend                  | Next.js App Router + TypeScript + Tailwind — `apps/web`, port 3000          |
| Database                  | PostgreSQL 16 (Docker)                                                      |
| ORM                       | Drizzle ORM + drizzle-kit (postgres.js driver)                              |
| Validation                | Zod (shared schemas in `@ta/validators`)                                    |
| Server state (web)        | SWR                                                                         |
| Client state (web)        | Zustand                                                                     |
| Forms (web)               | React Hook Form + `@hookform/resolvers/zod`                                 |
| i18n (web)                | next-intl (one locale, es-VE; no locale in the URL)                         |
| Decimal math              | decimal.js                                                                  |
| Tests                     | `bun test` (core, validators, api) · Vitest + Testing Library + jsdom (web) |

Do not add, replace or remove a dependency without asking first and explaining why.

---

## 2. Repository structure

```
tierra-andina/
├── apps/
│   ├── api/                 # Hono API (the only thing that touches the database)
│   └── web/                 # Next.js frontend (talks to the API over HTTP only)
├── packages/
│   ├── core/                # @ta/core — pure business logic, no I/O
│   ├── db/                  # @ta/db — Drizzle schema, migrations, client
│   ├── validators/          # @ta/validators — Zod schemas + inferred types
│   └── tsconfig/            # @ta/tsconfig — shared TS config (base, bun, nextjs)
├── docker/
│   └── postgres/init/       # creates the <POSTGRES_DB>_test database on a fresh volume
├── scripts/                 # repo-level scripts (root `bun test` guard)
├── docs/
│   ├── plan.md              # business plan and phases
│   ├── domain-model.md      # business rules and database design (source of truth)
│   ├── database.md          # migrations, reset, seed, DB tests, tables per area
│   ├── design-system.md     # colors, buttons, forms, validation, feedback — UI rules
│   ├── modules/             # per-module specs (products.md, …)
│   └── api.http             # request examples per endpoint
├── docker-compose.yml
├── bunfig.toml              # root-only: blocks `bun test` at the root (use `bun run test`)
├── .env.example             # single env file for the whole monorepo (copy to .env)
└── CLAUDE.md
```

Dependency direction (never the other way around):

```
apps/web        ──► @ta/validators, @ta/core
apps/api        ──► @ta/db, @ta/validators, @ta/core
@ta/validators  ──► @ta/core   (schemas are refined with the core rules)
@ta/db          ──► (nothing internal)
@ta/core        ──► (nothing internal)
```

---

## 3. Commands

```bash
bun install              # install everything
bun run db:up            # start PostgreSQL (waits until healthy)
bun run db:down          # stop PostgreSQL (data is kept in the volume)
bun run db:ping          # check the main and test databases respond
bun dev                  # api + web in watch mode
bun run test             # all tests (Turborepo: bun test per package, Vitest for web)
bun run typecheck        # tsc across the monorepo
bun run lint             # eslint
bun run format           # prettier --write
bun run build            # production build
bun run db:generate      # generate migration from schema changes
bun run db:migrate       # apply migrations
bun run db:reset         # DROP everything in the main DB and re-apply migrations (local only)
bun run db:seed          # load initial data (idempotent)
bun run db:studio        # open Drizzle Studio
```

`db:reset` / `db:seed` take `-- --test` to target the test database. Details: `docs/database.md`.

Run a single app: `bun --cwd=apps/api run dev` or `bun --cwd=apps/web run dev`.
Tests of one package: `bun --cwd=packages/core test`, `bun --cwd=apps/web run test`.
`@ta/db` tests (and so `bun run test`) need PostgreSQL running (`bun run db:up`).
`bun test` from the repo root is blocked on purpose (see §15).

---

## 4. Workflow rules (always)

1. **One task at a time.** Do exactly what was asked. If you see something else worth
   changing, mention it at the end instead of doing it.
2. **Plan before big changes.** If a task touches more than ~5 files or changes structure,
   list the plan first and wait for approval.
3. **Every task ships with tests.** No task is done without tests for the new or changed
   behavior (see §11).
4. **Keep docs in sync.** Any change to structure, commands, conventions, endpoints or
   env vars updates the relevant doc in the same task (see §13).
5. **Schema changes always generate a migration.** Never edit an applied migration.
6. **Never commit secrets.** Everything sensitive comes from env vars, validated with Zod.
7. **Definition of done** (§14) must pass before saying a task is finished.

---

## 5. Language

| What                                                                | Language                        |
| ------------------------------------------------------------------- | ------------------------------- |
| Code: identifiers, files, folders, DB tables and columns            | English                         |
| Comments, JSDoc, commit messages, PR descriptions, docs in the repo | English                         |
| User-facing UI text, error messages shown to users (never in code)  | Spanish (Venezuela), §10 i18n   |
| API error `code` values                                             | English, `SCREAMING_SNAKE_CASE` |

### Domain glossary (use these names everywhere)

| Spanish (business)                            | English (code)                             |
| --------------------------------------------- | ------------------------------------------ |
| Jornada de compra                             | `purchase_trip`                            |
| Compra / línea de compra                      | `purchase` / `purchase_line`               |
| Puesto (vendedor en Coche)                    | `stall`                                    |
| Cesta                                         | `crate`                                    |
| Cuenta / rama                                 | `bundle`                                   |
| Rollito                                       | `bunch`                                    |
| Merma                                         | `shrinkage`                                |
| Kilaje útil                                   | `usable_quantity`                          |
| Margen                                        | `margin`                                   |
| Tasa BCV / tasa de venta / tasa del proveedor | `bcv_rate` / `sale_rate` / `supplier_rate` |
| Lista de precios                              | `price_list`                               |
| Cierre diario                                 | `daily_close`                              |
| Fiado (cliente)                               | `customer_credit`                          |
| Abono                                         | `credit_payment`                           |
| Cuenta por pagar / factura por pagar          | `payable`                                  |
| Línea de factura por pagar                    | `payable_line`                             |
| Factura vencida / anulada                     | `overdue` / `voided`                       |
| Bulto / paquete (unidad de factura)           | `sack` / `pack`                            |
| Cuenta de pago móvil del proveedor            | `supplier_payment_account`                 |
| Divisa (efectivo en dólares)                  | `cash_usd`                                 |
| Compra local (proveedor que trae a la tienda) | `purchase_trips.kind = 'local'`            |
| Transferencia                                 | `bank_transfer`                            |
| Gasto fijo / variable                         | `fixed_expense` / `variable_expense`       |
| Recepción en camioneta                        | `truck_receipt`                            |
| Pago móvil                                    | `mobile_payment`                           |
| Punto de venta (tarjeta)                      | `card_terminal`                            |
| Tienda                                        | `store`                                    |
| Dueño / encargado / receptor                  | `owner` / `manager` / `receiver`           |
| Reclamo al puesto (mercancía faltante)        | `supplier_claim`                           |
| Lista de faltantes (compras del jueves)       | `shopping_list_item`                       |
| Tarea                                         | `task`                                     |
| Tasa de cambio                                | `exchange_rate`                            |
| Tasa de Coche (mercado mayorista del día)     | `market_rate`                              |
| Nómina / adelanto                             | `payroll_payment` / `salary_advance`       |

If a new domain term appears, add it here before using it.

---

## 6. TypeScript

- `strict: true` everywhere. No `any`. Use `unknown` and narrow it.
- No `@ts-ignore`. If truly unavoidable, use `@ts-expect-error` with a comment explaining why.
- Types for inputs and outputs come from Zod: `type CreateProduct = z.infer<typeof createProductSchema>`.
  Never write a type by hand that duplicates a schema.
- Use `type` for unions and object shapes; `interface` only when extension is needed.
- No TypeScript `enum`. Use `as const` objects or string literal unions.
- Exported functions declare their return type.
- Prefer `satisfies` over type assertions. Avoid `as` except at trusted boundaries.
- Prefer early returns over nested conditionals.
- No default exports, except where a framework requires them (Next.js `page.tsx`,
  `layout.tsx`, etc.).

---

## 7. Money and numbers (critical)

- Money, rates, kilos, quantities and margins are `numeric(14,4)` in PostgreSQL.
  **Never** `float`, `real` or `double precision`.
- In TypeScript they travel as `string` and every calculation uses `decimal.js`.
  Never use `Number()`, `parseFloat()` or `+` on these values.
- Every stored amount keeps its USD value, its Bs value and the rate used — **except the daily
  close** (and the credit sales and expenses written in it): amounts only, each in its own
  currency, no rate (owner decision; domain-model §5). Never add Bs and USD together.
- All calculation rules live in `@ta/core` (§8). The API and the web never reimplement them.
- Input amounts are validated with `@ta/validators` (`amountSchema`: string, `.` as decimal
  separator, ≥ 0, max 4 decimals, max 10 integer digits so it fits `numeric(14,4)`).
- Results are returned in plain notation (`Decimal#toFixed()`), never exponential.

---

## 8. `@ta/core` — business logic

- Pure functions only: no database, no HTTP, no `Date.now()`, no env vars.
  Pass time and config in as arguments.
- One file per concept: `pricing.ts`, `rates.ts`, `daily-close.ts`, `rounding.ts`.
- Every exported function has JSDoc (what it computes, units, rounding behavior)
  and tests covering normal cases, edge cases and errors.
- Throw typed domain errors (`ShrinkageExceedsQuantityError`, etc.), never plain strings.

---

## 9. Backend — `apps/api`

### Structure (by module)

```
apps/api/src/
├── index.ts                 # server bootstrap (the only file that reads env and wires @ta/db)
├── app.ts                   # createApp(deps): Hono instance, global middleware, route mounting
├── env.ts                   # Zod-validated environment
├── lib/                     # cross-cutting: errors, validate(), logger, pagination, auth client
├── middleware/              # auth, roles, audit, error handler, request id
├── routes/                  # infrastructure routes: /health, /api/v1 router mount
└── modules/
    └── products/
        ├── products.routes.ts       # HTTP only: validate, call service, shape response
        ├── products.service.ts      # business orchestration, transactions, calls core
        ├── products.repository.ts   # Drizzle queries only
        ├── products.mapper.ts       # DB row ⇄ API DTO (optional)
        └── products.test.ts         # integration tests for this module
```

`createApp` receives its dependencies (`webOrigin`, `pingDb`, `db`, `auth`) instead of reading
env, so tests build the real app in memory with `app.request(...)` against the test database:
`createTestApp()`, `createUser()`, `createStore()` and `signIn()` in `src/testing/test-app.ts`.
API tests need PostgreSQL running; their preload resets and seeds `DATABASE_URL_TEST`.

### Auth, roles and audit

- **Better Auth** (`lib/auth.ts`) serves `/api/auth/*` (sign-in/email, sign-out, get-session)
  with an httpOnly session cookie. Sign-up is disabled: the seed creates the owner and the
  owner will create the other users. Its errors are rewritten to the unified format with
  Spanish messages (`toUnifiedAuthResponse`); add new codes to `AUTH_ERROR_MESSAGES`.
- Every `/api/v1/*` request runs `sessionMiddleware` (`c.get("user")` is the user or `null`).
- `requireAuth` → 401 `UNAUTHENTICATED`. `requireRole("owner", …)` → resolves the store from
  the `X-Store-Id` header or the user's only active membership; 400 `STORE_REQUIRED` when the
  user has several stores and sent no header; 403 `FORBIDDEN` otherwise.
- In handlers use `getMembership(c)` (store + role) and `getActor(c)`; pass the `Actor` to the
  service, which calls `recordAudit(tx, actor, { tableName, recordId, action, changes })` in
  the same transaction as the write (`diffChanges(before, after)` for updates).

### Layer rules

| Layer             | May                                                                        | Must not                                                 |
| ----------------- | -------------------------------------------------------------------------- | -------------------------------------------------------- |
| `*.routes.ts`     | Validate with `zValidator`, read auth context, call a service, return JSON | Query the DB, contain business rules                     |
| `*.service.ts`    | Call repositories and `@ta/core`, open transactions, throw `AppError`      | Know about Hono `Context`, HTTP status codes             |
| `*.repository.ts` | Run Drizzle queries, accept an optional transaction                        | Contain business rules, call other modules' repositories |

- Routes live under `/api/v1/<module>` with plural kebab-case names (`/api/v1/price-lists`).
- Validate with `validate(target, schema)` from `lib/validate.ts` (a `zValidator` wrapper):
  plain `zValidator` would answer with its own error shape instead of the unified one.
- Errors: throw `AppError(code, message, status?, details?)` from `lib/errors.ts`
  (status defaults to 400). The error middleware turns every error into
  `{ error: { code, message, details? } }`; unknown errors become `500 INTERNAL_ERROR`
  and unknown routes `404 NOT_FOUND`. The shape is `apiErrorSchema` in `@ta/validators`.
- Lists are paginated: `{ data, total, page, pageSize }`.
- Multi-table writes run inside a transaction opened by the service.
- Every write to an editable table is audited with `recordAudit` (see "Auth, roles and audit").
- Repositories take an `Executor` (`Database | Transaction` from `@ta/db`) as first argument.
- Authorization is enforced in routes with `requireRole(...)`, never only in the frontend.

---

## 10. Frontend — `apps/web`

### Structure (by feature)

```
apps/web/src/
├── app/                         # routes only — thin pages that compose features
│   ├── login/                   # outside the shell
│   └── (app)/                   # signed-in screens: SessionGate + AppShell (sidebar)
│       ├── (owner)/             # owner screens (RoleGate)
│       ├── (manager)/           # shop manager screens
│       └── (receiver)/          # truck receiver screens
├── components/
│   ├── ui/                      # primitives (button, input, dialog) — no business logic
│   └── shared/                  # reusable composites (money-input, rate-badge, page-header)
├── features/
│   └── purchases/
│       ├── components/          # feature-specific components
│       ├── hooks/               # use-purchase-form.ts, use-purchase-totals.ts
│       ├── api/                 # SWR hooks + request functions for this feature
│       ├── store/               # Zustand store, only if the feature needs client state
│       ├── helpers/             # pure helpers tied to this feature's UI
│       └── types.ts             # UI-only types (API types come from @ta/validators)
├── hooks/                       # global hooks (use-media-query, use-online-status)
├── i18n/                        # next-intl: config, messages/<locale>.json, request.ts, hooks
├── lib/                         # api client, SWR config, query keys, auth session
├── stores/                      # global Zustand stores (session, offline queue)
└── utils/                       # generic pure functions (cn, format-date, format-money)
```

- **UI follows `docs/design-system.md`**: colors only through the semantic tokens of
  `app/globals.css` (`bg-primary`, `text-muted`, `text-danger-text`…; no palette classes and no
  `dark:` color classes — `src/design-system.test.ts` fails otherwise), primitives from
  `components/ui/` (`Button`, `ButtonLink`, `TextField`, `SelectField`, `SelectMenu`, `ComboboxField`, `SegmentedControl`,
  `Checkbox`, `Alert`, `Card`, `Badge`, `Spinner`, `ConfirmButton`, `Dialog`, `IconButton`,
  `Tooltip`). Icons: `lucide-react`, always `aria-hidden` next to a text or an accessible name.
- **Lists of records use `DataTable`** (`components/shared/data-table/`, TanStack Table v9;
  rules in design-system §3.3): columns as `DataColumn[]` built in a feature hook
  (`use-product-table.tsx`), memoized; paginated lists sort on the server (`sort` query param),
  fully loaded ones in the browser. Table on desktop, cards on phones (`useMediaQuery`,
  `hooks/use-media-query.ts`). Row actions with `confirm` open a `ConfirmDialog`.
- **Backoffice shell**: every signed-in page lives under `app/(app)/`, whose layout renders
  `SessionGate` + `AppShell` (`features/navigation`): sidebar on desktop (collapsible to icons,
  preference in `stores/use-ui-store.ts`), top bar + drawer on phones. Pages render only their
  content (title, cards); no `<main>` or page container of their own. A new section gets its
  menu entry in `features/navigation/helpers/nav-items.ts` (with the roles that see it).
  Owner-only screens live under `app/(app)/(owner)/` (its layout wraps them in `RoleGate`).
- The web never imports `@ta/db`, `drizzle-orm` or `postgres`: ESLint (`no-restricted-imports`
  in `apps/web/eslint.config.mjs`) fails the lint if it does.
- All HTTP goes through `lib/api.ts` (`api.get/post/...`). It throws a typed `ApiError`
  (`status`, `code`, `message`, `details`, `requestId`; `status: 0` with `NETWORK_ERROR` /
  `TIMEOUT` when the API did not answer) and validates responses when given a Zod schema.
  It sends cookies (`credentials: "include"`) and the active store as `X-Store-Id`
  (`stores/use-session-store.ts`).

### Session in the web

- `features/auth`: `useMe()` (GET /api/v1/me via SWR, `isUnauthenticated` on a settled 401),
  `useSignIn()`, `useSignOut()`, `useSignInForm()` (React Hook Form + `signInSchema`).
- Protected screens wrap their content in `<SessionGate>` and read the user with
  `useRequireSession()`: it redirects to `/login` on 401 and keeps `activeStoreId` pointing at a
  store the user belongs to (`activeMembership` has `storeId`, `storeName`, `role`).
- The session itself is an httpOnly cookie set by the API; the web never stores tokens.
- Only the active store id lives in Zustand (persisted); the user and memberships stay in SWR.
- Role labels for the UI: `auth.roles.<role>` messages.

### Where does this code go?

| Code                                             | Location                      |
| ------------------------------------------------ | ----------------------------- |
| Business calculation (price, cost, close totals) | `@ta/core` — never in the web |
| Generic, domain-free pure function               | `src/utils/`                  |
| Pure function tied to one feature's UI           | `features/<f>/helpers/`       |
| Stateful logic, effects, derived state           | a hook (`use-*.ts`)           |
| Data fetching / mutations                        | `features/<f>/api/` with SWR  |
| Client-only shared state                         | Zustand store                 |
| Visual primitive                                 | `components/ui/`              |
| Reusable composite used by 2+ features           | `components/shared/`          |
| Component used by one feature                    | `features/<f>/components/`    |

### Components

- Function components, named exports, one component per file.
- Files in kebab-case (`purchase-line-row.tsx`); components in PascalCase (`PurchaseLineRow`).
- Props type named `<Component>Props`, declared right above the component.
- **Components render; hooks think.** Any logic beyond trivial display goes into a hook.
  A component should mostly be: call hooks → return JSX.
- No `fetch` or SWR calls directly in components; use the feature's API hooks.
- Keep components under ~150 lines. Split when larger.
- Server Components by default for static layout; mark `"use client"` only where needed
  (interactivity, SWR, Zustand, browser APIs).
- Mobile-first Tailwind. Use `cn()` from `utils/cn.ts` for conditional classes.
- Forms: React Hook Form + `useZodResolver(schema)` (`@/i18n/use-zod-resolver`, never plain
  `zodResolver`) with schemas from `@ta/validators`.

### Text and i18n (next-intl)

- **No UI text in code.** Every string users read lives in
  `src/i18n/messages/es-VE.json`, grouped by feature (`purchases.line.margin`). Components and
  hooks use `useTranslations("namespace")`; Server Components (pages, `generateMetadata`)
  use `await getTranslations()`. Keys are typed (`src/i18n/next-intl.d.ts`): a missing key
  fails `tsc`. `src/i18n/no-hardcoded-text.test.ts` fails on JSX text, text props
  (`label="…"`) and sentence literals. Unit symbols (`$`, `Bs`, `%`) may stay inline.
- Plurals and agreement use ICU (`{count, plural, one {# compra} other {# compras}}`). Never
  pass a decimal through `Number()` for that: compare with `compareDecimals` and use a `select`
  (`units.packsCount`).
- **Validation messages are tokens.** `@ta/validators` schemas emit `message("decimal.positive",
{ subject: "rate" })` → `"decimal.positive|subject=rate"`; the Spanish catalog is
  `VALIDATION_MESSAGES_ES_VE` (`packages/validators/src/messages.ts`). The web gets it as the
  `validation` namespace and `useZodResolver` formats the tokens; the API formats them in the
  error middleware (`lib/localize-details.ts`), so its responses stay in Spanish. New schema
  messages go into that catalog, never as literal text.
- Request errors: `useErrorMessage()(error, fallback)` — translated `apiErrors.<code>` for the
  client's own codes (`NETWORK_ERROR`, `TIMEOUT`, `INVALID_RESPONSE`), the API's (Spanish)
  message otherwise. `lib/api.ts` messages are technical (logs), never shown as-is.
- Numbers and dates are formatted with `LOCALE` from `src/i18n/config.ts`
  (`utils/format-number.ts`, `utils/format-date.ts`).
- Pure helpers that build text receive the labels/translator from a hook
  (`describeProduct(product, useUnitLabels())`).

### Data fetching with SWR

- One global `SWRConfig` in `lib/swr-config.tsx` with the shared fetcher and error handling.
- Query keys come from a key factory in `lib/query-keys.ts`, never inline strings:
  ```ts
  export const queryKeys = {
    products: {
      all: ["products"] as const,
      list: (params: ProductListParams) => ["products", "list", params] as const,
      detail: (id: string) => ["products", "detail", id] as const,
    },
  };
  ```
- Reads: `useSWR`. Writes: `useSWRMutation`. After a mutation, revalidate the affected keys.
- Wrap each endpoint in a named hook: `useProducts()`, `useCreateProduct()`.
- Use optimistic updates only where the UX clearly benefits (e.g. truck receipt status).

### Client state with Zustand

- **Server data lives in SWR. Never copy API data into Zustand.**
- Zustand is for client-only state: session/user role, purchase draft before sending,
  offline queue, UI preferences.
- One store per domain (`use-session-store.ts`, `use-offline-queue-store.ts`).
- Always read with selectors: `useSessionStore((s) => s.role)`, never the whole store.
- Use `persist` only for state that must survive reloads (offline queue, drafts).
- Actions live inside the store; components never mutate state directly.

---

## 11. Testing

- **Every task includes tests** for what it adds or changes. A bug fix starts with a
  failing test that reproduces the bug.
- Test files sit next to the code: `pricing.ts` → `pricing.test.ts`.
- `@ta/core`: unit tests for every exported function, including edge cases and errors.
  Use real business examples (see `docs/plan.md`), with exact decimal expectations.
- `apps/api`: integration tests per endpoint against `DATABASE_URL_TEST`, covering at least:
  success, validation error, permission denied, not found.
- `@ta/db`: every CHECK and UNIQUE constraint has a test (meta-tests enforce it). Reuse
  `src/testing/` (`inRollback`, `expectPgError`, `createBase`, `valid.*`) — also from the API's
  integration tests.
- `apps/web`: tests for hooks with logic and for critical components
  (forms, totals, status changes). Test behavior, not implementation details.
- Test names describe behavior: `it('rounds the sale price up to the next 0.05 USD')`.
- Tests must be deterministic: no real time, no random data without a fixed seed.

---

## 12. Comments and naming

- Comments in English. Explain **why**, not what the code already says.
- JSDoc on every exported function in `@ta/core`, services and shared hooks.
- `TODO` format: `// TODO(ender): <what and why>`. No anonymous TODOs.
- No commented-out code. Delete it; Git remembers.

| Thing                 | Convention                | Example                           |
| --------------------- | ------------------------- | --------------------------------- |
| Files and folders     | kebab-case                | `daily-close.service.ts`          |
| Components, types     | PascalCase                | `DailyCloseForm`, `PriceListLine` |
| Functions, variables  | camelCase                 | `calculateUnitCost`               |
| Hooks                 | `use` + camelCase         | `usePurchaseTotals`               |
| Zustand stores        | `use<Name>Store`          | `useOfflineQueueStore`            |
| Constants             | SCREAMING_SNAKE_CASE      | `DEFAULT_MARGIN`                  |
| Zod schemas           | camelCase + `Schema`      | `createProductSchema`             |
| DB tables and columns | snake_case, plural tables | `purchase_lines.unit_cost_usd`    |
| Booleans              | `is`/`has`/`can` prefix   | `isPublished`, `hasCredit`        |

- Imports: use path aliases (`@/features/...` in web, `@/modules/...` in api).
  Order: external packages → internal `@ta/*` → aliases → relative.
- Barrel files (`index.ts`) only at package roots, not inside features.

---

## 13. Keeping docs updated

Update in the **same task** as the change:

| When you change...                             | Update                              |
| ---------------------------------------------- | ----------------------------------- |
| Folder structure, commands, conventions, stack | `CLAUDE.md`                         |
| Setup steps, env vars                          | `README.md` and `.env.example`      |
| Endpoints (new, changed, removed)              | OpenAPI schemas and `docs/api.http` |
| Domain vocabulary                              | Glossary in `CLAUDE.md` §5          |
| Business rules                                 | `docs/plan.md` (and tell the owner) |

At the end of each task, list which docs you updated, or state that none needed changes.

---

## 14. Definition of done

A task is finished only when all of these pass:

- [ ] `bun run typecheck` — no errors
- [ ] `bun run lint` — no errors
- [ ] `bun run test` — all green, including new tests for this task
- [ ] Migration generated if the schema changed
- [ ] Docs updated per §13
- [ ] Short summary given: what changed, which files, which tests, which docs
- [ ] Suggested commit message in Conventional Commits format
      (`feat(purchases): add truck receipt status`)

---

## 15. Technical decisions and gotchas

Things that are not obvious from the code and have already cost time:

- **One `.env` at the repo root.** Every package loads it explicitly
  (`bun --env-file=../../.env`, `process.loadEnvFile` in `next.config.ts`). Do not add per-app
  `.env` files.
- **TypeScript is pinned to `~5.9`.** TS 7 (native) has no JS API, which typescript-eslint and
  Next's type check need. Do not upgrade until typescript-eslint supports it.
- **Workspace packages export TypeScript source** (`"exports": { ".": "./src/index.ts" }`), no
  build step. Bun runs them directly; Turbopack transpiles them (no `transpilePackages` needed).
- **API watch mode runs from the repo root** (`cd ../.. && bun --watch apps/api/src/index.ts`):
  otherwise Bun does not watch `packages/*` and changes there do not reload the API.
- **Next.js env:** `@next/env` cannot load the root `.env` (Next already called it for
  `apps/web` and returns its cache). `next.config.ts` uses `process.loadEnvFile` and pins
  `NEXT_PUBLIC_API_URL` in `env` so it is inlined in both server and client bundles.
- **Next.js 16.4 differs from older versions** (`cacheComponents`, `partialPrefetching`,
  `LayoutProps` globals). Read `apps/web/node_modules/next/dist/docs/` before using a Next API
  (see `apps/web/AGENTS.md`).
- **Test database** `<POSTGRES_DB>_test` is created by `docker/postgres/init` only when the
  volume is created. If you change `POSTGRES_DB`, recreate it: `docker compose down -v`
  (deletes local data).
- **Healthcheck uses TCP** (`pg_isready -h 127.0.0.1`) so the container is not reported healthy
  while the init scripts are still running.
- **`bun dev` stops everything if one app crashes** (Turborepo behavior). Run apps separately
  when debugging one of them.
- **Line endings are LF** (`.gitattributes`); shell scripts mounted into containers break
  with CRLF.
- **Root `bun test` is blocked** by `bunfig.toml` + `scripts/root-bun-test-guard.ts`: Bun's
  runner would also pick up the web tests (they need Vitest + jsdom) and fail. Bun 1.3 has no
  option to exclude paths. Use `bun run test`; the root `bunfig.toml` is not read inside packages.
- **Web tests** run with Vitest (`apps/web/vitest.config.mts`): jsdom, `@` alias and a fake
  `NEXT_PUBLIC_API_URL`, because `lib/env.ts` validates it at import time. Mock `fetch` with
  `vi.stubGlobal`; use fake timers for polling hooks.
- **Path aliases**: `@/` maps to `src/` in both apps (`tsconfig.json` paths; Vitest via
  `resolve.alias`). Bun resolves tsconfig paths at runtime and in `bun build`.
- **Validator middleware return type is inferred** (`apps/api/src/lib/validate.ts`): it carries
  the types behind `c.req.valid()`. This is the one accepted exception to "exported functions
  declare their return type".
- **Database gotchas** (full list in `docs/database.md`): a CHECK that evaluates to NULL
  passes, so required values need `IS NOT NULL`; `numeric(14,4)` is read back padded to 4
  decimals (`"20.0000"`); decimal settings are JSON strings and `createDb` turns off
  postgres.js' JSON parsing so jsonb is parsed only once; ids come from `Bun.randomUUIDv7()`
  (no DB default).
- **New tables use the helpers** in `packages/db/src/schema/_shared.ts` (`id()`, `timestamps`,
  `auditColumns`, `money()`/`rate()`/`quantity()`/`ratio()`) and named constraints
  (`<table>_<rule>_check`, `<table>_<cols>_key`, `<table>_<col>_idx`).
- **Better Auth relaxes security under `NODE_ENV=test`** (bun test sets it): it skips the origin
  (CSRF) check unless `advanced.disableOriginCheck` is set. `createAuth` sets it to `false`
  explicitly so tests exercise production behavior. Check other Better Auth defaults the same
  way before trusting a green test.
- **Test order:** `turbo.json` runs `test` with `dependsOn: ["^test"]`, so `@ta/db` tests finish
  before `@ta/api` tests start; both reset the same test database in their preload.
- **SWR keeps the last error in the cache.** After a mutation that changes what a key returns
  (sign-in → /me), write the fresh value with `mutate(key, fetchFresh(), { revalidate: false })`
  instead of a bare `mutate(key)`: with no screen subscribed, a bare call leaves the old 401 and
  the next screen redirects to /login (regression test: `use-sign-in.test.tsx`).
- **Web layouts in tests**: jsdom has no `matchMedia`; the setup answers "phone" to every
  query, so `DataTable` renders cards. Call `setDesktop(true)` (`src/testing/media.ts`) to test
  the table. jsdom also lacks `<dialog>.showModal()`; the setup polyfills it.
- **TanStack Table v9** wants stable inputs: features at module scope, `columns` memoized and
  a module-level empty array as fallback data (`data ?? []` inline rebuilds the row model on
  every render). Hooks feeding it return stable empties (`NO_DAYS` in `use-daily-rates.ts`).
- **Web test setup** (`apps/web/src/testing/setup.ts`): Testing Library only auto-cleans the DOM
  with Vitest globals, which we do not use, so the setup calls `cleanup()` and clears
  localStorage after each test. Wrap hooks that use SWR in `SwrTestWrapper` (fresh cache, also
  provides the messages); anything that calls `useTranslations` without SWR needs
  `IntlTestWrapper` (real es-VE messages, so tests assert on the texts users read).
- **next-intl and static pages**: `src/i18n/request.ts` must not read `requestLocale`: it calls
  `headers()`, which makes every page dynamic (and errors under `cacheComponents`). With one
  locale the config returns `LOCALE` directly.
- **Rule errors answer 422, shape errors 400.** API routes validate requests with the
  "fields" schemas (`createProductFieldsSchema`…) and the service applies the `@ta/core` rules,
  so rule violations come back with their own code (`INVALID_UNIT_COMBINATION`…). Forms use
  the refined schemas (`createProductSchema`, `productFormSchema`) for instant feedback.
  Rule errors carry `details.fieldErrors` so the web puts them on the right field.
- **Services never pass HTTP statuses.** `new AppError(code, message)`; the status comes from
  `ERROR_STATUS` in `apps/api/src/lib/errors.ts`. Add every new code there.
- **Vitest hooks must not return values**: `beforeEach(() => mock.mockReset())` returns the
  mock, and Vitest calls a returned function as cleanup after the test (a rejecting mock then
  fails the test). Always use a block body: `beforeEach(() => { mock.mockReset(); })`.
- **Percent formatting**: do not use Intl's `style: "percent"` (Node prints "50%", other engines
  "50 %"); use `formatPercentFromFraction` (`utils/format-number.ts`).
- **Drizzle `sql` in correlated subqueries**: a column interpolated in a `sql` template renders
  unqualified (`"id"`), so `WHERE pl.trip_id = ${trips.id}` silently compares the inner table
  with itself. Alias the inner table and qualify the outer column with
  `sql.identifier("purchase_trips")` (see `lineCount` in `purchases.repository.ts`).
- **No nested forms**: a form that offers another form (the purchase line's "Nuevo producto")
  renders it _instead of_ itself; RHF keeps the hidden form's values.
- **Product names**: uniqueness uses `normalizeProductName` (case, accents and spacing ignored)
  but keeps the ñ: "Ñame" and "Name" are different products.
