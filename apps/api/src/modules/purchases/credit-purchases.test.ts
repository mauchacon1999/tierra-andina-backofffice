import { beforeAll, describe, expect, test } from "bun:test";

import { schema } from "@ta/db";
import { testConnection, uniq } from "@ta/db/testing";
import {
  payableDetailSchema,
  priceListSchema,
  receiptTripListSchema,
  supplierSchema,
  tripDetailSchema,
  tripListSchema,
  tripSchema,
  type Product,
} from "@ta/validators";
import { eq } from "drizzle-orm";

import {
  call,
  closeOpenTrips,
  errorOf,
  signInOwnStore,
  type Json,
  type RoleSession,
} from "@/testing/http";

/*
 * Merchandise on credit (docs/modules/payables.md): local purchases and Coche credit lines turn
 * into supplier invoices when the trip closes.
 */

let s: RoleSession;
let categoryId: string;
let dayCounter = 0;

/** A December 2027 day with BCV 200, Coche 201 and sale 210. */
async function day(): Promise<string> {
  dayCounter += 1;
  const date = `2027-12-${String(dayCounter).padStart(2, "0")}`;
  await call(s.app, "PUT", `/exchange-rates/${date}`, s.owner, {
    bcv: "200",
    market: "201",
    sale: "210",
  });
  return date;
}

async function supplier(name = "Cambur"): Promise<string> {
  const res = await call(s.app, "POST", "/suppliers", s.owner, { name: uniq(name), kind: "local" });
  return supplierSchema.parse(res.body).id;
}

async function product(name = "Cambur"): Promise<Product> {
  const res = await call(s.app, "POST", "/products", s.owner, {
    name: uniq(name),
    categoryId,
    purchaseUnit: "kg",
    saleUnit: "kg",
    lastShrinkage: "0",
    lastMargin: "0.5",
  });
  if (res.status !== 201) throw new Error(`product: ${JSON.stringify(res.body)}`);
  return res.body as Product;
}

async function openLocal(supplierId: string, date?: string): Promise<string> {
  const res = await call(s.app, "POST", "/purchase-trips", s.owner, {
    kind: "local",
    supplierId,
    businessDate: date ?? (await day()),
  });
  if (res.status !== 201) throw new Error(`local: ${JSON.stringify(res.body)}`);
  return tripSchema.parse(res.body).id;
}

async function openCoche(date?: string): Promise<string> {
  await closeOpenTrips(s.storeId);
  const res = await call(s.app, "POST", "/purchase-trips", s.owner, {
    businessDate: date ?? (await day()),
  });
  if (res.status !== 201) throw new Error(`trip: ${JSON.stringify(res.body)}`);
  return tripSchema.parse(res.body).id;
}

const addLine = (tripId: string, line: Json) =>
  call(s.app, "POST", `/purchase-trips/${tripId}/lines`, s.owner, line);

const close = (tripId: string, body?: Json) =>
  call(s.app, "POST", `/purchase-trips/${tripId}/close`, s.owner, body);

beforeAll(async () => {
  s = await signInOwnStore();
  const [category] = await testConnection()
    .db.select()
    .from(schema.productCategories)
    .where(eq(schema.productCategories.code, "fruit"));
  if (!category) throw new Error("category");
  categoryId = category.id;
});

describe("local purchases", () => {
  test("open with the supplier at the BCV rate; they do not block the Coche trip", async () => {
    const supplierId = await supplier();
    const coche = await openCoche();

    const res = await call(s.app, "POST", "/purchase-trips", s.owner, {
      kind: "local",
      supplierId,
      businessDate: await day(),
    });

    expect(res.status).toBe(201);
    expect(tripSchema.parse(res.body)).toMatchObject({
      kind: "local",
      supplierId,
      bcvRate: "200.0000",
      marketRate: "200.0000",
      status: "open",
    });
    const second = await openLocal(supplierId);
    expect(second).not.toBe(tripSchema.parse(res.body).id);
    // The Coche trip is still the only open trip of the list and of the truck receipt.
    const coches = tripListSchema.parse(
      (await call(s.app, "GET", "/purchase-trips?status=open", s.owner)).body,
    );
    expect(coches.data.map((t) => t.id)).toEqual([coche]);
    const locals = tripListSchema.parse(
      (await call(s.app, "GET", "/purchase-trips?status=open&kind=local", s.owner)).body,
    );
    expect(locals.data.map((t) => t.kind)).toEqual(["local", "local"]);
    const receipts = receiptTripListSchema.parse(
      (await call(s.app, "GET", "/receipts", s.owner)).body,
    );
    expect(receipts.data.map((t) => t.id)).toEqual([coche]);
  });

  test("400 without a supplier, 422 for an unknown one, 422 without the day's BCV", async () => {
    const date = await day();
    const noSupplier = await call(s.app, "POST", "/purchase-trips", s.owner, {
      kind: "local",
      businessDate: date,
    });
    expect(noSupplier.status).toBe(400);

    const unknown = await call(s.app, "POST", "/purchase-trips", s.owner, {
      kind: "local",
      supplierId: "01a14314-2825-7000-a1d1-bdf734d05999",
      businessDate: date,
    });
    expect(errorOf(unknown.body).code).toBe("SUPPLIER_NOT_FOUND");

    const noRates = await call(s.app, "POST", "/purchase-trips", s.owner, {
      kind: "local",
      supplierId: await supplier(),
      businessDate: "2027-11-30",
    });
    expect(errorOf(noRates.body)).toMatchObject({
      code: "DAY_RATES_MISSING",
      details: { missing: ["bcv"] },
    });
  });

  test("lines take the purchase's supplier and the BCV rate (no Coche premium)", async () => {
    const supplierId = await supplier();
    const tripId = await openLocal(supplierId);

    const res = await addLine(tripId, {
      productId: (await product()).id,
      grossQuantity: "40",
      quotedPriceUsd: "32",
      paymentStatus: "credit",
    });

    expect(res.status).toBe(201);
    expect(tripDetailSchema.parse(res.body).lines[0]).toMatchObject({
      supplierId,
      supplierRate: "200.0000",
      amountBs: "6400.0000",
      realCostUsd: "32.0000",
      unitCostUsd: "0.8000",
      salePriceUsd: "1.2000",
    });
  });

  test("closing on credit: received, priced and one invoice in the chosen currency", async () => {
    const supplierId = await supplier();
    const banana = await product();
    const tripId = await openLocal(supplierId);
    await addLine(tripId, {
      productId: banana.id,
      grossQuantity: "40",
      quotedPriceUsd: "32",
      paymentStatus: "credit",
    });

    const res = await close(tripId, { payableCurrency: "VES", payableDueOn: "2027-12-31" });

    expect(res.status).toBe(200);
    const trip = tripDetailSchema.parse(res.body);
    expect(trip.status).toBe("closed");
    expect(trip.lines[0]).toMatchObject({ receiptStatus: "received", receivedQuantity: "40.0000" });
    expect(trip.payables).toEqual([
      expect.objectContaining({ currency: "VES", total: "6400.0000" }),
    ]);
    expect(trip.payables[0]?.code).toMatch(/^CXP-\d{6}$/);

    const invoice = payableDetailSchema.parse(
      (await call(s.app, "GET", `/payables/${trip.payables[0]!.id}`, s.owner)).body,
    );
    expect(invoice).toMatchObject({
      supplierId,
      tripId,
      dueOn: "2027-12-31",
      balance: "6400.0000",
      status: "pending",
    });
    expect(invoice.lines[0]?.purchaseLine).toMatchObject({
      productId: banana.id,
      grossQuantity: "40.0000",
    });

    const prices = priceListSchema.parse(
      (await call(s.app, "GET", "/price-lists/current", s.owner)).body,
    );
    expect(prices.lines.find((l) => l.productId === banana.id)?.priceUsd).toBe("1.2000");
  });

  test("the panela paid in cash: prices are updated, no invoice", async () => {
    const tripId = await openLocal(await supplier("Panela"));
    await addLine(tripId, {
      productId: (await product("Panela")).id,
      grossQuantity: "10",
      quotedPriceUsd: "15",
      paymentStatus: "paid",
    });

    const trip = tripDetailSchema.parse((await close(tripId)).body);

    expect(trip).toMatchObject({ status: "closed", payables: [] });
  });

  test("422 INVALID_DUE_DATE before the purchase day", async () => {
    const tripId = await openLocal(await supplier());
    const res = await close(tripId, { payableDueOn: "2027-01-01" });
    expect(res.status).toBe(422);
    expect(errorOf(res.body).code).toBe("INVALID_DUE_DATE");
  });
});

describe("Coche credit lines", () => {
  test("a credit line needs its supplier", async () => {
    const tripId = await openCoche();
    const res = await addLine(tripId, {
      productId: (await product()).id,
      grossQuantity: "10",
      quotedPriceUsd: "8",
      paymentStatus: "credit",
    });
    expect(res.status).toBe(422);
    expect(errorOf(res.body).details?.fieldErrors).toEqual({
      supplierId: ["Indica a qué proveedor se le debe"],
    });
  });

  test("closing makes one USD invoice per supplier with its credit lines, no due date", async () => {
    const tripId = await openCoche();
    const stallA = await supplier("Puesto A");
    const stallB = await supplier("Puesto B");
    const banana = (await product()).id;
    await addLine(tripId, {
      productId: banana,
      supplierId: stallA,
      grossQuantity: "10",
      quotedPriceUsd: "8",
      paymentStatus: "credit",
    });
    await addLine(tripId, {
      productId: banana,
      supplierId: stallA,
      grossQuantity: "5",
      quotedPriceUsd: "4.5",
      paymentStatus: "credit",
    });
    await addLine(tripId, {
      productId: banana,
      supplierId: stallB,
      grossQuantity: "20",
      quotedPriceUsd: "15",
      paymentStatus: "credit",
    });
    await addLine(tripId, { productId: banana, grossQuantity: "20", quotedPriceUsd: "15" });

    const trip = tripDetailSchema.parse((await close(tripId)).body);

    expect(trip.payables.map((p) => [p.currency, p.total]).sort()).toEqual([
      ["USD", "12.5000"],
      ["USD", "15.0000"],
    ]);
    const invoice = payableDetailSchema.parse(
      (await call(s.app, "GET", `/payables/${trip.payables[0]!.id}`, s.owner)).body,
    );
    expect(invoice).toMatchObject({ dueOn: null, status: "pending", tripId });

    // Merchandise invoices are corrected through the purchase, not replaced.
    const replaced = await call(s.app, "PUT", `/payables/${invoice.id}`, s.owner, {
      supplierId: invoice.supplierId,
      issuedOn: invoice.issuedOn,
      dueOn: invoice.issuedOn,
      lines: [],
    });
    expect(replaced.status).toBe(400);
    const terms = await call(s.app, "PATCH", `/payables/${invoice.id}/terms`, s.owner, {
      dueOn: "2027-12-31",
    });
    expect(payableDetailSchema.parse(terms.body).dueOn).toBe("2027-12-31");
  });

  test("409 PAYABLE_FROM_PURCHASE when replacing a merchandise invoice", async () => {
    const tripId = await openCoche();
    const stall = await supplier("Puesto");
    await addLine(tripId, {
      productId: (await product()).id,
      supplierId: stall,
      grossQuantity: "10",
      quotedPriceUsd: "8",
      paymentStatus: "credit",
    });
    const trip = tripDetailSchema.parse((await close(tripId)).body);
    const categories = (await call(s.app, "GET", "/expense-categories", s.owner)).body as {
      data: { id: string }[];
    };

    const res = await call(s.app, "PUT", `/payables/${trip.payables[0]!.id}`, s.owner, {
      supplierId: stall,
      issuedOn: trip.businessDate,
      dueOn: trip.businessDate,
      lines: [
        {
          description: "Bolsas",
          expenseCategoryId: categories.data[0]!.id,
          quantity: "1",
          unit: "unit",
          unitPrice: "1",
        },
      ],
    });

    expect(res.status).toBe(409);
    expect(errorOf(res.body).code).toBe("PAYABLE_FROM_PURCHASE");
  });

  test("422 CREDIT_LINE_WITHOUT_SUPPLIER for an older credit line with no supplier", async () => {
    const tripId = await openCoche();
    const added = await addLine(tripId, {
      productId: (await product()).id,
      grossQuantity: "10",
      quotedPriceUsd: "8",
    });
    const lineId = tripDetailSchema.parse(added.body).lines[0]!.id;
    await testConnection()
      .db.update(schema.purchaseLines)
      .set({ paymentStatus: "credit" })
      .where(eq(schema.purchaseLines.id, lineId));

    const res = await close(tripId);

    expect(res.status).toBe(422);
    expect(errorOf(res.body)).toMatchObject({
      code: "CREDIT_LINE_WITHOUT_SUPPLIER",
      details: { lineIds: [lineId] },
    });
  });
});
