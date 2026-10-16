import { relations } from "drizzle-orm";
import { boolean, index, jsonb, pgTable, text, timestamp, unique, uuid } from "drizzle-orm/pg-core";

import { auditAction, membershipRole } from "./_enums";
import { auditColumns, id, timestamps } from "./_shared";
import { accounts, sessions, users } from "./auth";

/** One row per shop. Every operational table carries `store_id` (domain-model §8). */
export const stores = pgTable("stores", {
  id: id(),
  name: text("name").notNull(),
  address: text("address"),
  timezone: text("timezone").notNull().default("America/Caracas"),
  isActive: boolean("is_active").notNull().default(true),
  ...timestamps,
  ...auditColumns,
});

/** Role of a user in a store. One membership (one role) per user and store. */
export const memberships = pgTable(
  "memberships",
  {
    id: id(),
    userId: uuid("user_id")
      .notNull()
      .references(() => users.id),
    storeId: uuid("store_id")
      .notNull()
      .references(() => stores.id),
    role: membershipRole("role").notNull(),
    isActive: boolean("is_active").notNull().default(true),
    ...timestamps,
    ...auditColumns,
  },
  (t) => [
    // The unique index also serves lookups by user_id (leading column).
    unique("memberships_user_id_store_id_key").on(t.userId, t.storeId),
    index("memberships_store_id_idx").on(t.storeId),
  ],
);

/**
 * Key/value configuration per store. Decimal values are stored as JSON strings ("0.05"),
 * never JSON numbers, so they are never read back as floats.
 */
export const settings = pgTable(
  "settings",
  {
    id: id(),
    storeId: uuid("store_id")
      .notNull()
      .references(() => stores.id),
    key: text("key").notNull(),
    value: jsonb("value").notNull(),
    ...timestamps,
    ...auditColumns,
  },
  (t) => [unique("settings_store_id_key_key").on(t.storeId, t.key)],
);

/** Web Push subscription of a browser. Not user-editable data, so no audit columns. */
export const pushSubscriptions = pgTable(
  "push_subscriptions",
  {
    id: id(),
    userId: uuid("user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    endpoint: text("endpoint").notNull(),
    keys: jsonb("keys").notNull(),
    userAgent: text("user_agent"),
    ...timestamps,
  },
  (t) => [
    unique("push_subscriptions_endpoint_key").on(t.endpoint),
    index("push_subscriptions_user_id_idx").on(t.userId),
  ],
);

/** Append-only log of every write (who, what, when). Rows are never updated: no updated_at. */
export const auditLogs = pgTable(
  "audit_logs",
  {
    id: id(),
    storeId: uuid("store_id").references(() => stores.id),
    userId: uuid("user_id").references(() => users.id),
    tableName: text("table_name").notNull(),
    recordId: uuid("record_id").notNull(),
    action: auditAction("action").notNull(),
    changes: jsonb("changes"),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [
    index("audit_logs_store_id_idx").on(t.storeId),
    index("audit_logs_user_id_idx").on(t.userId),
    index("audit_logs_table_name_record_id_idx").on(t.tableName, t.recordId),
  ],
);

// Relations ------------------------------------------------------------------------------------

export const usersRelations = relations(users, ({ many }) => ({
  sessions: many(sessions),
  accounts: many(accounts),
  memberships: many(memberships),
  pushSubscriptions: many(pushSubscriptions),
}));

export const sessionsRelations = relations(sessions, ({ one }) => ({
  user: one(users, { fields: [sessions.userId], references: [users.id] }),
}));

export const accountsRelations = relations(accounts, ({ one }) => ({
  user: one(users, { fields: [accounts.userId], references: [users.id] }),
}));

export const storesRelations = relations(stores, ({ many }) => ({
  memberships: many(memberships),
  settings: many(settings),
  auditLogs: many(auditLogs),
}));

export const membershipsRelations = relations(memberships, ({ one }) => ({
  user: one(users, { fields: [memberships.userId], references: [users.id] }),
  store: one(stores, { fields: [memberships.storeId], references: [stores.id] }),
}));

export const settingsRelations = relations(settings, ({ one }) => ({
  store: one(stores, { fields: [settings.storeId], references: [stores.id] }),
}));

export const pushSubscriptionsRelations = relations(pushSubscriptions, ({ one }) => ({
  user: one(users, { fields: [pushSubscriptions.userId], references: [users.id] }),
}));

export const auditLogsRelations = relations(auditLogs, ({ one }) => ({
  store: one(stores, { fields: [auditLogs.storeId], references: [stores.id] }),
  user: one(users, { fields: [auditLogs.userId], references: [users.id] }),
}));
