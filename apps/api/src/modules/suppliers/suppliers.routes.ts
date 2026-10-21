import {
  createSupplierSchema,
  supplierPaymentAccountInputSchema,
  updateSupplierSchema,
} from "@ta/validators";
import { Hono } from "hono";
import { z } from "zod";

import type { AppEnv } from "@/lib/types";
import { validate } from "@/lib/validate";
import { getActor, requireRole } from "@/middleware/auth";

import {
  addAccount,
  createSupplier,
  getSupplierDetail,
  listSuppliers,
  toSupplierDetailDto,
  toSupplierDto,
  updateAccount,
  updateSupplier,
} from "./suppliers.service";

const idParam = z.object({ id: z.uuid({ error: "Identificador inválido" }) });
const accountParam = idParam.extend({
  accountId: z.uuid({ error: "Identificador inválido" }),
});

/**
 * /api/v1/suppliers — stalls and local suppliers, with their pago móvil accounts (owner).
 * The manager can list them and add new ones (owner, 2026-10-21); the detail, edits and
 * accounts stay with the owner. An account is never deleted (payments point at it): DELETE
 * deactivates it.
 */
export function suppliersRoutes(): Hono<AppEnv> {
  const owner = requireRole("owner");
  const ownerOrManager = requireRole("owner", "manager");
  return new Hono<AppEnv>()
    .get("/", ownerOrManager, async (c) => {
      const rows = await listSuppliers(c.get("db"));
      return c.json({ data: rows.map(toSupplierDto) });
    })
    .post("/", ownerOrManager, validate("json", createSupplierSchema), async (c) => {
      const row = await createSupplier(c.get("db"), getActor(c), c.req.valid("json"));
      return c.json(toSupplierDto(row), 201);
    })
    .get("/:id", owner, validate("param", idParam), async (c) => {
      const row = await getSupplierDetail(c.get("db"), c.req.valid("param").id);
      return c.json(toSupplierDetailDto(row));
    })
    .patch(
      "/:id",
      owner,
      validate("param", idParam),
      validate("json", updateSupplierSchema),
      async (c) => {
        const row = await updateSupplier(
          c.get("db"),
          getActor(c),
          c.req.valid("param").id,
          c.req.valid("json"),
        );
        return c.json(toSupplierDetailDto(row));
      },
    )
    .post(
      "/:id/accounts",
      owner,
      validate("param", idParam),
      validate("json", supplierPaymentAccountInputSchema),
      async (c) => {
        const row = await addAccount(
          c.get("db"),
          getActor(c),
          c.req.valid("param").id,
          c.req.valid("json"),
        );
        return c.json(toSupplierDetailDto(row), 201);
      },
    )
    .put(
      "/:id/accounts/:accountId",
      owner,
      validate("param", accountParam),
      validate("json", supplierPaymentAccountInputSchema),
      async (c) => {
        const { id, accountId } = c.req.valid("param");
        const row = await updateAccount(c.get("db"), getActor(c), id, accountId, {
          ...c.req.valid("json"),
          isActive: true,
        });
        return c.json(toSupplierDetailDto(row));
      },
    )
    .delete("/:id/accounts/:accountId", owner, validate("param", accountParam), async (c) => {
      const { id, accountId } = c.req.valid("param");
      const row = await updateAccount(c.get("db"), getActor(c), id, accountId, {
        isActive: false,
      });
      return c.json(toSupplierDetailDto(row));
    });
}
