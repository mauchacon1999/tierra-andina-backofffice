import { toBusinessDate } from "@ta/core";
import {
  customerCreditQuerySchema,
  customerPaymentInputSchema,
  customerSearchQuerySchema,
  updateCustomerSchema,
} from "@ta/validators";
import { Hono } from "hono";
import { z } from "zod";

import type { AppEnv } from "@/lib/types";
import { validate } from "@/lib/validate";
import { getActor, getMembership, requireRole } from "@/middleware/auth";

import {
  deleteCustomerPayment,
  getCustomerCredit,
  listCustomerBalances,
  recordCustomerPayment,
  toCustomerBalanceDto,
  toCustomerCreditDto,
  updateCustomer,
} from "./customer-credit.service";
import { searchCustomers, toCustomerDto } from "./customers.service";

const idParam = z.object({ id: z.uuid({ error: "Identificador inválido" }) });
const entryParam = idParam.extend({ entryId: z.uuid({ error: "Identificador inválido" }) });

/**
 * /api/v1/customers — who buys on credit (the daily close picks or creates them) and what each
 * one owes, "fiado" (owner and manager; only the owner deletes a payment or edits a customer).
 */
export function customersRoutes(): Hono<AppEnv> {
  const staff = requireRole("owner", "manager");
  const owner = requireRole("owner");
  return new Hono<AppEnv>()
    .get("/", staff, validate("query", customerSearchQuerySchema), async (c) => {
      const { search } = c.req.valid("query");
      const rows = await searchCustomers(c.get("db"), getMembership(c).storeId, search);
      return c.json({ data: rows.map(toCustomerDto) });
    })
    .get("/credit", staff, validate("query", customerCreditQuerySchema), async (c) => {
      const list = await listCustomerBalances(
        c.get("db"),
        getMembership(c).storeId,
        c.req.valid("query"),
      );
      return c.json({ data: list.data.map(toCustomerBalanceDto), total: list.total });
    })
    .get("/:id/credit", staff, validate("param", idParam), async (c) => {
      const row = await getCustomerCredit(
        c.get("db"),
        getMembership(c).storeId,
        c.req.valid("param").id,
      );
      return c.json(toCustomerCreditDto(row));
    })
    .patch(
      "/:id",
      owner,
      validate("param", idParam),
      validate("json", updateCustomerSchema),
      async (c) => {
        const row = await updateCustomer(
          c.get("db"),
          getActor(c),
          c.req.valid("param").id,
          c.req.valid("json"),
        );
        return c.json(toCustomerCreditDto(row));
      },
    )
    .post(
      "/:id/payments",
      staff,
      validate("param", idParam),
      validate("json", customerPaymentInputSchema),
      async (c) => {
        const row = await recordCustomerPayment(
          c.get("db"),
          { ...getActor(c), role: getMembership(c).role },
          c.req.valid("param").id,
          c.req.valid("json"),
          toBusinessDate(new Date()),
        );
        return c.json(toCustomerCreditDto(row), 201);
      },
    )
    .delete("/:id/payments/:entryId", owner, validate("param", entryParam), async (c) => {
      const { id, entryId } = c.req.valid("param");
      const row = await deleteCustomerPayment(c.get("db"), getActor(c), id, entryId);
      return c.json(toCustomerCreditDto(row));
    });
}
