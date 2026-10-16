import type { Database, Executor } from "@ta/db";
import {
  DEFAULT_STORE_SETTINGS,
  SETTING_KEYS,
  storeSettingsSchema,
  type StoreSettings,
  type UpdateStoreSettings,
} from "@ta/validators";

import { recordAudit } from "@/lib/audit";
import type { Actor } from "@/lib/types";

import { findStoreSettings, upsertSetting } from "./settings.repository";

/**
 * The store's settings with defaults for missing keys. A stored value that no longer passes the
 * schema (edited by hand) falls back to the default instead of breaking every screen.
 */
export async function getStoreSettings(db: Executor, storeId: string): Promise<StoreSettings> {
  const rows = await findStoreSettings(db, storeId);
  const byKey = new Map(rows.map((r) => [r.key, r.value]));
  const merged: Record<string, unknown> = {};
  for (const [field, key] of Object.entries(SETTING_KEYS)) {
    merged[field] = byKey.has(key)
      ? byKey.get(key)
      : DEFAULT_STORE_SETTINGS[field as keyof StoreSettings];
  }
  const parsed = storeSettingsSchema.safeParse(merged);
  if (parsed.success) return parsed.data;

  const safe: Record<string, unknown> = { ...merged };
  for (const issue of parsed.error.issues) {
    const field = String(issue.path[0]) as keyof StoreSettings;
    safe[field] = DEFAULT_STORE_SETTINGS[field];
  }
  return storeSettingsSchema.parse(safe);
}

/** Saves the given settings (one audited upsert per key) and returns all of them. */
export async function updateStoreSettings(
  db: Database,
  actor: Actor,
  patch: UpdateStoreSettings,
): Promise<StoreSettings> {
  await db.transaction(async (tx) => {
    const before = await getStoreSettings(tx, actor.storeId);
    for (const [field, value] of Object.entries(patch) as [keyof StoreSettings, unknown][]) {
      if (value === undefined || value === before[field]) continue;
      const row = await upsertSetting(tx, {
        storeId: actor.storeId,
        key: SETTING_KEYS[field],
        value,
        userId: actor.userId,
      });
      await recordAudit(tx, actor, {
        tableName: "settings",
        recordId: row.id,
        action: "update",
        changes: { [SETTING_KEYS[field]]: { from: before[field], to: value } },
      });
    }
  });
  return getStoreSettings(db, actor.storeId);
}
