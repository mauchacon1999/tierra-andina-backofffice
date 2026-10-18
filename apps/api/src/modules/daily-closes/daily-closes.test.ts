import { beforeAll, describe, expect, test } from "bun:test";

import { toBusinessDate } from "@ta/core";
import { uniq } from "@ta/db/testing";
import {
  customerListSchema,
  dailyCloseListSchema,
  dailyCloseSchema,
  paymentMethodListSchema,
  pendingClosesSchema,
  type PaymentMethod,
} from "@ta/validators";

import { call, errorOf, signInRoles, type Json, type RoleSession } from "@/testing/http";

let s: RoleSession;
let methods: Record<string, PaymentMethod>;
let dayCounter = 0;

/** A fresh business day per test (one close per store and day). */
const nextDay = () => {
  dayCounter += 1;
  return `2027-01-${String(dayCounter).padStart(2, "0")}`;
};

/** Tuesday 13/10/2026 from the shop's Excel. */
const tuesday = (businessDate: string, extra: Json = {}): Json => ({
  businessDate,
  cardBatch: "16",
  cashDestination: "kept",
  payments: [
    { paymentMethodId: methods.card_terminal!.id, amount: "163344" },
    { paymentMethodId: methods.cash_bs!.id, amount: "5500" },
    { paymentMethodId: methods.cash_usd!.id, amount: "18000" },
    { paymentMethodId: methods.mobile_payment!.id, amount: "83569" },
  ],
  ...extra,
});

const submit = (cookie: string, body: Json) => call(s.app, "POST", "/daily-closes", cookie, body);

beforeAll(async () => {
  s = await signInRoles();
  const res = await call(s.app, "GET", "/payment-methods", s.manager);
  methods = Object.fromEntries(
    paymentMethodListSchema.parse(res.body).data.map((m) => [m.code, m]),
  );
});

describe("GET /api/v1/payment-methods", () => {
  test("the four methods in the form's order; not for receivers", async () => {
    const res = await call(s.app, "GET", "/payment-methods", s.owner);
    expect(paymentMethodListSchema.parse(res.body).data.map((m) => [m.code, m.currency])).toEqual([
      ["card_terminal", "VES"],
      ["cash_bs", "VES"],
      ["cash_usd", "USD"],
      ["mobile_payment", "VES"],
    ]);
    expect((await call(s.app, "GET", "/payment-methods", s.receiver)).status).toBe(403);
  });
});

describe("POST /api/v1/daily-closes", () => {
  test("the manager submits today: amounts per currency, batch, credit and expenses", async () => {
    const day = toBusinessDate(new Date());
    const customer = uniq("Sra. María");

    const res = await submit(
      s.manager,
      tuesday(day, {
        credits: [{ customerName: customer, amount: "1200", currency: "VES" }],
        expenses: [{ concept: "Bolsas", amount: "379", currency: "USD" }],
      }),
    );

    expect(res.status).toBe(201);
    const close = dailyCloseSchema.parse(res.body);
    expect(close).toMatchObject({
      businessDate: day,
      status: "submitted",
      cardBatch: "16",
      cashDestination: "kept",
      approvedBy: null,
      totals: {
        collected: { VES: "252413.0000", USD: "18000.0000" },
        credit: { VES: "1200.0000", USD: "0.0000" },
        expenses: { VES: "0.0000", USD: "379.0000" },
      },
    });
    expect(close.credits[0]).toMatchObject({ customerName: customer, amount: "1200.0000" });
    expect(close.expenses[0]).toMatchObject({ concept: "Bolsas", currency: "USD" });
    expect(close).not.toHaveProperty("rate");
  });

  test("a manager cannot file another day; the owner can", async () => {
    const other = nextDay();

    const denied = await submit(s.manager, tuesday(other));

    expect(denied.status).toBe(422);
    expect(errorOf(denied.body).code).toBe("CLOSE_DATE_LOCKED");
    expect((await submit(s.owner, tuesday(other))).status).toBe(201);
  });

  test("one close per day: a second one is 409 CLOSE_EXISTS", async () => {
    const day = nextDay();
    await submit(s.owner, tuesday(day));

    const again = await submit(s.owner, tuesday(day));

    expect(again.status).toBe(409);
    expect(errorOf(again.body).code).toBe("CLOSE_EXISTS");
  });

  test("a customer written again (other case) is the same customer; search finds it", async () => {
    const name = uniq("Pedro");
    await submit(
      s.owner,
      tuesday(nextDay(), { credits: [{ customerName: name, amount: "10", currency: "USD" }] }),
    );
    await submit(
      s.owner,
      tuesday(nextDay(), {
        credits: [{ customerName: name.toUpperCase(), amount: "5", currency: "USD" }],
      }),
    );

    const found = customerListSchema
      .parse(
        (
          await call(
            s.app,
            "GET",
            `/customers?search=${encodeURIComponent(name.slice(0, 8))}`,
            s.manager,
          )
        ).body,
      )
      .data.filter((c) => c.name.toLowerCase() === name.toLowerCase());
    expect(found).toHaveLength(1);

    const byId = await submit(
      s.owner,
      tuesday(nextDay(), { credits: [{ customerId: found[0]!.id, amount: "1", currency: "VES" }] }),
    );
    expect(dailyCloseSchema.parse(byId.body).credits[0]?.customerName).toBe(found[0]!.name);
  });

  test("400 for a repeated method, 422 for an unknown method or customer, 403 for a receiver", async () => {
    const card = { paymentMethodId: methods.card_terminal!.id, amount: "1" };
    expect((await submit(s.owner, tuesday(nextDay(), { payments: [card, card] }))).status).toBe(
      400,
    );

    const unknownMethod = await submit(
      s.owner,
      tuesday(nextDay(), { payments: [{ paymentMethodId: crypto.randomUUID(), amount: "1" }] }),
    );
    expect(unknownMethod.status).toBe(422);
    expect(errorOf(unknownMethod.body).code).toBe("PAYMENT_METHOD_NOT_FOUND");

    const unknownCustomer = await submit(
      s.owner,
      tuesday(nextDay(), {
        credits: [{ customerId: crypto.randomUUID(), amount: "1", currency: "VES" }],
      }),
    );
    expect(errorOf(unknownCustomer.body).code).toBe("CUSTOMER_NOT_FOUND");

    expect((await submit(s.receiver, tuesday(nextDay()))).status).toBe(403);
  });
});

describe("reading closes", () => {
  test("by day (manager and owner), 404 for a day without close, 403 for a receiver", async () => {
    const day = nextDay();
    await submit(s.owner, tuesday(day));

    expect((await call(s.app, "GET", `/daily-closes/${day}`, s.owner)).status).toBe(200);
    expect((await call(s.app, "GET", `/daily-closes/${day}`, s.manager)).status).toBe(200);
    expect((await call(s.app, "GET", "/daily-closes/2027-12-31", s.owner)).status).toBe(404);
    expect((await call(s.app, "GET", `/daily-closes/${day}`, s.receiver)).status).toBe(403);
  });

  test("a range, newest first, with the totals of each day", async () => {
    const first = nextDay();
    const second = nextDay();
    await submit(s.owner, tuesday(first));
    await submit(s.owner, tuesday(second));

    const res = await call(s.app, "GET", `/daily-closes?from=${first}&to=${second}`, s.owner);

    const list = dailyCloseListSchema.parse(res.body).data;
    expect(list.map((c) => c.businessDate)).toEqual([second, first]);
    expect(list[0]?.totals.collected).toEqual({ VES: "252413.0000", USD: "18000.0000" });
    expect(list[0]?.payments.map((p) => [p.code, p.amount])).toEqual([
      ["card_terminal", "163344.0000"],
      ["cash_bs", "5500.0000"],
      ["cash_usd", "18000.0000"],
      ["mobile_payment", "83569.0000"],
    ]);
  });
});

describe("owner review", () => {
  test("pending count, correction (manager cannot), approval once", async () => {
    const pending = async () =>
      pendingClosesSchema.parse(
        (await call(s.app, "GET", "/daily-closes/pending-count", s.owner)).body,
      ).count;
    const before = await pending();
    const created = dailyCloseSchema.parse((await submit(s.owner, tuesday(nextDay()))).body);
    expect(await pending()).toBe(before + 1);

    const correction = {
      cardBatch: "17",
      cashDestination: "deposited",
      payments: [{ paymentMethodId: methods.card_terminal!.id, amount: "152816" }],
      expenses: [{ concept: "Pan", amount: "20", currency: "USD" }],
    };
    expect(
      (await call(s.app, "PATCH", `/daily-closes/${created.id}`, s.manager, correction)).status,
    ).toBe(403);
    const fixed = dailyCloseSchema.parse(
      (await call(s.app, "PATCH", `/daily-closes/${created.id}`, s.owner, correction)).body,
    );
    expect(fixed).toMatchObject({
      cardBatch: "17",
      cashDestination: "deposited",
      totals: { collected: { VES: "152816.0000", USD: "0.0000" }, expenses: { USD: "20.0000" } },
    });
    expect(fixed.payments).toHaveLength(1);

    const approved = await call(s.app, "POST", `/daily-closes/${created.id}/approve`, s.owner);
    expect(dailyCloseSchema.parse(approved.body)).toMatchObject({ status: "approved" });
    expect(dailyCloseSchema.parse(approved.body).approvedBy).not.toBeNull();
    expect(await pending()).toBe(before);

    const twice = await call(s.app, "POST", `/daily-closes/${created.id}/approve`, s.owner);
    expect(twice.status).toBe(409);
    expect(errorOf(twice.body).code).toBe("CLOSE_ALREADY_APPROVED");
    expect(
      (await call(s.app, "POST", `/daily-closes/${created.id}/approve`, s.manager)).status,
    ).toBe(403);
    expect((await call(s.app, "GET", "/daily-closes/pending-count", s.manager)).status).toBe(403);
  });

  test("the owner deletes a close, approved or not, and that day can be submitted again", async () => {
    const day = nextDay();
    const created = dailyCloseSchema.parse((await submit(s.owner, tuesday(day))).body);
    expect((await call(s.app, "POST", `/daily-closes/${created.id}/approve`, s.owner)).status).toBe(
      200,
    );

    expect((await call(s.app, "DELETE", `/daily-closes/${created.id}`, s.manager)).status).toBe(
      403,
    );
    expect((await call(s.app, "DELETE", `/daily-closes/${created.id}`, s.owner)).status).toBe(204);
    expect((await call(s.app, "GET", `/daily-closes/${day}`, s.owner)).status).toBe(404);
    expect((await submit(s.owner, tuesday(day))).status).toBe(201);
  });

  test("404 when correcting, approving or deleting a close that does not exist", async () => {
    const id = crypto.randomUUID();
    expect((await call(s.app, "POST", `/daily-closes/${id}/approve`, s.owner)).status).toBe(404);
    expect((await call(s.app, "DELETE", `/daily-closes/${id}`, s.owner)).status).toBe(404);
  });
});
