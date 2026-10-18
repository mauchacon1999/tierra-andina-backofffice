import { describe, expect, test } from "bun:test";

import {
  createSupplierSchema,
  closeTripSchema,
  openTripSchema,
  partialReceiptFormSchema,
  purchaseLineFieldsSchema,
  purchaseLineFormSchema,
  setReceiptSchema,
  updatePurchaseLineSchema,
} from "./purchases";
import { formatValidationMessage as text } from "./messages";

const PRODUCT = "01a14314-282a-7000-9464-3fabd385c6ef";

const fieldErrors = (r: { error?: { issues: { path: PropertyKey[]; message: string }[] } }) =>
  Object.fromEntries((r.error?.issues ?? []).map((i) => [i.path.join("."), text(i.message)]));

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
      kind: "market",
    });
    expect(openTripSchema.safeParse({ businessDate: "19/10/2026" }).success).toBe(false);
  });

  test("a local purchase needs its supplier", () => {
    const supplierId = "01a14314-2825-7000-a1d1-bdf734d05981";
    expect(openTripSchema.parse({ businessDate: "2026-10-19", kind: "local", supplierId })).toEqual(
      { businessDate: "2026-10-19", kind: "local", supplierId },
    );
    const missing = openTripSchema.safeParse({ businessDate: "2026-10-19", kind: "local" });
    expect(missing.error?.issues.map((i) => [i.path.join("."), text(i.message)])).toEqual([
      ["supplierId", "Elige el proveedor"],
    ]);
  });
});

describe("closeTripSchema", () => {
  test("no body → USD invoices without due date; a local purchase may say both", () => {
    expect(closeTripSchema.parse(undefined)).toEqual({ payableCurrency: "USD" });
    expect(closeTripSchema.parse({ payableCurrency: "VES", payableDueOn: "2026-10-25" })).toEqual({
      payableCurrency: "VES",
      payableDueOn: "2026-10-25",
    });
    expect(closeTripSchema.safeParse({ payableCurrency: "EUR" }).success).toBe(false);
  });
});

describe("purchaseLineFieldsSchema", () => {
  test("defaults payment to paid; omitted packs and shrinkage are left to the API", () => {
    expect(
      purchaseLineFieldsSchema.parse({
        productId: PRODUCT,
        grossQuantity: "72",
        quotedPriceUsd: "60",
      }),
    ).toEqual({
      productId: PRODUCT,
      grossQuantity: "72",
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
    packs: "",
    grossQuantity: "72",
    quotedPriceUsd: "60",
    marginPercent: "50",
    paymentStatus: "credit",
  } as const;

  test("outputs the API payload: empty crates omitted, % → fraction", () => {
    expect(purchaseLineFormSchema.parse(FORM)).toEqual({
      productId: PRODUCT,
      packs: null,
      grossQuantity: "72",
      quotedPriceUsd: "60",
      margin: "0.5",
      paymentStatus: "credit",
    });
    expect(purchaseLineFormSchema.parse({ ...FORM, packs: "3" }).packs).toBe("3");
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

describe("setReceiptSchema (truck receipt)", () => {
  test("one shape per status; a partial receipt needs the packs that arrived", () => {
    expect(setReceiptSchema.parse({ status: "received" })).toEqual({ status: "received" });
    expect(setReceiptSchema.parse({ status: "missing", note: " no llegó " })).toEqual({
      status: "missing",
      note: "no llegó",
    });
    expect(setReceiptSchema.parse({ status: "pending" })).toEqual({ status: "pending" });
    expect(
      setReceiptSchema.parse({ status: "partial", receivedPacks: "2", receivedQuantity: "47.5" }),
    ).toEqual({ status: "partial", receivedPacks: "2", receivedQuantity: "47.5" });
    expect(fieldErrors(setReceiptSchema.safeParse({ status: "partial" }))).toHaveProperty(
      "receivedPacks",
    );
  });

  test("rejects an unknown status and non-positive quantities", () => {
    expect(setReceiptSchema.safeParse({ status: "lost" }).success).toBe(false);
    expect(
      fieldErrors(setReceiptSchema.safeParse({ status: "partial", receivedPacks: "0" })),
    ).toEqual({ receivedPacks: "Lo recibido debe ser mayor que 0" });
  });
});

describe("partialReceiptFormSchema (web)", () => {
  test("empty weight and note are left out", () => {
    expect(
      partialReceiptFormSchema.parse({ receivedPacks: " 2 ", receivedQuantity: "", note: "" }),
    ).toEqual({ status: "partial", receivedPacks: "2" });
  });

  test("reports errors on the form fields", () => {
    expect(
      fieldErrors(
        partialReceiptFormSchema.safeParse({
          receivedPacks: "",
          receivedQuantity: "1,5",
          note: "",
        }),
      ),
    ).toEqual({
      receivedPacks: "Lo recibido debe ser un número con punto decimal (p. ej. 15.50)",
      receivedQuantity: "El peso recibido debe ser un número con punto decimal (p. ej. 15.50)",
    });
  });
});
