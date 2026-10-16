import { type Executor, schema } from "@ta/db";
import { eq } from "drizzle-orm";

const { settings } = schema;

export type SettingRecord = typeof settings.$inferSelect;

export async function findStoreSettings(db: Executor, storeId: string): Promise<SettingRecord[]> {
  return db.select().from(settings).where(eq(settings.storeId, storeId));
}

/** Inserts or replaces one setting value. Returns the row before (undefined if new) and after. */
export async function upsertSetting(
  db: Executor,
  values: { storeId: string; key: string; value: unknown; userId: string },
): Promise<SettingRecord> {
  const [row] = await db
    .insert(settings)
    .values({
      storeId: values.storeId,
      key: values.key,
      value: values.value,
      createdBy: values.userId,
      updatedBy: values.userId,
    })
    .onConflictDoUpdate({
      target: [settings.storeId, settings.key],
      set: { value: values.value, updatedBy: values.userId, updatedAt: new Date() },
    })
    .returning();
  if (!row) throw new Error(`upsert of setting ${values.key} returned no row`);
  return row;
}
