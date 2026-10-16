import { numeric, timestamp, uuid, type PgNumericBuilderInitial } from "drizzle-orm/pg-core";

import { users } from "./auth";

/*
 * Column helpers shared by every table (docs/domain-model.md §9 conventions).
 * Builder objects can be spread into several tables: Drizzle builds a separate column per table.
 */

const idBuilder = () =>
  uuid("id")
    .primaryKey()
    .$defaultFn(() => Bun.randomUUIDv7());

export type IdColumn = ReturnType<typeof idBuilder>;

/**
 * Primary key: UUID v7 generated in the app (time-ordered, index-friendly, safe offline).
 * PostgreSQL 16 has no `uuidv7()`, so there is no DB default: raw SQL inserts must pass an id.
 */
export function id(): IdColumn {
  return idBuilder();
}

/** `created_at` / `updated_at` as timestamptz. `updated_at` is refreshed by Drizzle on update. */
export const timestamps = {
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true })
    .notNull()
    .defaultNow()
    .$onUpdate(() => new Date()),
};

/**
 * Who created / last changed the row. Nullable: the seed and system jobs write without a user.
 * Not indexed on purpose: they are never used to filter, and audit_logs covers "who did what".
 */
export const auditColumns = {
  createdBy: uuid("created_by").references(() => users.id),
  updatedBy: uuid("updated_by").references(() => users.id),
};

// numeric(14,4) returned as string: never float (CLAUDE.md §7). Values come back with 4 decimals.
const NUMERIC_14_4 = { precision: 14, scale: 4, mode: "string" } as const;

/** Money amount (`*_usd`, `*_bs`): numeric(14,4) as string. */
export function money<TName extends string>(name: TName): PgNumericBuilderInitial<TName> {
  return numeric(name, NUMERIC_14_4);
}

/** Exchange rate (`*_rate`, Bs per USD): numeric(14,4) as string. */
export function rate<TName extends string>(name: TName): PgNumericBuilderInitial<TName> {
  return numeric(name, NUMERIC_14_4);
}

/** Quantity in kg, units or packs: numeric(14,4) as string. */
export function quantity<TName extends string>(name: TName): PgNumericBuilderInitial<TName> {
  return numeric(name, NUMERIC_14_4);
}

/** Fraction such as a margin (0.50 = 50 %): numeric(14,4) as string. */
export function ratio<TName extends string>(name: TName): PgNumericBuilderInitial<TName> {
  return numeric(name, NUMERIC_14_4);
}
