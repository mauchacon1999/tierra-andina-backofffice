import { beforeAll, describe, expect, test } from "bun:test";

import { schema } from "@ta/db";
import { testConnection, uniq } from "@ta/db/testing";
import { priceListSchema, tripDetailSchema, tripSchema } from "@ta/validators";
import { eq } from "drizzle-orm";

import type { LineRecord } from "@/modules/purchases/purchases.repository";
import { pricesFromTrip } from "@/modules/price-lists/price-lists.service";
import { call, errorOf, signInRoles, type Json, type RoleSession } from "@/testing/http";

let s: RoleSession;
let categoryId: string;
let dayCounter = 0;

beforeAll(async () => {
  s = await signInRoles();
  const [category] = await testConnection()
    .db.select()
    .from(schema.productCategories)
    .where(eq(schema.productCategories.code, "vegetable"));
  if (!category) throw new Error("category");
  categoryId = category.id;
});

async function product(purchaseUnit: "crate" | "kg" = "crate"): Promise<string> {
  const res = await call(s.app, "POST", "/products", s.owner, {
    name: uniq("Tomate"),
    categoryId,
    purchaseUnit,
    saleUnit: "kg",
    ...(purchaseUnit === "kg" ? {} : { defaultPackQuantity: "24" }),
    lastShrinkage: purchaseUnit === "kg" ? "0" : "2",
    lastMargin: "0.5",
  });
  if (res.status !== 201) throw new Error(`product: ${JSON.stringify(res.body)}`);
  return (res.body as { id: string }).id;
}

/** Opens a trip on its own day. Sale rate is omitted unless `withSale` is set. */
async function openTrip(withSale: boolean): Promise<string> {
  dayCounter += 1;
  const date = `2027-04-${String(dayCounter).padStart(2, "0")}`;
  const rates: Json = { bcv: "200", market: "201" };
  if (withSale) rates.sale = "210";
  const saved = await call(s.app, "PUT", `/exchange-rates/${date}`, s.owner, rates);
  if (saved.status !== 200) throw new Error(`rates: ${JSON.stringify(saved.body)}`);
  const trip = await call(s.app, "POST", "/purchase-trips", s.owner, { businessDate: date });
  if (trip.status !== 201) throw new Error(`trip: ${JSON.stringify(trip.body)}`);
  return tripSchema.parse(trip.body).id;
}

async function buy(tripId: string, productId: string, line: Json): Promise<string> {
  const added = await call(s.app, "POST", `/purchase-trips/${tripId}/lines`, s.owner, {
    productId,
    ...line,
  });
  const id = tripDetailSchema.parse(added.body).lines.at(-1)?.id;
  if (!id) throw new Error(`line: ${JSON.stringify(added.body)}`);
  return id;
}

async function listForTrip(tripId: string) {
  const [list] = await testConnection()
    .db.select()
    .from(schema.priceLists)
    .where(eq(schema.priceLists.tripId, tripId));
  if (!list) return undefined;
  const lines = await testConnection()
    .db.select()
    .from(schema.priceListLines)
    .where(eq(schema.priceListLines.priceListId, list.id));
  return { list, lines };
}

function boughtLine(overrides: Partial<LineRecord>): LineRecord {
  return {
    id: "line",
    productId: "product",
    receiptStatus: "received",
    unitCostUsd: "0.9136",
    margin: "0.5000",
    salePriceUsd: "1.4000",
    receivedUnitCostUsd: null,
    receivedSalePriceUsd: null,
    ...overrides,
  } as LineRecord;
}

describe("pricesFromTrip", () => {
  test("keeps the previous price of a missing product and uses what arrived when partial", () => {
    const previous = [
      {
        productId: "tomato",
        unitCostUsd: "0.9136",
        margin: "0.5000",
        priceUsd: "1.4000",
        sourcePurchaseLineId: "old",
      },
    ];
    const prices = pricesFromTrip(previous, [
      boughtLine({ id: "miss", productId: "tomato", receiptStatus: "missing" }),
      boughtLine({
        id: "part",
        productId: "onion",
        receiptStatus: "partial",
        receivedUnitCostUsd: "1.3705",
        receivedSalePriceUsd: "2.1000",
      }),
    ]);
    expect(prices).toEqual([
      {
        productId: "tomato",
        unitCostUsd: "0.9136",
        margin: "0.5000",
        priceUsd: "1.4000",
        sourcePurchaseLineId: "old",
      },
      {
        productId: "onion",
        unitCostUsd: "1.3705",
        margin: "0.5000",
        priceUsd: "2.1000",
        sourcePurchaseLineId: "part",
      },
    ]);
  });

  test("publishes nothing when every line is missing and there is no previous list", () => {
    expect(pricesFromTrip([], [boughtLine({ receiptStatus: "missing" })])).toBeUndefined();
  });
});

describe("closing a trip publishes sale prices", () => {
  test("422 SALE_RATE_MISSING and the trip stays open without the day's sale rate", async () => {
    const tripId = await openTrip(false);
    await buy(tripId, await product(), { packs: "1", grossQuantity: "24", quotedPriceUsd: "20" });

    const res = await call(s.app, "POST", `/purchase-trips/${tripId}/close`, s.owner);

    expect(res.status).toBe(422);
    expect(errorOf(res.body)).toMatchObject({
      code: "SALE_RATE_MISSING",
      details: { missing: ["sale"] },
    });
    expect(
      tripSchema.parse((await call(s.app, "GET", `/purchase-trips/${tripId}`, s.owner)).body)
        .status,
    ).toBe("open");
  });

  test("prices what arrived in USD and Bs, and keeps products from the previous list", async () => {
    const tomato = await product();
    const onion = await product("kg");
    const first = await openTrip(true);
    await buy(first, tomato, {
      packs: "1",
      grossQuantity: "24",
      shrinkage: "2",
      quotedPriceUsd: "20",
      margin: "0.5",
    });
    expect((await call(s.app, "POST", `/purchase-trips/${first}/close`, s.owner)).status).toBe(200);

    // 20 × 201/200 = 20.10 over 22 kg → 0.9136 × 1.5 → 1.40 USD; × 210 Bs, step 1 → 294.
    const published = await listForTrip(first);
    expect(published?.lines).toEqual([
      expect.objectContaining({ productId: tomato, priceUsd: "1.4000", priceBs: "294.0000" }),
    ]);

    const second = await openTrip(true);
    const onionLine = await buy(second, onion, {
      packs: "10",
      grossQuantity: "10",
      shrinkage: "0",
      quotedPriceUsd: "5",
      margin: "0.5",
    });
    const tomatoLine = await buy(second, tomato, {
      packs: "1",
      grossQuantity: "24",
      shrinkage: "2",
      quotedPriceUsd: "20",
      margin: "0.5",
    });
    await call(s.app, "PATCH", `/purchase-trips/${second}/lines/${tomatoLine}/receipt`, s.owner, {
      status: "missing",
    });
    expect((await call(s.app, "POST", `/purchase-trips/${second}/close`, s.owner)).status).toBe(
      200,
    );

    const next = await listForTrip(second);
    const onionPrice = next?.lines.find((line) => line.productId === onion);
    // Missing goods do not replace the price. 5 × 201/200 over 10 kg → 0.80 USD, 168 Bs.
    expect(next?.lines.some((line) => line.sourcePurchaseLineId === tomatoLine)).toBe(false);
    expect(onionPrice).toMatchObject({
      sourcePurchaseLineId: onionLine,
      priceUsd: "0.8000",
      priceBs: "168.0000",
    });
  });

  test("a partial receipt prices what arrived, not what was bought", async () => {
    const tomato = await product();
    const tripId = await openTrip(true);
    const lineId = await buy(tripId, tomato, {
      packs: "3",
      grossQuantity: "72",
      shrinkage: "6",
      quotedPriceUsd: "60",
      margin: "0.5",
    });
    await call(s.app, "PATCH", `/purchase-trips/${tripId}/lines/${lineId}/receipt`, s.owner, {
      status: "partial",
      receivedPacks: "2",
    });
    expect((await call(s.app, "POST", `/purchase-trips/${tripId}/close`, s.owner)).status).toBe(
      200,
    );

    // Same real cost over 44 kg → sale 2.10 USD × 210 = 441 Bs.
    const published = await listForTrip(tripId);
    expect(published?.lines.find((line) => line.productId === tomato)).toMatchObject({
      priceUsd: "2.1000",
      priceBs: "441.0000",
    });
  });

  test("the owner and the manager can read the current list; the receiver cannot", async () => {
    const tripId = await openTrip(true);
    await buy(tripId, await product("kg"), {
      packs: "4",
      grossQuantity: "4",
      shrinkage: "0",
      quotedPriceUsd: "4",
      margin: "0.5",
    });
    expect((await call(s.app, "POST", `/purchase-trips/${tripId}/close`, s.owner)).status).toBe(
      200,
    );

    const current = await call(s.app, "GET", "/price-lists/current", s.owner);
    expect(current.status).toBe(200);
    expect(priceListSchema.parse(current.body).lines.length).toBeGreaterThan(0);
    expect((await call(s.app, "GET", "/price-lists/current", s.manager)).status).toBe(200);
    expect((await call(s.app, "GET", "/price-lists/current", s.receiver)).status).toBe(403);
    expect((await call(s.app, "GET", "/price-lists/current", null)).status).toBe(401);
  });
});
