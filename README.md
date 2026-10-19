# Tierra Andina

Administrative system for Tierra Andina, a fruit and vegetable shop in Caracas.
Monorepo with a Hono API (Bun), a Next.js web app and PostgreSQL.

Conventions and rules for contributors (and AI agents) live in [CLAUDE.md](CLAUDE.md).

## Requirements

- [Bun](https://bun.sh) 1.3+
- [Docker](https://www.docker.com/) with Docker Compose (Docker Desktop on Windows/macOS)
- Free ports: 3000 (web), 4000 (API), 5432 (PostgreSQL)

## 1. Install

```bash
bun install
cp .env.example .env       # adjust values if needed; .env is never committed
```

All apps read this single root `.env`:

| Variable                                            | Used by           | Example                                                     |
| --------------------------------------------------- | ----------------- | ----------------------------------------------------------- |
| `POSTGRES_USER`, `POSTGRES_PASSWORD`, `POSTGRES_DB` | docker-compose    | `tierra` / `tierra_dev` / `tierra_andina`                   |
| `DATABASE_URL`                                      | API, Drizzle      | `postgres://tierra:tierra_dev@localhost:5432/tierra_andina` |
| `DATABASE_URL_TEST`                                 | integration tests | `postgres://…/tierra_andina_test`                           |
| `API_PORT`                                          | API               | `4000`                                                      |
| `WEB_ORIGIN`                                        | API (CORS)        | `http://localhost:3000`                                     |
| `NEXT_PUBLIC_API_URL`                               | web               | `http://localhost:4000`                                     |
| `SEED_OWNER_EMAIL`, `SEED_OWNER_PASSWORD`           | `db:seed`         | owner login created by the seed (password ≥ 8 chars)        |
| `SEED_OWNER_NAME` (optional)                        | `db:seed`         | `Dueño`                                                     |
| `BETTER_AUTH_SECRET`                                | API (auth)        | random, ≥ 32 chars (`openssl rand -base64 32`)              |
| `BETTER_AUTH_URL`                                   | API (auth)        | `http://localhost:4000`                                     |

## 2. Start the database

```bash
bun run db:up      # PostgreSQL 16 in Docker; waits until healthy
bun run db:ping    # should print OK for the main and the test database
bun run db:down    # stop it (data persists in the tierra-andina-pgdata volume)
```

The test database (`<POSTGRES_DB>_test`) is created automatically the first time the volume
is initialized. To start from scratch: `docker compose down -v && bun run db:up`
(**deletes all local data**).

Create the schema and load the initial data (store, owner user, settings, payment methods,
categories):

```bash
bun run db:migrate    # apply pending migrations
bun run db:seed       # initial data; safe to run again
```

Other database commands:

```bash
bun run db:generate   # create a migration from schema changes (packages/db/src/schema)
bun run db:reset      # DROP everything in the local DB and re-apply migrations
bun run db:studio     # browse the database
```

`db:reset` and `db:seed` accept `-- --test` for the test database. See
[docs/database.md](docs/database.md) for migrations, conventions and the list of tables.

## 3. Run everything

```bash
bun dev
```

- Web: http://localhost:3000 — shows the API and database status (green/red)
- API: http://localhost:4000/health and http://localhost:4000/health/db
- Sign in at http://localhost:3000/login with the `SEED_OWNER_EMAIL` / `SEED_OWNER_PASSWORD`
  from your `.env` (after `bun run db:seed`). API requests: [docs/api.http](docs/api.http)

One app only: `bun --cwd=apps/api run dev` or `bun --cwd=apps/web run dev`.

## 4. Tests and checks

```bash
bun run test          # all tests (bun test per package, Vitest for the web)
bun run typecheck     # TypeScript (strict) in every package
bun run lint          # ESLint
bun run format:check  # Prettier
bun run build         # production build of API and web
```

API tests build the Hono app in memory (no server) against the **test** database.
The `@ta/db` integration tests need PostgreSQL running (`bun run db:up`): they reset and seed
the **test** database on every run.
Running `bun test` from the root is intentionally blocked; use `bun run test`
(or `bun --cwd=<package> test` for a single package).

## 5. Deploy

The API runs on Railway (a long-running Bun server) and the web on Vercel:

| App | Where   | Settings                                                                              | Environment variables                                                                                             |
| --- | ------- | ------------------------------------------------------------------------------------- | ----------------------------------------------------------------------------------------------------------------- |
| API | Railway | Root Directory: repo root · Build: `bun install` · Start: `bun apps/api/src/index.ts` | `NODE_ENV=production`, `PORT` = `API_PORT`, `DATABASE_URL`, `WEB_ORIGIN`, `BETTER_AUTH_URL`, `BETTER_AUTH_SECRET` |
| Web | Vercel  | Root Directory: `apps/web`                                                            | `API_PROXY_URL` (the Railway URL), `NEXT_PUBLIC_API_URL` (the web's own URL)                                      |

The web proxies `/api/*` to the API (`rewrites` in `apps/web/next.config.ts`): on two different
sites the browser drops the session cookie (Brave and Safari always), so sign-in succeeded and
`/api/v1/me` still answered 401. Through the proxy the cookie is first-party, so
`BETTER_AUTH_URL` and `NEXT_PUBLIC_API_URL` are the **web's** URL and `WEB_ORIGIN` too.
`NEXT_PUBLIC_API_URL` and the rewrites are fixed at build time: redeploy the web after changing them.

With Supabase, `DATABASE_URL` is the **session** pooler (port 5432): postgres.js uses prepared
statements, which the transaction pooler (6543) does not support. Apply migrations and the seed
from your machine with `DATABASE_URL` pointing at the production database.

## Structure

```
apps/api            Hono API on Bun (port 4000)
apps/web            Next.js App Router (port 3000)
packages/core       @ta/core — pure business logic (decimal.js)
packages/db         @ta/db — Drizzle client, schema and migrations
packages/validators @ta/validators — shared Zod schemas
packages/tsconfig   @ta/tsconfig — shared strict TypeScript config
docs/               plan, domain model, database guide, design system, module specs, api.http
```
