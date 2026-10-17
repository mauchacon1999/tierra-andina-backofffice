import { beforeAll, describe, expect, test } from "bun:test";

import { schema } from "@ta/db";
import { testConnection, uniq } from "@ta/db/testing";
import {
  shoppingListItemSchema,
  shoppingListSchema,
  tripDetailSchema,
  tripSchema,
} from "@ta/validators";
import { eq } from "drizzle-orm";

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

async function product(): Promise<string> {
  const res = await call(s.app, "POST", "/products", s.owner, {
    name: uniq("Cebolla"),
    categoryId,
    purchaseUnit: "kg",
    saleUnit: "kg",
  });
  if (res.status !== 201) throw new Error(`product: ${JSON.stringify(res.body)}`);
  return (res.body as { id: string }).id;
}

async function addItem(
  productId: string,
  cookie = s.owner,
  note?: string,
): Promise<{ status: number; body: Json }> {
  return call(s.app, "POST", "/shopping-list", cookie, { productId, ...(note ? { note } : {}) });
}

describe("shopping list", () => {
  test("the owner adds what is missing and sees it, oldest first", async () => {
    const first = await product();
    const second = await product();

    const created = await addItem(first, s.owner, "  se acabó  ");
    const again = await addItem(second);

    expect(created.status).toBe(201);
    expect(shoppingListItemSchema.parse(created.body)).toMatchObject({
      productId: first,
      note: "se acabó",
      status: "open",
      purchaseLineId: null,
    });
    const list = shoppingListSchema.parse(
      (await call(s.app, "GET", "/shopping-list", s.owner)).body,
    );
    const ids = list.data.filter((item) => item.productId === first || item.productId === second);
    expect(ids.map((item) => item.productId)).toEqual([first, second]);
    expect(again.status).toBe(201);
  });

  test("the manager can add; the receiver cannot; 401 without a session", async () => {
    const id = await product();
    expect((await addItem(id, s.manager)).status).toBe(201);
    expect((await addItem(id, s.receiver)).status).toBe(403);
    expect((await call(s.app, "GET", "/shopping-list", null)).status).toBe(401);
  });

  test("404 PRODUCT_NOT_FOUND when the product does not exist", async () => {
    const res = await addItem(crypto.randomUUID());
    expect(res.status).toBe(404);
    expect(errorOf(res.body).code).toBe("PRODUCT_NOT_FOUND");
  });

  test("dropping removes it from the pending list; a bought one cannot be dropped", async () => {
    const id = await product();
    const item = shoppingListItemSchema.parse((await addItem(id)).body);

    const dropped = await call(s.app, "POST", `/shopping-list/${item.id}/drop`, s.owner);
    expect(dropped.status).toBe(200);
    expect(shoppingListItemSchema.parse(dropped.body).status).toBe("dropped");

    const list = shoppingListSchema.parse(
      (await call(s.app, "GET", "/shopping-list", s.owner)).body,
    );
    expect(list.data.some((row) => row.id === item.id)).toBe(false);

    const again = await call(s.app, "POST", `/shopping-list/${item.id}/drop`, s.owner);
    expect(again.status).toBe(409);
    expect(errorOf(again.body).code).toBe("SHOPPING_ITEM_NOT_OPEN");
    expect(
      (await call(s.app, "POST", `/shopping-list/${crypto.randomUUID()}/drop`, s.owner)).status,
    ).toBe(404);
  });

  test("buying the product checks off the oldest request; deleting the line puts it back", async () => {
    const id = await product();
    const older = shoppingListItemSchema.parse((await addItem(id, s.owner, "primero")).body);
    const newer = shoppingListItemSchema.parse((await addItem(id, s.owner, "segundo")).body);

    dayCounter += 1;
    const date = `2027-03-${String(dayCounter).padStart(2, "0")}`;
    await call(s.app, "PUT", `/exchange-rates/${date}`, s.owner, {
      bcv: "200",
      market: "201",
      sale: "210",
    });
    const tripId = tripSchema.parse(
      (await call(s.app, "POST", "/purchase-trips", s.owner, { businessDate: date })).body,
    ).id;
    const added = await call(s.app, "POST", `/purchase-trips/${tripId}/lines`, s.owner, {
      productId: id,
      packs: "10",
      grossQuantity: "10",
      quotedPriceUsd: "8",
    });
    const lineId = tripDetailSchema.parse(added.body).lines[0]?.id;
    if (!lineId) throw new Error("line");

    const open = shoppingListSchema.parse(
      (await call(s.app, "GET", "/shopping-list", s.owner)).body,
    );
    expect(open.data.some((row) => row.id === older.id)).toBe(false);
    expect(open.data.some((row) => row.id === newer.id)).toBe(true);

    const [bought] = await testConnection()
      .db.select()
      .from(schema.shoppingListItems)
      .where(eq(schema.shoppingListItems.id, older.id));
    expect(bought).toMatchObject({ status: "bought", purchaseLineId: lineId });

    await call(s.app, "DELETE", `/purchase-trips/${tripId}/lines/${lineId}`, s.owner);
    const restored = shoppingListSchema.parse(
      (await call(s.app, "GET", "/shopping-list", s.owner)).body,
    );
    const back = restored.data.find((row) => row.id === older.id);
    expect(back).toMatchObject({ status: "open", purchaseLineId: null, note: "primero" });
  });
});
