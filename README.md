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

## 2. Start the database

```bash
bun run db:up      # PostgreSQL 16 in Docker; waits until healthy
bun run db:ping    # should print OK for the main and the test database
bun run db:down    # stop it (data persists in the tierra-andina-pgdata volume)
```

The test database (`<POSTGRES_DB>_test`) is created automatically the first time the volume
is initialized. To start from scratch: `docker compose down -v && bun run db:up`
(**deletes all local data**).

Migrations:

```bash
bun run db:generate   # create a migration from schema changes (packages/db/src/schema)
bun run db:migrate    # apply pending migrations
bun run db:studio     # browse the database
```

## 3. Run everything

```bash
bun dev
```

- Web: http://localhost:3000 — shows the API and database status (green/red)
- API: http://localhost:4000/health and http://localhost:4000/health/db

One app only: `bun --cwd=apps/api run dev` or `bun --cwd=apps/web run dev`.

## 4. Tests and checks

```bash
bun test              # all tests in the monorepo
bun run typecheck     # TypeScript (strict) in every package
bun run lint          # ESLint
bun run format:check  # Prettier
bun run build         # production build of API and web
```

API unit tests build the Hono app in memory and do not need the database or `.env`.

## Structure

```
apps/api            Hono API on Bun (port 4000)
apps/web            Next.js App Router (port 3000)
packages/core       @ta/core — pure business logic (decimal.js)
packages/db         @ta/db — Drizzle client, schema and migrations
packages/validators @ta/validators — shared Zod schemas
packages/tsconfig   @ta/tsconfig — shared strict TypeScript config
docs/               project documentation (api.http with request examples)
```
