import { boolean, index, pgTable, text, uuid } from "drizzle-orm/pg-core";

import { taskStatus } from "./_enums";
import { auditColumns, id, timestamps } from "./_shared";
import { users } from "./auth";
import { stores } from "./organization";

/** Work the shop assigns to someone. It starts pending. */
export const tasks = pgTable(
  "tasks",
  {
    id: id(),
    storeId: uuid("store_id")
      .notNull()
      .references(() => stores.id),
    title: text("title").notNull(),
    description: text("description"),
    assigneeId: uuid("assignee_id")
      .notNull()
      .references(() => users.id),
    status: taskStatus("status").notNull().default("pending"),
    isHighPriority: boolean("is_high_priority").notNull().default(false),
    ...timestamps,
    ...auditColumns,
  },
  (t) => [
    index("tasks_store_id_idx").on(t.storeId),
    index("tasks_assignee_id_idx").on(t.assigneeId),
  ],
);
