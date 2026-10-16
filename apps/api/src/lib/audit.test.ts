import { describe, expect, test } from "bun:test";

import { schema } from "@ta/db";
import { createBase, inRollback, testConnection } from "@ta/db/testing";
import { eq } from "drizzle-orm";

import { diffChanges, recordAudit } from "@/lib/audit";

describe("recordAudit", () => {
  test("writes who, where, what and the changes in the caller's transaction", async () => {
    await inRollback(async (tx) => {
      const base = await createBase(tx);
      const actor = { userId: base.user.id, storeId: base.store.id };

      await recordAudit(tx, actor, {
        tableName: "products",
        recordId: base.product.id,
        action: "update",
        changes: { lastMargin: { from: "0.5000", to: "0.6000" } },
      });

      const rows = await tx
        .select()
        .from(schema.auditLogs)
        .where(eq(schema.auditLogs.recordId, base.product.id));
      expect(rows).toHaveLength(1);
      expect(rows[0]).toMatchObject({
        storeId: base.store.id,
        userId: base.user.id,
        tableName: "products",
        action: "update",
        changes: { lastMargin: { from: "0.5000", to: "0.6000" } },
      });
    });
  });

  test("rolls back with the audited write", async () => {
    let recordId = "";
    await inRollback(async (tx) => {
      const base = await createBase(tx);
      recordId = base.product.id;
      await recordAudit(
        tx,
        { userId: base.user.id, storeId: base.store.id },
        {
          tableName: "products",
          recordId,
          action: "insert",
        },
      );
    });

    const rows = await testConnection()
      .db.select()
      .from(schema.auditLogs)
      .where(eq(schema.auditLogs.recordId, recordId));
    expect(rows).toHaveLength(0);
  });
});

describe("diffChanges", () => {
  test("returns only the fields that changed, with from/to", () => {
    expect(
      diffChanges(
        { name: "Tomate", lastMargin: "0.5000", isActive: true },
        { name: "Tomate perita", lastMargin: "0.5000", isActive: true },
      ),
    ).toEqual({ name: { from: "Tomate", to: "Tomate perita" } });
  });

  test("ignores audit columns", () => {
    expect(
      diffChanges(
        { name: "A", updatedAt: new Date(0), updatedBy: "u1" },
        { name: "A", updatedAt: new Date(1), updatedBy: "u2" },
      ),
    ).toEqual({});
  });

  test("reports added and removed keys", () => {
    expect(diffChanges({ a: 1 }, { b: 2 })).toEqual({
      a: { from: 1, to: undefined },
      b: { from: undefined, to: 2 },
    });
  });
});
