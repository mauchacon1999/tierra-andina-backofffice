import { toBusinessDate } from "@ta/core";
import {
  payableInputSchema,
  payableListQuerySchema,
  payablePaymentInputSchema,
  payableTermsInputSchema,
} from "@ta/validators";
import { Hono } from "hono";
import { z } from "zod";

import type { AppEnv } from "@/lib/types";
import { validate } from "@/lib/validate";
import { getActor, getMembership, requireRole } from "@/middleware/auth";

import { toMobilePaymentDto, toPayableDetailDto, toPayableListDto } from "./payables.mapper";
import {
  createPayable,
  deletePayment,
  getMobilePaymentData,
  getPayable,
  listPayables,
  recordPayment,
  replacePayable,
  setPayableTerms,
  voidPayable,
} from "./payables.service";

const idParam = z.object({ id: z.uuid({ error: "Identificador inválido" }) });
const paymentParam = idParam.extend({ paymentId: z.uuid({ error: "Identificador inválido" }) });

/** Today's business date in Caracas: statuses (overdue) and the BCV rate depend on it. */
const today = (): string => toBusinessDate(new Date());

/**
 * /api/v1/payables — supplier invoices on credit and their payments (owner;
 * docs/modules/payables.md).
 */
export function payablesRoutes(): Hono<AppEnv> {
  const owner = requireRole("owner");
  return new Hono<AppEnv>()
    .get("/", owner, validate("query", payableListQuerySchema), async (c) => {
      const list = await listPayables(
        c.get("db"),
        getMembership(c).storeId,
        c.req.valid("query"),
        today(),
      );
      return c.json(toPayableListDto(list));
    })
    .post("/", owner, validate("json", payableInputSchema), async (c) => {
      const row = await createPayable(c.get("db"), getActor(c), c.req.valid("json"), today());
      return c.json(toPayableDetailDto(row), 201);
    })
    .get("/:id", owner, validate("param", idParam), async (c) => {
      const row = await getPayable(
        c.get("db"),
        getMembership(c).storeId,
        c.req.valid("param").id,
        today(),
      );
      return c.json(toPayableDetailDto(row));
    })
    .put(
      "/:id",
      owner,
      validate("param", idParam),
      validate("json", payableInputSchema),
      async (c) => {
        const row = await replacePayable(
          c.get("db"),
          getActor(c),
          c.req.valid("param").id,
          c.req.valid("json"),
          today(),
        );
        return c.json(toPayableDetailDto(row));
      },
    )
    .patch(
      "/:id/terms",
      owner,
      validate("param", idParam),
      validate("json", payableTermsInputSchema),
      async (c) => {
        const row = await setPayableTerms(
          c.get("db"),
          getActor(c),
          c.req.valid("param").id,
          c.req.valid("json"),
          today(),
        );
        return c.json(toPayableDetailDto(row));
      },
    )
    .post("/:id/void", owner, validate("param", idParam), async (c) => {
      const row = await voidPayable(
        c.get("db"),
        getActor(c),
        c.req.valid("param").id,
        new Date(),
        today(),
      );
      return c.json(toPayableDetailDto(row));
    })
    .post(
      "/:id/payments",
      owner,
      validate("param", idParam),
      validate("json", payablePaymentInputSchema),
      async (c) => {
        const row = await recordPayment(
          c.get("db"),
          getActor(c),
          c.req.valid("param").id,
          c.req.valid("json"),
          today(),
        );
        return c.json(toPayableDetailDto(row), 201);
      },
    )
    .delete("/:id/payments/:paymentId", owner, validate("param", paymentParam), async (c) => {
      const { id, paymentId } = c.req.valid("param");
      const row = await deletePayment(c.get("db"), getActor(c), id, paymentId, today());
      return c.json(toPayableDetailDto(row));
    })
    .get("/:id/mobile-payment", owner, validate("param", idParam), async (c) => {
      const data = await getMobilePaymentData(
        c.get("db"),
        getMembership(c).storeId,
        c.req.valid("param").id,
        today(),
      );
      return c.json(toMobilePaymentDto(data));
    });
}
