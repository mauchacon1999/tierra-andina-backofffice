# Database — how to work with it

Practical guide for `@ta/db` (PostgreSQL 16 + Drizzle ORM). The design itself — tables, rules,
constraints — lives in [`domain-model.md` §9](domain-model.md#9-database-design); this file is
about day-to-day work.

## Layout

```
packages/db/
├── drizzle.config.ts          # drizzle-kit: schema → migrations/
├── migrations/                # generated SQL, committed, never edited once applied
├── scripts/                   # db:ping, db:reset, db:seed
└── src/
    ├── client.ts              # createDb(url) + default db/ping/closeDb (DATABASE_URL)
    ├── migrate.ts             # migrateDatabase, resetDatabase, isLocalDatabaseUrl
    ├── seed.ts, seed-data.ts  # idempotent initial data
    ├── schema/                # one file per area (below) + _shared.ts + _enums.ts
    └── testing/               # test DB helpers, fixtures, preload (tests only)
```

## Everyday commands (from the repo root)

| Command                      | What it does                                                         |
| ---------------------------- | -------------------------------------------------------------------- |
| `bun run db:up`              | Start PostgreSQL in Docker and wait until it is healthy              |
| `bun run db:ping`            | Check that the main and the test database answer                     |
| `bun run db:generate`        | Create a migration from schema changes                               |
| `bun run db:migrate`         | Apply pending migrations to the main database                        |
| `bun run db:reset`           | **Drop everything** in the main database and re-apply all migrations |
| `bun run db:seed`            | Load the initial data (idempotent, safe to run twice)                |
| `bun run db:studio`          | Browse the data in Drizzle Studio                                    |
| `bun --cwd=packages/db test` | Integration tests against `DATABASE_URL_TEST`                        |

`db:reset` and `db:seed` accept `--test` to target the test database:
`bun run db:reset -- --test`. `db:reset` refuses to run against a non-local host or with
`NODE_ENV=production`.

Fresh local database: `bun run db:up && bun run db:reset && bun run db:seed`.

## Creating a migration

1. Change the schema in `packages/db/src/schema/<area>.ts`.
2. `bun run db:generate -- --name short_description` → new file in `packages/db/migrations/`.
3. Read the generated SQL. Rename/drop operations may prompt: answer carefully. drizzle-kit
   asks whenever one change both adds and removes columns of a table (or enums), and the
   prompt needs a TTY: from a non-interactive shell, split it into an additive migration
   (keep the old columns for a moment) and a second one that only drops
   (`0013_payables` + `0014_payables_drop_old`).
4. `bun run db:migrate` (main database). The test database is reset and migrated automatically
   on every `bun --cwd=packages/db test`.
5. Add or update tests (`src/schema/*.test.ts`) and update `domain-model.md` §9.
6. Commit the schema change and the migration together.

**Never edit a migration that was already applied or committed** — generate a new one, even to
fix a mistake (see `0003_fix_products_pack_quantity_check.sql`).

## Conventions in the schema

- **Helpers** (`schema/_shared.ts`): `id()` (UUID v7 via `Bun.randomUUIDv7()`, no DB default),
  `timestamps`, `auditColumns`, and `money()` / `rate()` / `quantity()` / `ratio()` for
  `numeric(14,4)` columns returned as strings. Use them for every new table.
- **Enums** live in `schema/_enums.ts`. Values the owner must extend are tables instead.
- **Constraint names** are explicit: `<table>_<rule>_check`, `<table>_<columns>_key`,
  `<table>_<column>_idx`. Tests assert on these names.
- **Relations** are declared next to the tables of each area; an area may add relations to a
  table from another area under a distinct name (Drizzle merges them).
- **Indexes**: every foreign key leads an index (except `created_by`/`updated_by`) and every
  `business_date` is indexed.

## Gotchas

- **NULL in CHECK constraints passes.** `x > 0` is NULL when `x` is NULL, and a CHECK that
  evaluates to NULL is accepted. Write `x IS NOT NULL AND x > 0` when the value is required.
- **numeric comes back with 4 decimals**: `"20"` is read as `"20.0000"`. Compare amounts with
  decimal.js, never with string equality on user input. A 5th decimal is rounded by
  PostgreSQL, so validators must reject it first (`amountSchema`); more than 10 integer digits
  is an error.
- **jsonb is parsed once.** `createDb` disables postgres.js' own JSON parsing so the JSON string
  `"0.05"` is not turned into the number `0.05` by a second parse in Drizzle. Store decimal
  settings as JSON strings.
- **IDs are generated in the app.** A raw `INSERT` from psql must provide `id` itself
  (PostgreSQL 16 has no `uuidv7()`).
- **Seed and test DB.** The test database is created by `docker/postgres/init` only when the
  Docker volume is new. Tests refuse to run unless `DATABASE_URL_TEST` is local and its name
  ends in `_test`, because the test preload drops and re-creates its schema on every run.

## Tests

`bun --cwd=packages/db test` (also part of `bun run test`) needs PostgreSQL running. The preload
(`src/testing/preload.ts`) resets and seeds the test database once per run; each test runs in a
transaction that is rolled back, and every invalid write runs in a savepoint.

| File                                    | Proves                                                                   |
| --------------------------------------- | ------------------------------------------------------------------------ |
| `src/schema/check-constraints.test.ts`  | every CHECK accepts a valid row and rejects each invalid case            |
| `src/schema/unique-constraints.test.ts` | every UNIQUE rejects duplicates (incl. BCV rate with NULL store)         |
| `src/schema/numeric.test.ts`            | `numeric(14,4)` round-trips exactly as strings ("0.9091" stays "0.9091") |
| `src/client.test.ts`                    | jsonb keeps strings, numbers, booleans and objects with their type       |
| `src/seed.test.ts`                      | the seed creates exactly §9.10 and is idempotent                         |

Both constraint suites start with a meta-test that compares the constraints in the database
with the tested ones: adding a CHECK or UNIQUE without a test fails the suite.

## Tables per area

| Area               | File                     | Tables                                                                                                                                          |
| ------------------ | ------------------------ | ----------------------------------------------------------------------------------------------------------------------------------------------- |
| Auth (Better Auth) | `schema/auth.ts`         | `users`, `sessions`, `accounts`, `verifications`                                                                                                |
| Organization       | `schema/organization.ts` | `stores`, `memberships`, `settings`, `push_subscriptions`, `audit_logs`                                                                         |
| Catalog            | `schema/catalog.ts`      | `product_categories`, `products`, `suppliers`, `supplier_payment_accounts`                                                                      |
| Exchange rates     | `schema/rates.ts`        | `exchange_rates`                                                                                                                                |
| Purchasing         | `schema/purchasing.ts`   | `purchase_trips`, `purchase_lines`, `supplier_claims`, `shopping_list_items`                                                                    |
| Tasks              | `schema/tasks.ts`        | `tasks`                                                                                                                                         |
| Pricing            | `schema/pricing.ts`      | `price_lists`, `price_list_lines`                                                                                                               |
| Daily close        | `schema/daily-close.ts`  | `payment_methods`, `daily_closes`, `daily_close_payments`                                                                                       |
| Finance            | `schema/finance.ts`      | `customers`, `customer_credit_entries`, `payables`, `payable_lines`, `payable_payments`, `expense_categories`, `recurring_expenses`, `expenses` |
| Payroll            | `schema/payroll.ts`      | `employees`, `payroll_payments`, `salary_advances`                                                                                              |

35 tables in total. Migrations live in `packages/db/migrations/` (`bun run db:migrate`
applies the pending ones; the journal is `migrations/meta/_journal.json`).

## Better Auth

The auth tables mirror `getAuthTables()` of better-auth 1.7.x (email + password). When the auth
instance is created in `apps/api`, configure:

```ts
betterAuth({
  database: drizzleAdapter(db, { provider: "pg", usePlural: true, schema }),
  emailAndPassword: { enabled: true },
  advanced: { database: { generateId: () => Bun.randomUUIDv7() } },
});
```

After upgrading better-auth, compare its tables with `schema/auth.ts` (field names, nullability,
indexes) and generate a migration if anything changed. Its CLI (`@better-auth/cli generate`)
does not install on Windows without native build tools (better-sqlite3), so the schema was
written from `getAuthTables()` output.
