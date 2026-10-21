import { beforeAll, describe, expect, test } from "bun:test";

import { schema } from "@ta/db";
import { testConnection, uniq } from "@ta/db/testing";
import {
  productDetailSchema,
  supplierListSchema,
  supplierSchema,
  tripDetailSchema,
  tripListSchema,
  tripSchema,
  type Product,
  type TripDetail,
} from "@ta/validators";
import { and, eq } from "drizzle-orm";

import {
  call,
  closeOpenTrips,
  errorOf,
  signInOwnStore,
  type Json,
  type RoleSession,
} from "@/testing/http";
import { createStore, createUser, signIn } from "@/testing/test-app";

let s: RoleSession;
let categoryId: string;
let dayCounter = 0;

/** A fresh business day with BCV 200 and Coche 201 (each test gets its own day). */
async function dayWithRates(rates: Json = { bcv: "200", market: "201" }): Promise<string> {
  dayCounter += 1;
  const date = `2026-11-${String(dayCounter).padStart(2, "0")}`;
  if (Object.keys(rates).length > 0) {
    const res = await call(s.app, "PUT", `/exchange-rates/${date}`, s.owner, rates);
    if (res.status !== 200) throw new Error(`rates: ${JSON.stringify(res.body)}`);
  }
  return date;
}

async function tomato(overrides: Json = {}): Promise<Product> {
  const res = await call(s.app, "POST", "/products", s.owner, {
    name: uniq("Tomate"),
    categoryId,
    purchaseUnit: "crate",
    saleUnit: "kg",
    defaultPackQuantity: "24",
    lastShrinkage: "2",
    lastMargin: "0.5",
    ...overrides,
  });
  if (res.status !== 201) throw new Error(`product: ${JSON.stringify(res.body)}`);
  return res.body as Product;
}

async function openTrip(date?: string): Promise<string> {
  await closeOpenTrips(s.storeId);
  const res = await call(s.app, "POST", "/purchase-trips", s.owner, {
    businessDate: date ?? (await dayWithRates()),
  });
  if (res.status !== 201) throw new Error(`trip: ${JSON.stringify(res.body)}`);
  return tripSchema.parse(res.body).id;
}

async function addLine(tripId: string, line: Json): Promise<{ status: number; body: Json }> {
  return call(s.app, "POST", `/purchase-trips/${tripId}/lines`, s.owner, line);
}

const lastLine = (body: Json) => {
  const trip = tripDetailSchema.parse(body);
  const line = trip.lines.at(-1);
  if (!line) throw new Error("no lines");
  return { trip, line };
};

beforeAll(async () => {
  s = await signInOwnStore();
  const [category] = await testConnection()
    .db.select()
    .from(schema.productCategories)
    .where(eq(schema.productCategories.code, "vegetable"));
  if (!category) throw new Error("category");
  categoryId = category.id;
});

describe("POST /api/v1/purchase-trips (open a trip)", () => {
  test("copies the day's BCV and Coche rates", async () => {
    const date = await dayWithRates({ bcv: "200", market: "201.5" });
    const res = await call(s.app, "POST", "/purchase-trips", s.owner, {
      businessDate: date,
      note: "Lunes",
    });

    expect(res.status).toBe(201);
    expect(tripSchema.parse(res.body)).toMatchObject({
      businessDate: date,
      bcvRate: "200.0000",
      marketRate: "201.5000",
      status: "open",
      totalUsd: "0.0000",
      totalBs: "0.0000",
      note: "Lunes",
      lineCount: 0,
    });
  });

  test("keeps its copy when the day's rates are corrected later", async () => {
    const date = await dayWithRates();
    const tripId = await openTrip(date);
    await call(s.app, "PUT", `/exchange-rates/${date}`, s.owner, { market: "210" });

    const trip = await call(s.app, "GET", `/purchase-trips/${tripId}`, s.owner);

    expect(trip.body.marketRate).toBe("201.0000");
  });

  test("422 DAY_RATES_MISSING without the day's rates, saying which ones", async () => {
    const none = await dayWithRates({});
    const onlyBcv = await dayWithRates({ bcv: "200" });

    const a = await call(s.app, "POST", "/purchase-trips", s.owner, { businessDate: none });
    const b = await call(s.app, "POST", "/purchase-trips", s.owner, { businessDate: onlyBcv });

    expect(a.status).toBe(422);
    expect(errorOf(a.body)).toMatchObject({
      code: "DAY_RATES_MISSING",
      details: { missing: ["bcv", "market"] },
    });
    expect(errorOf(b.body).details).toEqual({ missing: ["market"] });
  });

  test("409 TRIP_ALREADY_OPEN while one trip is still open", async () => {
    await closeOpenTrips(s.storeId);
    const firstDate = await dayWithRates();
    const first = await call(s.app, "POST", "/purchase-trips", s.owner, {
      businessDate: firstDate,
    });
    const second = await call(s.app, "POST", "/purchase-trips", s.owner, {
      businessDate: await dayWithRates(),
    });

    expect(first.status).toBe(201);
    expect(second.status).toBe(409);
    expect(errorOf(second.body)).toMatchObject({
      code: "TRIP_ALREADY_OPEN",
      details: { tripId: tripSchema.parse(first.body).id },
    });
  });

  test("owner only", async () => {
    const date = await dayWithRates();
    for (const [cookie, status] of [
      [s.manager, 403],
      [s.receiver, 403],
      [null, 401],
    ] as const) {
      expect(
        (await call(s.app, "POST", "/purchase-trips", cookie, { businessDate: date })).status,
      ).toBe(status);
    }
  });
});

describe("POST /api/v1/purchase-trips/:id/lines", () => {
  test("tomato crate at the Coche rate: real cost 20.10, unit 0.9136, price 1.40, 4020 Bs", async () => {
    const product = await tomato();
    const tripId = await openTrip();

    const res = await addLine(tripId, {
      productId: product.id,
      stallReference: "Puesto 14",
      packs: "1",
      grossQuantity: "24",
      shrinkage: "2",
      quotedPriceUsd: "20",
    });
    const { trip, line } = lastLine(res.body);

    expect(res.status).toBe(201);
    expect(line).toMatchObject({
      productName: product.name,
      purchaseUnit: "crate",
      saleUnit: "kg",
      stallReference: "Puesto 14",
      usableQuantity: "22.0000",
      supplierRate: "201.0000",
      realCostUsd: "20.1000",
      unitCostUsd: "0.9136",
      margin: "0.5000",
      salePriceUsd: "1.4000",
      amountBs: "4020.0000",
      paymentStatus: "paid",
      receiptStatus: "pending",
    });
    expect(trip).toMatchObject({ totalUsd: "20.1000", totalBs: "4020.0000", lineCount: 1 });
  });

  test("a stall charging the BCV rate: reference case 0.9091 → 1.40", async () => {
    const product = await tomato();
    const tripId = await openTrip();

    const { line } = lastLine(
      (
        await addLine(tripId, {
          productId: product.id,
          packs: "1",
          grossQuantity: "24",
          shrinkage: "2",
          quotedPriceUsd: "20",
          supplierRate: "200",
        })
      ).body,
    );

    expect(line).toMatchObject({
      realCostUsd: "20.0000",
      unitCostUsd: "0.9091",
      salePriceUsd: "1.4000",
    });
  });

  test("quoted price is the line total: 3 crates for 60 USD", async () => {
    const product = await tomato();
    const tripId = await openTrip();

    const { line } = lastLine(
      (
        await addLine(tripId, {
          productId: product.id,
          packs: "3",
          grossQuantity: "72",
          shrinkage: "6",
          quotedPriceUsd: "60",
          supplierRate: "200",
        })
      ).body,
    );

    expect(line).toMatchObject({
      packs: "3.0000",
      usableQuantity: "66.0000",
      unitCostUsd: "0.9091",
      amountBs: "12000.0000",
    });
  });

  test("uses the product's shrinkage and last margin, and remembers only the margin", async () => {
    const product = await tomato({ lastMargin: "0.4", lastShrinkage: "2" });
    const tripId = await openTrip();

    const first = lastLine(
      (
        await addLine(tripId, {
          productId: product.id,
          grossQuantity: "24",
          quotedPriceUsd: "20",
        })
      ).body,
    );
    await addLine(tripId, {
      productId: product.id,
      packs: "1",
      grossQuantity: "25",
      shrinkage: "1",
      quotedPriceUsd: "21",
      margin: "0.6",
    });
    const detail = productDetailSchema.parse(
      (await call(s.app, "GET", `/products/${product.id}`, s.owner)).body,
    );

    expect(first.line).toMatchObject({
      packs: null,
      shrinkage: "2.0000",
      margin: "0.4000",
      supplierRate: "201.0000",
    });
    expect(detail).toMatchObject({
      lastShrinkage: "2.0000",
      lastMargin: "0.6000",
      isUnitLocked: true,
    });
  });

  test("sums the trip totals over every line", async () => {
    const product = await tomato();
    const tripId = await openTrip();
    const supplier = await call(s.app, "POST", "/suppliers", s.owner, { name: uniq("Puesto") });
    await addLine(tripId, {
      productId: product.id,
      packs: "1",
      grossQuantity: "24",
      shrinkage: "2",
      quotedPriceUsd: "20",
    });
    const res = await addLine(tripId, {
      productId: product.id,
      supplierId: (supplier.body as { id: string }).id,
      packs: "2",
      grossQuantity: "48",
      shrinkage: "4",
      quotedPriceUsd: "40",
      paymentStatus: "credit",
    });

    expect(tripDetailSchema.parse(res.body)).toMatchObject({
      totalUsd: "60.3000",
      totalBs: "12060.0000",
      lineCount: 2,
    });
  });

  test("copies the supplier's stall reference when none is typed", async () => {
    const supplier = await call(s.app, "POST", "/suppliers", s.owner, {
      name: uniq("Juan"),
      stallReference: "Nave 3, puesto 7",
    });
    const product = await tomato();
    const tripId = await openTrip();

    const { line } = lastLine(
      (
        await addLine(tripId, {
          productId: product.id,
          supplierId: supplier.body.id,
          packs: "1",
          grossQuantity: "24",
          quotedPriceUsd: "20",
        })
      ).body,
    );

    expect(line).toMatchObject({
      supplierId: supplier.body.id,
      supplierName: supplier.body.name,
      stallReference: "Nave 3, puesto 7",
    });
  });

  test("422 INVALID_PURCHASE_LINE when shrinkage ≥ gross quantity", async () => {
    const product = await tomato();
    const tripId = await openTrip();

    const res = await addLine(tripId, {
      productId: product.id,
      packs: "1",
      grossQuantity: "24",
      shrinkage: "24",
      quotedPriceUsd: "20",
    });

    expect(res.status).toBe(422);
    expect(errorOf(res.body)).toMatchObject({
      code: "INVALID_PURCHASE_LINE",
      details: { fieldErrors: { shrinkage: ["La merma debe ser menor que la cantidad bruta"] } },
    });
  });

  test("422 for an inactive product, an unknown supplier or a margin above 500 %", async () => {
    const inactive = await tomato();
    await call(s.app, "POST", `/products/${inactive.id}/deactivate`, s.owner);
    const product = await tomato();
    const tripId = await openTrip();
    const base = { packs: "1", grossQuantity: "24", quotedPriceUsd: "20" };

    const a = await addLine(tripId, { ...base, productId: inactive.id });
    const b = await addLine(tripId, {
      ...base,
      productId: product.id,
      supplierId: "01a14314-0000-7000-8000-000000000000",
    });
    const c = await addLine(tripId, { ...base, productId: product.id, margin: "6" });

    expect(errorOf(a.body).code).toBe("LINE_PRODUCT_INVALID");
    expect(errorOf(b.body).code).toBe("SUPPLIER_NOT_FOUND");
    expect(errorOf(c.body)).toMatchObject({
      code: "INVALID_PURCHASE_LINE",
      details: { fieldErrors: { margin: ["El margen debe estar entre 0 % y 500 %"] } },
    });
    for (const res of [a, b, c]) expect(res.status).toBe(422);
  });

  test("400 for a malformed body, 403 for other roles", async () => {
    const product = await tomato();
    const tripId = await openTrip();
    const line = { productId: product.id, packs: "1", grossQuantity: "24", quotedPriceUsd: "20" };

    expect((await addLine(tripId, { ...line, grossQuantity: "24,5" })).status).toBe(400);
    expect(
      (await call(s.app, "POST", `/purchase-trips/${tripId}/lines`, s.manager, line)).status,
    ).toBe(403);
  });
});

describe("PATCH / DELETE lines", () => {
  test("correcting a line recomputes it and the totals", async () => {
    const product = await tomato();
    const tripId = await openTrip();
    const { line } = lastLine(
      (
        await addLine(tripId, {
          productId: product.id,
          packs: "1",
          grossQuantity: "24",
          shrinkage: "2",
          quotedPriceUsd: "20",
          supplierRate: "200",
        })
      ).body,
    );

    const res = await call(s.app, "PATCH", `/purchase-trips/${tripId}/lines/${line.id}`, s.owner, {
      quotedPriceUsd: "22",
    });
    const updated = lastLine(res.body);

    expect(res.status).toBe(200);
    expect(updated.line).toMatchObject({
      quotedPriceUsd: "22.0000",
      realCostUsd: "22.0000",
      unitCostUsd: "1.0000",
      salePriceUsd: "1.5000",
      amountBs: "4400.0000",
    });
    expect(updated.trip.totalUsd).toBe("22.0000");
  });

  test("deleting a mistaken line recomputes the totals and is audited", async () => {
    const product = await tomato();
    const tripId = await openTrip();
    await addLine(tripId, {
      productId: product.id,
      packs: "1",
      grossQuantity: "24",
      quotedPriceUsd: "20",
      supplierRate: "200",
    });
    const { line } = lastLine(
      (
        await addLine(tripId, {
          productId: product.id,
          packs: "1",
          grossQuantity: "24",
          quotedPriceUsd: "30",
          supplierRate: "200",
        })
      ).body,
    );

    const res = await call(s.app, "DELETE", `/purchase-trips/${tripId}/lines/${line.id}`, s.owner);
    const logs = await testConnection()
      .db.select()
      .from(schema.auditLogs)
      .where(and(eq(schema.auditLogs.recordId, line.id), eq(schema.auditLogs.action, "delete")));

    expect(tripDetailSchema.parse(res.body)).toMatchObject({ totalUsd: "20.0000", lineCount: 1 });
    expect(logs).toHaveLength(1);
  });

  test("404 LINE_NOT_FOUND for a line of another trip", async () => {
    const product = await tomato();
    const tripA = await openTrip();
    const { line } = lastLine(
      (
        await addLine(tripA, {
          productId: product.id,
          packs: "1",
          grossQuantity: "24",
          quotedPriceUsd: "20",
        })
      ).body,
    );
    const tripB = await openTrip();

    const res = await call(s.app, "PATCH", `/purchase-trips/${tripB}/lines/${line.id}`, s.owner, {
      packs: "2",
    });

    expect(res.status).toBe(404);
    expect(errorOf(res.body).code).toBe("LINE_NOT_FOUND");
  });
});

describe("POST /api/v1/purchase-trips/:id/close", () => {
  test("closes the trip; afterwards lines cannot change (409 TRIP_CLOSED)", async () => {
    const product = await tomato();
    const date = await dayWithRates({ bcv: "200", market: "201", sale: "210" });
    const tripId = await openTrip(date);
    const { line } = lastLine(
      (
        await addLine(tripId, {
          productId: product.id,
          packs: "1",
          grossQuantity: "24",
          quotedPriceUsd: "20",
        })
      ).body,
    );

    const closed = await call(s.app, "POST", `/purchase-trips/${tripId}/close`, s.owner);
    const add = await addLine(tripId, {
      productId: product.id,
      packs: "1",
      grossQuantity: "24",
      quotedPriceUsd: "20",
    });
    const patch = await call(
      s.app,
      "PATCH",
      `/purchase-trips/${tripId}/lines/${line.id}`,
      s.owner,
      { packs: "2" },
    );
    const del = await call(s.app, "DELETE", `/purchase-trips/${tripId}/lines/${line.id}`, s.owner);
    const again = await call(s.app, "POST", `/purchase-trips/${tripId}/close`, s.owner);

    expect(tripDetailSchema.parse(closed.body).status).toBe("closed");
    for (const res of [add, patch, del, again]) {
      expect(res.status).toBe(409);
      expect(errorOf(res.body).code).toBe("TRIP_CLOSED");
    }
  });
});

describe("GET trips", () => {
  test("lists the store's trips and shows one with its lines", async () => {
    const product = await tomato();
    const tripId = await openTrip();
    await addLine(tripId, {
      productId: product.id,
      packs: "1",
      grossQuantity: "24",
      quotedPriceUsd: "20",
    });

    const list = tripListSchema.parse(
      (await call(s.app, "GET", "/purchase-trips?status=open&pageSize=100", s.owner)).body,
    );
    const detail: TripDetail = tripDetailSchema.parse(
      (await call(s.app, "GET", `/purchase-trips/${tripId}`, s.owner)).body,
    );

    expect(list.data.some((t) => t.id === tripId && t.lineCount === 1)).toBe(true);
    expect(list.data.every((t) => t.status === "open")).toBe(true);
    expect(detail.lines).toHaveLength(1);
  });

  test("another store's owner cannot see the trip (404)", async () => {
    const tripId = await openTrip();
    const other = await createStore();
    const stranger = await createUser({ storeId: other.id, role: "owner" });
    const cookie = await signIn(s.app, stranger.email, stranger.password);

    const res = await call(s.app, "GET", `/purchase-trips/${tripId}`, cookie);

    expect(res.status).toBe(404);
    expect(errorOf(res.body).code).toBe("TRIP_NOT_FOUND");
  });

  test("managers and receivers cannot read purchases", async () => {
    expect((await call(s.app, "GET", "/purchase-trips", s.manager)).status).toBe(403);
    expect((await call(s.app, "GET", "/purchase-trips", s.receiver)).status).toBe(403);
  });
});

describe("suppliers", () => {
  test("owner creates and lists suppliers; others cannot", async () => {
    const name = uniq("Puesto");
    const created = await call(s.app, "POST", "/suppliers", s.owner, {
      name,
      phone: "0414-0000000",
    });
    const list = supplierListSchema.parse((await call(s.app, "GET", "/suppliers", s.owner)).body);

    expect(created.status).toBe(201);
    expect(supplierSchema.parse(created.body)).toMatchObject({
      name,
      kind: "wholesale_stall",
      phone: "0414-0000000",
    });
    expect(list.data.some((x) => x.name === name)).toBe(true);
    expect((await call(s.app, "POST", "/suppliers", s.receiver, { name: "X y" })).status).toBe(403);
  });
});
