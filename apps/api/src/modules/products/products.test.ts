import { beforeAll, describe, expect, test } from "bun:test";

import { schema } from "@ta/db";
import { testConnection, uniq, validPurchaseLine } from "@ta/db/testing";
import {
  productCategoryListSchema,
  productDetailSchema,
  productListSchema,
  productSchema,
  productSummaryListSchema,
  type Product,
} from "@ta/validators";
import { and, eq } from "drizzle-orm";

import { TEST_OWNER } from "@/testing/preload";
import { createTestApp, createUser, fromWeb, signIn, type TestApp } from "@/testing/test-app";

let app: TestApp;
let storeId: string;
let ownerCookie: string;
let managerCookie: string;
let receiverCookie: string;
let categories: Record<string, string>;

beforeAll(async () => {
  app = createTestApp();
  const { db } = testConnection();
  const [store] = await db.select().from(schema.stores).limit(1);
  if (!store) throw new Error("seeded store missing");
  storeId = store.id;

  ownerCookie = await signIn(app, TEST_OWNER.ownerEmail, TEST_OWNER.ownerPassword);
  const manager = await createUser({ storeId, role: "manager" });
  const receiver = await createUser({ storeId, role: "receiver" });
  managerCookie = await signIn(app, manager.email, manager.password);
  receiverCookie = await signIn(app, receiver.email, receiver.password);

  const rows = await db.select().from(schema.productCategories);
  categories = Object.fromEntries(rows.map((r) => [r.code, r.id]));
});

type Json = Record<string, unknown>;

async function call(
  method: string,
  path: string,
  cookie: string | null,
  body?: unknown,
): Promise<{ status: number; body: Json }> {
  const headers: Record<string, string> = fromWeb();
  if (cookie) headers.Cookie = cookie;
  if (body !== undefined) headers["Content-Type"] = "application/json";
  const res = await app.request(`/api/v1${path}`, {
    method,
    headers,
    body: body === undefined ? undefined : JSON.stringify(body),
  });
  return { status: res.status, body: (await res.json()) as Json };
}

const errorOf = (body: Json) => body.error as { code: string; message: string; details?: Json };

function tomato(overrides: Json = {}): Json {
  return {
    name: uniq("Tomate"),
    categoryId: categories.vegetable,
    purchaseUnit: "crate",
    saleUnit: "kg",
    defaultPackQuantity: "24",
    lastShrinkage: "2",
    lastMargin: "0.5",
    ...overrides,
  };
}

async function createAsOwner(overrides: Json = {}): Promise<Product> {
  const res = await call("POST", "/products", ownerCookie, tomato(overrides));
  if (res.status !== 201) throw new Error(`create failed: ${JSON.stringify(res.body)}`);
  return productSchema.parse(res.body);
}

describe("POST /api/v1/products", () => {
  test("creates a product (owner) with 4-decimal strings", async () => {
    const res = await call(
      "POST",
      "/products",
      ownerCookie,
      tomato({ name: "  Tomate   perita X " }),
    );
    const product = productSchema.parse(res.body);

    expect(res.status).toBe(201);
    expect(product).toMatchObject({
      name: "Tomate perita X",
      categoryName: "Hortalizas",
      purchaseUnit: "crate",
      saleUnit: "kg",
      defaultPackQuantity: "24.0000",
      lastShrinkage: "2.0000",
      lastMargin: "0.5000",
      isActive: true,
    });
  });

  test("uses the store default margin when none is sent", async () => {
    const res = await call("POST", "/products", ownerCookie, tomato({ lastMargin: undefined }));

    expect(res.status).toBe(201);
    expect(productSchema.parse(res.body).lastMargin).toBe("0.5000");
  });

  test("writes an audit log row by the owner", async () => {
    const product = await createAsOwner();
    const { db } = testConnection();
    const [log] = await db
      .select()
      .from(schema.auditLogs)
      .where(
        and(eq(schema.auditLogs.tableName, "products"), eq(schema.auditLogs.recordId, product.id)),
      );

    expect(log).toMatchObject({ action: "insert", storeId });
    expect(log?.userId).toBeTruthy();
  });

  test("409 PRODUCT_NAME_TAKEN for the same name with other case and accents", async () => {
    const base = uniq("Cebollín");
    await createAsOwner({ name: base });
    const res = await call(
      "POST",
      "/products",
      ownerCookie,
      tomato({ name: base.replace("Cebollín", "CEBOLLIN") }),
    );

    expect(res.status).toBe(409);
    expect(errorOf(res.body).code).toBe("PRODUCT_NAME_TAKEN");
    expect(errorOf(res.body).message).toBe("Ya existe un producto con ese nombre");
  });

  test("keeps 'Ñame' and 'Name' as different products", async () => {
    const suffix = uniq("x");
    await createAsOwner({ name: `Ñame ${suffix}` });
    const res = await call("POST", "/products", ownerCookie, tomato({ name: `Name ${suffix}` }));

    expect(res.status).toBe(201);
  });

  test("422 INVALID_UNIT_COMBINATION for kg → unit", async () => {
    const res = await call(
      "POST",
      "/products",
      ownerCookie,
      tomato({
        purchaseUnit: "kg",
        saleUnit: "unit",
        defaultPackQuantity: null,
        lastShrinkage: "0",
      }),
    );

    expect(res.status).toBe(422);
    expect(errorOf(res.body)).toMatchObject({
      code: "INVALID_UNIT_COMBINATION",
      details: {
        fieldErrors: { saleUnit: ["Lo que se compra por kilo solo se puede vender por kilo"] },
      },
    });
  });

  test("422 INVALID_PRODUCT_DEFAULTS with the field errors", async () => {
    const res = await call(
      "POST",
      "/products",
      ownerCookie,
      tomato({ defaultPackQuantity: null, lastMargin: "6" }),
    );

    expect(res.status).toBe(422);
    expect(errorOf(res.body)).toMatchObject({
      code: "INVALID_PRODUCT_DEFAULTS",
      details: {
        fieldErrors: {
          defaultPackQuantity: ["Indica cuánto trae cada bulto"],
          lastMargin: ["El margen debe estar entre 0 % y 500 %"],
        },
      },
    });
  });

  test("422 CATEGORY_NOT_FOUND for an unknown category", async () => {
    const res = await call(
      "POST",
      "/products",
      ownerCookie,
      tomato({ categoryId: "01a14314-0000-7000-8000-000000000000" }),
    );

    expect(res.status).toBe(422);
    expect(errorOf(res.body).code).toBe("CATEGORY_NOT_FOUND");
  });

  test("400 VALIDATION_ERROR for a malformed body", async () => {
    const res = await call(
      "POST",
      "/products",
      ownerCookie,
      tomato({ name: "", lastShrinkage: "1,5" }),
    );

    expect(res.status).toBe(400);
    expect(errorOf(res.body).code).toBe("VALIDATION_ERROR");
  });

  test("the manager can add a product, always at the store's default margin", async () => {
    const res = await call("POST", "/products", managerCookie, tomato({ lastMargin: "2" }));

    expect(res.status).toBe(201);
    expect(productSchema.parse(res.body)).toMatchObject({ isActive: true, lastMargin: "0.5000" });
  });

  test.each([
    ["receiver", (): string => receiverCookie, 403],
    ["anonymous", (): null => null, 401],
  ] as const)("%s cannot create (%i)", async (_role, cookie, status) => {
    const res = await call("POST", "/products", cookie(), tomato());

    expect(res.status).toBe(status);
  });
});

describe("POST /api/v1/products/quick", () => {
  test("creates in category 'other' with shrinkage 0 and the default margin", async () => {
    const res = await call("POST", "/products/quick", ownerCookie, {
      name: uniq("Cilantro"),
      purchaseUnit: "bundle",
      saleUnit: "unit",
      defaultPackQuantity: "28",
    });
    const product = productSchema.parse(res.body);

    expect(res.status).toBe(201);
    expect(product).toMatchObject({
      categoryId: categories.other,
      categoryName: "Otros",
      lastShrinkage: "0.0000",
      lastMargin: "0.5000",
    });
  });

  test("applies the unit rules (422) and is owner only (403)", async () => {
    const invalid = await call("POST", "/products/quick", ownerCookie, {
      name: uniq("Perejil"),
      purchaseUnit: "bundle",
      saleUnit: "unit",
    });
    const asManager = await call("POST", "/products/quick", managerCookie, {
      name: uniq("Perejil"),
      purchaseUnit: "kg",
      saleUnit: "kg",
    });

    expect(invalid.status).toBe(422);
    expect(errorOf(invalid.body).code).toBe("INVALID_PRODUCT_DEFAULTS");
    expect(asManager.status).toBe(403);
  });
});

describe("GET /api/v1/products", () => {
  test("401 without a session", async () => {
    expect((await call("GET", "/products", null)).status).toBe(401);
  });

  test("searches ignoring case and accents", async () => {
    const tag = uniq("Ají").replace(/-/g, "");
    const created = await createAsOwner({ name: `${tag} dulce` });

    const res = await call(
      "GET",
      `/products?search=${encodeURIComponent(tag.toUpperCase().replace("Í", "I"))}`,
      ownerCookie,
    );
    const list = productListSchema.parse(res.body);

    expect(res.status).toBe(200);
    expect(list.data.map((p) => p.id)).toEqual([created.id]);
    expect(list.total).toBe(1);
  });

  test("filters by category and purchase unit, and paginates", async () => {
    const tag = uniq("Pag").replace(/-/g, "");
    for (let i = 0; i < 3; i++)
      await createAsOwner({ name: `${tag} ${i}`, categoryId: categories.fruit });
    await createAsOwner({
      name: `${tag} kg`,
      categoryId: categories.fruit,
      purchaseUnit: "kg",
      defaultPackQuantity: null,
    });

    const page1 = productListSchema.parse(
      (
        await call(
          "GET",
          `/products?search=${tag}&categoryId=${categories.fruit}&purchaseUnit=crate&pageSize=2`,
          ownerCookie,
        )
      ).body,
    );
    const page2 = productListSchema.parse(
      (
        await call(
          "GET",
          `/products?search=${tag}&categoryId=${categories.fruit}&purchaseUnit=crate&pageSize=2&page=2`,
          ownerCookie,
        )
      ).body,
    );

    expect(page1.total).toBe(3);
    expect(page1.data).toHaveLength(2);
    expect(page2.data).toHaveLength(1);
    expect(page2.page).toBe(2);
    expect([...page1.data, ...page2.data].every((p) => p.purchaseUnit === "crate")).toBe(true);
  });

  test("sorts by name or category, ascending or descending", async () => {
    const tag = uniq("Ord").replace(/-/g, "");
    await createAsOwner({ name: `${tag} b`, categoryId: categories.vegetable });
    await createAsOwner({ name: `${tag} a`, categoryId: categories.fruit });
    await createAsOwner({ name: `${tag} c`, categoryId: categories.fruit });
    const names = async (sort: string) =>
      productListSchema
        .parse((await call("GET", `/products?search=${tag}&sort=${sort}`, ownerCookie)).body)
        .data.map((p) => p.name.slice(-1));

    expect(await names("name")).toEqual(["a", "b", "c"]);
    expect(await names("-name")).toEqual(["c", "b", "a"]);
    // "Frutas" before "Hortalizas"; within a category, by name.
    expect(await names("category")).toEqual(["a", "c", "b"]);
    expect(await names("-category")).toEqual(["b", "a", "c"]);
    expect(await names("-updated")).toEqual(["c", "a", "b"]);
  });

  test("400 for an unknown sort", async () => {
    const res = await call("GET", "/products?sort=price", ownerCookie);
    expect(res.status).toBe(400);
  });

  test("lists active products by default and inactive ones with isActive=false", async () => {
    const tag = uniq("Act").replace(/-/g, "");
    const active = await createAsOwner({ name: `${tag} a` });
    const inactive = await createAsOwner({ name: `${tag} b` });
    await call("POST", `/products/${inactive.id}/deactivate`, ownerCookie);

    const defaults = productListSchema.parse(
      (await call("GET", `/products?search=${tag}`, ownerCookie)).body,
    );
    const inactives = productListSchema.parse(
      (await call("GET", `/products?search=${tag}&isActive=false`, ownerCookie)).body,
    );

    expect(defaults.data.map((p) => p.id)).toEqual([active.id]);
    expect(inactives.data.map((p) => p.id)).toEqual([inactive.id]);
  });

  test("managers see full products; receivers only id, name and sale unit", async () => {
    const tag = uniq("Rol").replace(/-/g, "");
    await createAsOwner({ name: `${tag} x` });

    const asManager = productListSchema.parse(
      (await call("GET", `/products?search=${tag}`, managerCookie)).body,
    );
    const receiverRes = await call("GET", `/products?search=${tag}`, receiverCookie);
    const asReceiver = productSummaryListSchema.parse(receiverRes.body);

    expect(asManager.data[0]?.lastMargin).toBe("0.5000");
    expect(Object.keys((receiverRes.body.data as Json[])[0] ?? {}).sort()).toEqual([
      "id",
      "name",
      "saleUnit",
    ]);
    expect(asReceiver.data).toHaveLength(1);
  });

  test("400 for an invalid filter", async () => {
    const res = await call("GET", "/products?pageSize=1000", ownerCookie);

    expect(res.status).toBe(400);
    expect(errorOf(res.body).code).toBe("VALIDATION_ERROR");
  });
});

describe("GET /api/v1/products/:id", () => {
  test("returns the detail with isUnitLocked=false for an unused product", async () => {
    const product = await createAsOwner();
    const res = await call("GET", `/products/${product.id}`, ownerCookie);

    expect(res.status).toBe(200);
    expect(productDetailSchema.parse(res.body).isUnitLocked).toBe(false);
  });

  test("404 PRODUCT_NOT_FOUND and 400 for a malformed id", async () => {
    const missing = await call(
      "GET",
      "/products/01a14314-0000-7000-8000-000000000000",
      ownerCookie,
    );
    const malformed = await call("GET", "/products/not-a-uuid", ownerCookie);

    expect(missing.status).toBe(404);
    expect(errorOf(missing.body)).toEqual({
      code: "PRODUCT_NOT_FOUND",
      message: "El producto no existe",
    });
    expect(malformed.status).toBe(400);
  });

  test("receivers get the reduced fields", async () => {
    const product = await createAsOwner();
    const res = await call("GET", `/products/${product.id}`, receiverCookie);

    expect(Object.keys(res.body).sort()).toEqual(["id", "name", "saleUnit"]);
  });
});

async function markAsUsed(productId: string): Promise<void> {
  const { db } = testConnection();
  const [trip] = await db
    .insert(schema.purchaseTrips)
    .values({ storeId, businessDate: "2026-10-12", bcvRate: "200", marketRate: "201" })
    .returning();
  if (!trip) throw new Error("trip");
  await db.insert(schema.purchaseLines).values(validPurchaseLine(trip.id, productId, null));
}

describe("PATCH /api/v1/products/:id", () => {
  test("updates fields and audits the diff", async () => {
    const product = await createAsOwner();
    const res = await call("PATCH", `/products/${product.id}`, ownerCookie, {
      name: `${product.name} manzano`,
      lastMargin: "0.6",
    });
    const { db } = testConnection();
    const logs = await db
      .select()
      .from(schema.auditLogs)
      .where(and(eq(schema.auditLogs.recordId, product.id), eq(schema.auditLogs.action, "update")));

    expect(res.status).toBe(200);
    expect(productDetailSchema.parse(res.body)).toMatchObject({
      name: `${product.name} manzano`,
      lastMargin: "0.6000",
    });
    expect(logs).toHaveLength(1);
    expect(logs[0]?.changes).toMatchObject({
      lastMargin: { from: "0.5000", to: "0.6000" },
    });
  });

  test("allows changing units while the product is unused", async () => {
    const product = await createAsOwner();
    const res = await call("PATCH", `/products/${product.id}`, ownerCookie, {
      purchaseUnit: "kg",
      defaultPackQuantity: null,
      lastShrinkage: "0",
    });

    expect(res.status).toBe(200);
    expect(productDetailSchema.parse(res.body).purchaseUnit).toBe("kg");
  });

  test("409 PRODUCT_UNITS_LOCKED once a purchase line uses it; other fields stay editable", async () => {
    const product = await createAsOwner();
    await markAsUsed(product.id);

    const units = await call("PATCH", `/products/${product.id}`, ownerCookie, { saleUnit: "unit" });
    const name = await call("PATCH", `/products/${product.id}`, ownerCookie, {
      lastShrinkage: "3",
    });
    const detail = await call("GET", `/products/${product.id}`, ownerCookie);

    expect(units.status).toBe(409);
    expect(errorOf(units.body).code).toBe("PRODUCT_UNITS_LOCKED");
    expect(name.status).toBe(200);
    expect(productDetailSchema.parse(detail.body).isUnitLocked).toBe(true);
  });

  test("422 when the merged product breaks a rule (shrinkage ≥ pack)", async () => {
    const product = await createAsOwner();
    const res = await call("PATCH", `/products/${product.id}`, ownerCookie, {
      defaultPackQuantity: "2",
    });

    expect(res.status).toBe(422);
    expect(errorOf(res.body).details).toEqual({
      fieldErrors: { lastShrinkage: ["La merma debe ser menor que la cantidad por bulto"] },
    });
  });

  test("409 when renaming to another product's name; renaming to itself is fine", async () => {
    const first = await createAsOwner();
    const second = await createAsOwner();

    const clash = await call("PATCH", `/products/${second.id}`, ownerCookie, {
      name: first.name.toUpperCase(),
    });
    const same = await call("PATCH", `/products/${first.id}`, ownerCookie, { name: first.name });

    expect(clash.status).toBe(409);
    expect(same.status).toBe(200);
  });

  test("404 for an unknown product, 400 for an empty patch, 403 for a manager", async () => {
    const product = await createAsOwner();

    expect(
      (
        await call("PATCH", "/products/01a14314-0000-7000-8000-000000000000", ownerCookie, {
          name: "Xx",
        })
      ).status,
    ).toBe(404);
    expect((await call("PATCH", `/products/${product.id}`, ownerCookie, {})).status).toBe(400);
    expect(
      (await call("PATCH", `/products/${product.id}`, managerCookie, { name: "Xx" })).status,
    ).toBe(403);
  });
});

describe("POST /api/v1/products/:id/deactivate | activate", () => {
  test("toggles isActive and is idempotent", async () => {
    const product = await createAsOwner();

    const off = await call("POST", `/products/${product.id}/deactivate`, ownerCookie);
    const offAgain = await call("POST", `/products/${product.id}/deactivate`, ownerCookie);
    const on = await call("POST", `/products/${product.id}/activate`, ownerCookie);

    expect(productSchema.parse(off.body).isActive).toBe(false);
    expect(offAgain.status).toBe(200);
    expect(productSchema.parse(on.body).isActive).toBe(true);
  });

  test("is owner only and 404 for unknown ids", async () => {
    const product = await createAsOwner();

    expect((await call("POST", `/products/${product.id}/deactivate`, managerCookie)).status).toBe(
      403,
    );
    expect((await call("POST", `/products/${product.id}/deactivate`, receiverCookie)).status).toBe(
      403,
    );
    expect(
      (await call("POST", "/products/01a14314-0000-7000-8000-000000000000/activate", ownerCookie))
        .status,
    ).toBe(404);
  });
});

describe("GET /api/v1/product-categories", () => {
  test("lists the seeded categories in order, for every role", async () => {
    for (const cookie of [ownerCookie, managerCookie, receiverCookie]) {
      const res = await call("GET", "/product-categories", cookie);
      const list = productCategoryListSchema.parse(res.body);

      expect(list.data.map((c) => c.code)).toEqual([
        "fruit",
        "vegetable",
        "greens",
        "tubers",
        "other",
      ]);
    }
  });

  test("401 without a session", async () => {
    expect((await call("GET", "/product-categories", null)).status).toBe(401);
  });
});
