import { type Executor, schema } from "@ta/db";
import { and, desc, eq, getTableColumns, sql } from "drizzle-orm";

const { memberships, tasks, users } = schema;

export type TaskRow = typeof tasks.$inferSelect & { assigneeName: string };
export type TaskInsert = typeof tasks.$inferInsert;
export type TaskPatch = Partial<typeof tasks.$inferInsert>;

/** Active people of the store, by name, so a task can be assigned. */
export async function findAssignees(
  db: Executor,
  storeId: string,
): Promise<{ id: string; name: string }[]> {
  return db
    .select({ id: users.id, name: users.name })
    .from(memberships)
    .innerJoin(users, eq(users.id, memberships.userId))
    .where(and(eq(memberships.storeId, storeId), eq(memberships.isActive, true)))
    .orderBy(users.name);
}

/**
 * High priority first, then in progress, observation, pending and finished,
 * newest first inside each group.
 */
export async function findTasks(db: Executor, storeId: string): Promise<TaskRow[]> {
  return db
    .select({ ...getTableColumns(tasks), assigneeName: users.name })
    .from(tasks)
    .innerJoin(users, eq(users.id, tasks.assigneeId))
    .where(eq(tasks.storeId, storeId))
    .orderBy(
      desc(tasks.isHighPriority),
      sql`case ${tasks.status} when 'in_progress' then 0 when 'observation' then 1 when 'pending' then 2 else 3 end`,
      desc(tasks.createdAt),
      desc(tasks.id),
    );
}

export async function findTask(
  db: Executor,
  storeId: string,
  id: string,
): Promise<TaskRow | undefined> {
  const [row] = await db
    .select({ ...getTableColumns(tasks), assigneeName: users.name })
    .from(tasks)
    .innerJoin(users, eq(users.id, tasks.assigneeId))
    .where(and(eq(tasks.storeId, storeId), eq(tasks.id, id)))
    .limit(1);
  return row;
}

export async function insertTask(db: Executor, values: TaskInsert): Promise<TaskRow> {
  const [row] = await db.insert(tasks).values(values).returning({ id: tasks.id });
  if (!row) throw new Error("insert into tasks returned no row");
  const listed = await findTask(db, values.storeId, row.id);
  if (!listed) throw new Error("task missing after insert");
  return listed;
}

export async function updateTaskById(db: Executor, id: string, patch: TaskPatch): Promise<void> {
  await db.update(tasks).set(patch).where(eq(tasks.id, id));
}

export async function deleteTaskById(db: Executor, id: string): Promise<void> {
  await db.delete(tasks).where(eq(tasks.id, id));
}
