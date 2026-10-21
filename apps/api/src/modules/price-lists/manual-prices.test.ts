import { beforeAll, describe, expect, test } from "bun:test";

import { toBusinessDate } from "@ta/core";
import { schema } from "@ta/db";
import { testConnection, uniq } from "@ta/db/testing";
import {
  manualPriceListSchema,
  manualPriceRowSchema,
  priceListSchema,
  tripSchema,
  type ManualPriceRow,
  type Product,
} from "@ta/validators";
import { and, eq } from "drizzle-orm";

import { call, closeOpenTrips, errorOf, signInOwnStore, type RoleSession } from "@/testing/http";

/*
 * "Precio manual" (domain-model §3.4): the owner types a shelf price in bolívares; it is
 * published as a new list. Products can be marked for the list copied to WhatsApp.
 */

let s: RoleSession;
let categoryId: string;
const today = toBusinessDate(new Date());

async function product(name: string, overrides: Record<string, unknown> = {}): Promise<Product> {
  const res = await call(s.app, "POST", "/products", s.owner, {
    name: uniq(name),
    categoryId,
    purchaseUnit: "kg",
    saleUnit: "kg",
    lastShrinkage: "0",
    lastMargin: "0.5",
    ...overrides,
  });
  if (res.status !== 201) throw new Error(`product: ${JSON.stringify(res.body)}`);
  return res.body as Product;
}

/**
 * A Coche trip with 10 kg (2 of shrinkage) bought for 8 $ each, closed at sale rate 200.
 * `lines` changes the line of a product (crates…).
 */
async function buyAndClose(
  productIds: string[],
  lines: Record<string, Record<string, unknown>> = {},
): Promise<void> {
  await closeOpenTrips(s.storeId);
  const date = "2028-02-01";
  await call(s.app, "PUT", `/exchange-rates/${date}`, s.owner, {
    bcv: "200",
    market: "200",
    sale: "200",
  });
  const trip = tripSchema.parse(
    (await call(s.app, "POST", "/purchase-trips", s.owner, { businessDate: date })).body,
  );
  for (const productId of productIds) {
    await call(s.app, "POST", `/purchase-trips/${trip.id}/lines`, s.owner, {
      productId,
      grossQuantity: "10",
      shrinkage: "2",
      quotedPriceUsd: "8",
      ...lines[productId],
    });
  }
  const closed = await call(s.app, "POST", `/purchase-trips/${trip.id}/close`, s.owner);
  if (closed.status !== 200) throw new Error(`close: ${JSON.stringify(closed.body)}`);
}

async function rows(session = s): Promise<Map<string, ManualPriceRow>> {
  const res = await call(session.app, "GET", "/price-lists/manual", session.owner);
  const list = manualPriceListSchema.parse(res.body);
  return new Map(list.data.map((row) => [row.productId, row]));
}

const setPrice = (productId: string, priceBs: unknown, cookie = s.owner) =>
  call(s.app, "PUT", `/price-lists/manual/${productId}`, cookie, { priceBs });

async function currentList() {
  return priceListSchema.parse((await call(s.app, "GET", "/price-lists/current", s.owner)).body);
}

beforeAll(async () => {
  s = await signInOwnStore();
  const [category] = await testConnection()
    .db.select()
    .from(schema.productCategories)
    .where(eq(schema.productCategories.code, "vegetable"));
  if (!category) throw new Error("category");
  categoryId = category.id;
});

describe("GET /api/v1/price-lists/manual", () => {
  test("every active product with its last purchase price per crate or kilo", async () => {
    const tomato = await product("Tomate");
    const yam = await product("Ñame");
    const avocado = await product("Aguacate", {
      purchaseUnit: "crate",
      defaultPackQuantity: "20",
    });
    await buyAndClose([tomato.id, avocado.id], {
      [avocado.id]: { packs: "2", grossQuantity: "40", quotedPriceUsd: "30" },
    });

    const res = await call(s.app, "GET", "/price-lists/manual", s.owner);
    const byId = await rows();

    expect(res.status).toBe(200);
    expect(manualPriceListSchema.parse(res.body).saleRate).toBe("200.0000");
    expect(byId.get(tomato.id)).toMatchObject({
      lastPurchase: { priceUsd: "0.8000", per: "saleUnit", purchaseUnit: "kg" },
      priceUsd: "1.5000",
      shareOnWhatsapp: false,
    });
    expect(byId.get(tomato.id)?.priceBs).not.toBeNull();
    expect(byId.get(avocado.id)?.lastPurchase).toEqual({
      priceUsd: "15.0000",
      per: "pack",
      purchaseUnit: "crate",
    });
    expect(byId.get(yam.id)).toMatchObject({ lastPurchase: null, priceUsd: null, priceBs: null });
  });

  test("403 for the manager", async () => {
    expect((await call(s.app, "GET", "/price-lists/manual", s.manager)).status).toBe(403);
  });
});

describe("PUT /api/v1/price-lists/manual/:productId", () => {
  test("publishes a new list with that price as typed; the others stay", async () => {
    const tomato = await product("Tomate");
    const onion = await product("Cebolla");
    await buyAndClose([tomato.id, onion.id]);
    const before = await currentList();
    const onionBefore = before.lines.find((line) => line.productId === onion.id);

    const res = await setPrice(tomato.id, "450");
    const after = await currentList();

    expect(res.status).toBe(200);
    expect(manualPriceRowSchema.parse(res.body)).toMatchObject({
      priceBs: "450.0000",
      priceUsd: "2.2500",
    });
    expect(after.id).not.toBe(before.id);
    expect(after.saleRate).toBe(before.saleRate);
    expect(after.lines.find((line) => line.productId === tomato.id)).toMatchObject({
      priceBs: "450.0000",
      margin: "1.2500",
    });
    expect(after.lines.find((line) => line.productId === onion.id)).toEqual({
      ...onionBefore!,
      id: expect.any(String),
    });
    const audit = await testConnection()
      .db.select()
      .from(schema.auditLogs)
      .where(and(eq(schema.auditLogs.recordId, after.id), eq(schema.auditLogs.action, "insert")));
    expect(audit).toHaveLength(1);
  });

  test("the manager sees the manual price in the price list", async () => {
    const yam = await product("Ñame");
    await setPrice(yam.id, "350");

    const res = await call(s.app, "GET", "/price-lists/current", s.manager);

    expect(res.status).toBe(200);
    expect(
      priceListSchema.parse(res.body).lines.find((line) => line.productId === yam.id),
    ).toMatchObject({ priceBs: "350.0000", unitCostUsd: null, margin: null });
  });

  test("the same price again publishes nothing", async () => {
    const tomato = await product("Tomate");
    await buyAndClose([tomato.id]);
    await setPrice(tomato.id, "500");
    const before = await currentList();

    const res = await setPrice(tomato.id, "500.00");

    expect(res.status).toBe(200);
    expect((await currentList()).id).toBe(before.id);
  });

  test("a price below cost has no margin; a product never bought has no cost", async () => {
    const tomato = await product("Tomate");
    const yam = await product("Ñame");
    await buyAndClose([tomato.id]);

    await setPrice(tomato.id, "100");
    await setPrice(yam.id, "350.5");
    const list = await currentList();

    expect(list.lines.find((line) => line.productId === tomato.id)).toMatchObject({
      priceUsd: "0.5000",
      margin: null,
    });
    expect(list.lines.find((line) => line.productId === yam.id)).toMatchObject({
      priceBs: "350.5000",
      priceUsd: "1.7525",
      unitCostUsd: null,
      margin: null,
    });
  });

  test("without a list, uses today's sale rate; 422 SALE_RATE_MISSING without one", async () => {
    const fresh = await signInOwnStore();
    const yam = await product("Ñame");
    const put = (body: unknown) =>
      call(fresh.app, "PUT", `/price-lists/manual/${yam.id}`, fresh.owner, body);

    const missing = await put({ priceBs: "300" });
    await call(fresh.app, "PUT", `/exchange-rates/${today}`, fresh.owner, { sale: "300" });
    const saved = await put({ priceBs: "300" });

    expect(missing.status).toBe(422);
    expect(errorOf(missing.body).code).toBe("SALE_RATE_MISSING");
    expect(saved.status).toBe(200);
    expect(manualPriceRowSchema.parse(saved.body).priceUsd).toBe("1.0000");
    expect((await rows(fresh)).get(yam.id)?.priceBs).toBe("300.0000");
  });

  test("400 for 0 or a comma, 403 for the manager, 404 for an unknown product", async () => {
    const tomato = await product("Tomate");

    const zero = await setPrice(tomato.id, "0");
    const comma = await setPrice(tomato.id, "450,5");
    const manager = await setPrice(tomato.id, "450", s.manager);
    const missing = await setPrice("01900000-0000-7000-8000-000000000000", "450");

    expect(zero.status).toBe(400);
    expect(errorOf(zero.body).details).toMatchObject({
      fieldErrors: { priceBs: ["El precio debe ser mayor que 0"] },
    });
    expect(comma.status).toBe(400);
    expect(manager.status).toBe(403);
    expect(missing.status).toBe(404);
    expect(errorOf(missing.body).code).toBe("PRODUCT_NOT_FOUND");
  });
});

describe("PATCH /api/v1/products/:id/whatsapp", () => {
  test("turns it on and off; the manual list shows it", async () => {
    const tomato = await product("Tomate");

    const on = await call(s.app, "PATCH", `/products/${tomato.id}/whatsapp`, s.owner, {
      shareOnWhatsapp: true,
    });
    const shown = (await rows()).get(tomato.id)?.shareOnWhatsapp;
    const off = await call(s.app, "PATCH", `/products/${tomato.id}/whatsapp`, s.owner, {
      shareOnWhatsapp: false,
    });

    expect(on.status).toBe(200);
    expect(on.body).toEqual({ id: tomato.id, shareOnWhatsapp: true });
    expect(shown).toBe(true);
    expect(off.body).toEqual({ id: tomato.id, shareOnWhatsapp: false });
  });

  test("400 without a boolean, 403 for the manager, 404 for an unknown product", async () => {
    const tomato = await product("Tomate");
    const path = `/products/${tomato.id}/whatsapp`;

    const invalid = await call(s.app, "PATCH", path, s.owner, { shareOnWhatsapp: "sí" });
    const manager = await call(s.app, "PATCH", path, s.manager, { shareOnWhatsapp: true });
    const missing = await call(
      s.app,
      "PATCH",
      "/products/01900000-0000-7000-8000-000000000000/whatsapp",
      s.owner,
      { shareOnWhatsapp: true },
    );

    expect(invalid.status).toBe(400);
    expect(errorOf(invalid.body).details).toMatchObject({
      fieldErrors: { shareOnWhatsapp: ["Indica si va en la lista de WhatsApp"] },
    });
    expect(manager.status).toBe(403);
    expect(missing.status).toBe(404);
  });
});
