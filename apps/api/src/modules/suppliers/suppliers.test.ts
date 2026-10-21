import { beforeAll, describe, expect, test } from "bun:test";

import { schema } from "@ta/db";
import { testConnection, uniq } from "@ta/db/testing";
import { supplierDetailSchema, supplierSchema } from "@ta/validators";
import { and, eq } from "drizzle-orm";

import { call, errorOf, signInRoles, type RoleSession } from "@/testing/http";

let s: RoleSession;

const MISSING = "01a14314-2825-7000-a1d1-bdf734d05999";

/** A local supplier of its own (suppliers are global, names are unique per test). */
async function newSupplier(): Promise<string> {
  const res = await call(s.app, "POST", "/suppliers", s.owner, {
    name: uniq("Panadería"),
    kind: "local",
    notes: " Trae el pan los martes ",
  });
  expect(res.status).toBe(201);
  return supplierSchema.parse(res.body).id;
}

const BDV = { bankCode: "0102", phone: "0414-123.45.67", idDocument: "v-12.345.678" };

beforeAll(async () => {
  s = await signInRoles();
});

describe("/api/v1/suppliers", () => {
  test("creates with notes; the detail lists no accounts yet", async () => {
    const id = await newSupplier();

    const detail = supplierDetailSchema.parse(
      (await call(s.app, "GET", `/suppliers/${id}`, s.owner)).body,
    );

    expect(detail).toMatchObject({ kind: "local", notes: "Trae el pan los martes", accounts: [] });
  });

  test("PATCH changes the fields sent; an empty text clears it; audited", async () => {
    const id = await newSupplier();

    const res = await call(s.app, "PATCH", `/suppliers/${id}`, s.owner, {
      phone: "0414 555 1234",
      notes: "",
    });

    expect(res.status).toBe(200);
    expect(supplierDetailSchema.parse(res.body)).toMatchObject({
      phone: "0414 555 1234",
      notes: null,
    });
    const logs = await testConnection()
      .db.select()
      .from(schema.auditLogs)
      .where(and(eq(schema.auditLogs.tableName, "suppliers"), eq(schema.auditLogs.recordId, id)));
    expect(logs.map((log) => log.action).sort()).toEqual(["insert", "update"]);
  });

  test("the manager lists and adds suppliers; the receiver cannot", async () => {
    const name = uniq("Cambur");

    const created = await call(s.app, "POST", "/suppliers", s.manager, { name, kind: "local" });
    const list = await call(s.app, "GET", "/suppliers", s.manager);

    expect(created.status).toBe(201);
    expect(supplierSchema.parse(created.body)).toMatchObject({ name, kind: "local" });
    expect(list.status).toBe(200);
    expect((list.body.data as { name: string }[]).some((row) => row.name === name)).toBe(true);
    expect((await call(s.app, "POST", "/suppliers", s.receiver, { name: uniq("X") })).status).toBe(
      403,
    );
  });

  test("400 for an empty PATCH, 404 for an unknown supplier, 403 for a manager", async () => {
    const id = await newSupplier();

    expect((await call(s.app, "PATCH", `/suppliers/${id}`, s.owner, {})).status).toBe(400);
    expect(errorOf((await call(s.app, "GET", `/suppliers/${MISSING}`, s.owner)).body).code).toBe(
      "NOT_FOUND",
    );
    expect((await call(s.app, "GET", `/suppliers/${id}`, s.manager)).status).toBe(403);
    expect((await call(s.app, "PATCH", `/suppliers/${id}`, s.manager, { phone: "1" })).status).toBe(
      403,
    );
    expect((await call(s.app, "GET", "/suppliers", s.receiver)).status).toBe(403);
  });
});

describe("/api/v1/suppliers/:id/accounts", () => {
  test("adds a pago móvil account stored the way the banks want it, with the bank's name", async () => {
    const id = await newSupplier();

    const res = await call(s.app, "POST", `/suppliers/${id}/accounts`, s.owner, BDV);

    expect(res.status).toBe(201);
    expect(supplierDetailSchema.parse(res.body).accounts).toEqual([
      expect.objectContaining({
        bankCode: "0102",
        bankName: "Banco de Venezuela",
        phone: "04141234567",
        idDocument: "V12345678",
        isActive: true,
      }),
    ]);
  });

  test("400 for an unknown bank, a landline or a cédula without letter", async () => {
    const id = await newSupplier();

    const res = await call(s.app, "POST", `/suppliers/${id}/accounts`, s.owner, {
      bankCode: "0999",
      phone: "0212-1234567",
      idDocument: "12345678",
    });

    expect(res.status).toBe(400);
    expect(Object.keys(errorOf(res.body).details?.fieldErrors as object).sort()).toEqual([
      "bankCode",
      "idDocument",
      "phone",
    ]);
  });

  test("409 ACCOUNT_EXISTS for the same bank and phone twice", async () => {
    const id = await newSupplier();
    await call(s.app, "POST", `/suppliers/${id}/accounts`, s.owner, BDV);

    const res = await call(s.app, "POST", `/suppliers/${id}/accounts`, s.owner, BDV);

    expect(res.status).toBe(409);
    expect(errorOf(res.body).code).toBe("ACCOUNT_EXISTS");
  });

  test("PUT replaces the data; DELETE deactivates (kept for past payments)", async () => {
    const id = await newSupplier();
    const added = supplierDetailSchema.parse(
      (await call(s.app, "POST", `/suppliers/${id}/accounts`, s.owner, BDV)).body,
    );
    const accountId = added.accounts[0]!.id;

    const replaced = await call(s.app, "PUT", `/suppliers/${id}/accounts/${accountId}`, s.owner, {
      ...BDV,
      bankCode: "0134",
    });
    expect(supplierDetailSchema.parse(replaced.body).accounts[0]).toMatchObject({
      bankName: "Banesco",
    });

    const removed = await call(s.app, "DELETE", `/suppliers/${id}/accounts/${accountId}`, s.owner);
    expect(supplierDetailSchema.parse(removed.body).accounts[0]?.isActive).toBe(false);
  });

  test("404 for an account of another supplier; 403 for a manager", async () => {
    const id = await newSupplier();
    const other = await newSupplier();
    const added = supplierDetailSchema.parse(
      (await call(s.app, "POST", `/suppliers/${other}/accounts`, s.owner, BDV)).body,
    );

    const res = await call(
      s.app,
      "DELETE",
      `/suppliers/${id}/accounts/${added.accounts[0]!.id}`,
      s.owner,
    );

    expect(res.status).toBe(404);
    expect(errorOf(res.body).code).toBe("ACCOUNT_NOT_FOUND");
    expect((await call(s.app, "POST", `/suppliers/${id}/accounts`, s.manager, BDV)).status).toBe(
      403,
    );
  });
});
