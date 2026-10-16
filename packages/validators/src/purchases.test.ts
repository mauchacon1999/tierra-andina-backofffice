import { describe, expect, test } from "bun:test";

import {
  createSupplierSchema,
  openTripSchema,
  purchaseLineFieldsSchema,
  purchaseLineFormSchema,
  updatePurchaseLineSchema,
} from "./purchases";

const PRODUCT = "01a14314-282a-7000-9464-3fabd385c6ef";

const fieldErrors = (r: { error?: { issues: { path: PropertyKey[]; message: string }[] } }) =>
  Object.fromEntries((r.error?.issues ?? []).map((i) => [i.path.join("."), i.message]));

describe("createSupplierSchema", () => {
  test("cleans the name and defaults to a wholesale stall", () => {
    expect(createSupplierSchema.parse({ name: "  Puesto   de Juan " })).toEqual({
      name: "Puesto de Juan",
      kind: "wholesale_stall",
    });
  });

  test("rejects a missing name", () => {
    expect(fieldErrors(createSupplierSchema.safeParse({ name: " " })).name).toBe(
      "Escribe el nombre",
    );
  });
});

describe("openTripSchema", () => {
  test("needs a valid business date", () => {
    expect(openTripSchema.parse({ businessDate: "2026-10-19" })).toEqual({
      businessDate: "2026-10-19",
    });
    expect(openTripSchema.safeParse({ businessDate: "19/10/2026" }).success).toBe(false);
  });
});

describe("purchaseLineFieldsSchema", () => {
  test("defaults: shrinkage 0, paid; supplier rate and margin left to the API", () => {
    expect(
      purchaseLineFieldsSchema.parse({
        productId: PRODUCT,
        packs: "3",
        grossQuantity: "72",
        quotedPriceUsd: "60",
      }),
    ).toEqual({
      productId: PRODUCT,
      packs: "3",
      grossQuantity: "72",
      shrinkage: "0",
      quotedPriceUsd: "60",
      paymentStatus: "paid",
    });
  });

  test.each([
    ["packs 0", { packs: "0" }, "packs", "La cantidad de bultos debe ser mayor que 0"],
    ["gross 0", { grossQuantity: "0" }, "grossQuantity", "La cantidad bruta debe ser mayor que 0"],
    [
      "price with comma",
      { quotedPriceUsd: "20,5" },
      "quotedPriceUsd",
      "El precio debe ser un número con punto decimal (p. ej. 15.50)",
    ],
    ["supplier rate 0", { supplierRate: "0" }, "supplierRate", "La tasa debe ser mayor que 0"],
  ] as const)("rejects %s", (_l, override, field, message) => {
    const result = purchaseLineFieldsSchema.safeParse({
      productId: PRODUCT,
      packs: "1",
      grossQuantity: "24",
      quotedPriceUsd: "20",
      ...override,
    });
    expect(fieldErrors(result)[field]).toBe(message);
  });
});

describe("updatePurchaseLineSchema", () => {
  test("no defaults on PATCH and at least one field", () => {
    expect(updatePurchaseLineSchema.parse({ shrinkage: "3" })).toEqual({ shrinkage: "3" });
    expect(updatePurchaseLineSchema.safeParse({}).success).toBe(false);
  });
});

describe("purchaseLineFormSchema (web)", () => {
  const FORM = {
    productId: PRODUCT,
    supplierId: "",
    stallReference: " Puesto 14 ",
    packs: "3",
    grossQuantity: "72",
    shrinkage: "6",
    quotedPriceUsd: "60",
    supplierRate: "",
    marginPercent: "50",
    paymentStatus: "credit",
  } as const;

  test("outputs the API payload: % → fraction, empty values dropped", () => {
    expect(purchaseLineFormSchema.parse(FORM)).toEqual({
      productId: PRODUCT,
      supplierId: null,
      stallReference: "Puesto 14",
      packs: "3",
      grossQuantity: "72",
      shrinkage: "6",
      quotedPriceUsd: "60",
      margin: "0.5",
      paymentStatus: "credit",
    });
  });

  test("shrinkage must be below the gross quantity", () => {
    expect(
      fieldErrors(purchaseLineFormSchema.safeParse({ ...FORM, shrinkage: "72" })).shrinkage,
    ).toBe("La merma debe ser menor que la cantidad bruta");
  });

  test("requires a product and reports field errors", () => {
    const errors = fieldErrors(
      purchaseLineFormSchema.safeParse({ ...FORM, productId: "", quotedPriceUsd: "" }),
    );
    expect(errors.productId).toBe("Elige un producto");
    expect(errors.quotedPriceUsd).toBe(
      "El precio debe ser un número con punto decimal (p. ej. 15.50)",
    );
  });

  test("margin percent with up to 2 decimals", () => {
    expect(
      fieldErrors(purchaseLineFormSchema.safeParse({ ...FORM, marginPercent: "12.345" }))
        .marginPercent,
    ).toBe("El margen admite como máximo 2 decimales");
  });
});
