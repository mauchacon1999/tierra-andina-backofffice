import { describe, expect, test } from "bun:test";

import {
  createProductSchema,
  productFormSchema,
  productListQuerySchema,
  productRuleIssues,
  quickCreateProductSchema,
  quickProductFormSchema,
  updateProductSchema,
} from "./products";
import { formatValidationMessage as text } from "./messages";

const CATEGORY = "01a14314-2825-7000-a1d1-bdf734d05981";

const VALID = {
  name: "Tomate perita",
  categoryId: CATEGORY,
  purchaseUnit: "crate",
  saleUnit: "kg",
  defaultPackQuantity: "24",
  lastShrinkage: "2",
  lastMargin: "0.5",
} as const;

/** Map of field → messages, to assert on what the form would show. */
function errorsOf(result: {
  success: boolean;
  error?: { issues: { path: PropertyKey[]; message: string }[] };
}) {
  const out: Record<string, string[]> = {};
  for (const issue of result.error?.issues ?? []) {
    const key = issue.path.join(".") || "(form)";
    (out[key] ??= []).push(text(issue.message));
  }
  return out;
}

describe("createProductSchema", () => {
  test("accepts a valid crate product and cleans the name", () => {
    expect(createProductSchema.parse({ ...VALID, name: "  Tomate   perita " })).toEqual(VALID);
  });

  test("defaults: no pack quantity (null), shrinkage 0, margin left to the API", () => {
    const parsed = createProductSchema.parse({
      name: "Ocumo",
      categoryId: CATEGORY,
      purchaseUnit: "kg",
      saleUnit: "kg",
    });

    expect(parsed).toEqual({
      name: "Ocumo",
      categoryId: CATEGORY,
      purchaseUnit: "kg",
      saleUnit: "kg",
      defaultPackQuantity: null,
      lastShrinkage: "0",
    });
  });

  test.each([
    ["too short", "T", "El nombre debe tener al menos 2 caracteres"],
    ["only spaces", "   ", "Escribe el nombre"],
    ["too long", "x".repeat(61), "El nombre admite como máximo 60 caracteres"],
  ])("rejects a name %s", (_label, name, message) => {
    expect(errorsOf(createProductSchema.safeParse({ ...VALID, name })).name).toEqual([message]);
  });

  test("rejects kg → unit with a message on the sale unit", () => {
    const result = createProductSchema.safeParse({
      ...VALID,
      purchaseUnit: "kg",
      saleUnit: "unit",
      defaultPackQuantity: null,
      lastShrinkage: "0",
    });

    expect(errorsOf(result).saleUnit).toEqual([
      "Lo que se compra por kilo solo se puede vender por kilo",
    ]);
  });

  test.each([
    [
      "crate without pack quantity",
      { defaultPackQuantity: null, lastShrinkage: "0" },
      "defaultPackQuantity",
      "Indica cuánto trae cada bulto",
    ],
    [
      "kg with pack quantity",
      { purchaseUnit: "kg", lastShrinkage: "0" },
      "defaultPackQuantity",
      "Los productos por kilo no llevan cantidad por bulto",
    ],
    [
      "pack quantity 0",
      { defaultPackQuantity: "0", lastShrinkage: "0" },
      "defaultPackQuantity",
      "La cantidad por bulto debe ser mayor que 0",
    ],
    [
      "shrinkage equal to the pack",
      { lastShrinkage: "24" },
      "lastShrinkage",
      "La merma debe ser menor que la cantidad por bulto",
    ],
    [
      "margin above 500 %",
      { lastMargin: "5.5" },
      "lastMargin",
      "El margen debe estar entre 0 % y 500 %",
    ],
    [
      "negative shrinkage",
      { lastShrinkage: "-1" },
      "lastShrinkage",
      "La merma no puede ser menor que 0",
    ],
    [
      "pack with 5 decimals",
      { defaultPackQuantity: "24.12345" },
      "defaultPackQuantity",
      "La cantidad por bulto admite como máximo 4 decimales",
    ],
  ] as const)("rejects %s", (_label, override, field, message) => {
    expect(errorsOf(createProductSchema.safeParse({ ...VALID, ...override }))[field]).toEqual([
      message,
    ]);
  });

  test("requires a category", () => {
    expect(
      errorsOf(createProductSchema.safeParse({ ...VALID, categoryId: "" })).categoryId,
    ).toEqual(["Elige una categoría"]);
  });
});

describe("quickCreateProductSchema", () => {
  test("accepts name, units and pack quantity only", () => {
    expect(
      quickCreateProductSchema.parse({
        name: "Cilantro",
        purchaseUnit: "bundle",
        saleUnit: "unit",
        defaultPackQuantity: "28",
      }),
    ).toEqual({
      name: "Cilantro",
      purchaseUnit: "bundle",
      saleUnit: "unit",
      defaultPackQuantity: "28",
    });
  });

  test("still enforces the unit rules", () => {
    const result = quickCreateProductSchema.safeParse({
      name: "Cilantro",
      purchaseUnit: "bundle",
      saleUnit: "unit",
    });

    expect(errorsOf(result).defaultPackQuantity).toEqual(["Indica cuánto trae cada bulto"]);
  });
});

describe("updateProductSchema", () => {
  test("keeps omitted fields undefined (no defaults on PATCH)", () => {
    expect(updateProductSchema.parse({ name: "Tomate manzano" })).toEqual({
      name: "Tomate manzano",
    });
  });

  test("rejects an empty update", () => {
    expect(updateProductSchema.safeParse({}).success).toBe(false);
  });
});

describe("productRuleIssues (re-check after merging a PATCH)", () => {
  test("returns the same messages as the schemas", () => {
    const issues = productRuleIssues({
      purchaseUnit: "crate",
      saleUnit: "kg",
      defaultPackQuantity: "10",
      lastShrinkage: "12",
      lastMargin: "0.5",
    });

    expect(issues.map((i) => ({ ...i, message: text(i.message) }))).toEqual([
      { path: "lastShrinkage", message: "La merma debe ser menor que la cantidad por bulto" },
    ]);
  });

  test("is empty for a valid product", () => {
    expect(productRuleIssues({ ...VALID })).toEqual([]);
  });
});

describe("productFormSchema (web form → API payload)", () => {
  const FORM = {
    name: " Tomate perita ",
    categoryId: CATEGORY,
    purchaseUnit: "crate",
    saleUnit: "kg",
    defaultPackQuantity: "24",
    lastShrinkage: "2",
    lastMarginPercent: "50",
  } as const;

  test("converts the margin percent to a fraction: 50 % → 0.5", () => {
    expect(productFormSchema.parse(FORM)).toEqual({
      name: "Tomate perita",
      categoryId: CATEGORY,
      purchaseUnit: "crate",
      saleUnit: "kg",
      defaultPackQuantity: "24",
      lastShrinkage: "2",
      lastMargin: "0.5",
    });
  });

  test("converts 12.5 % to 0.125 and 500 % to 5", () => {
    expect(productFormSchema.parse({ ...FORM, lastMarginPercent: "12.5" }).lastMargin).toBe(
      "0.125",
    );
    expect(productFormSchema.parse({ ...FORM, lastMarginPercent: "500" }).lastMargin).toBe("5");
  });

  test("an empty pack quantity becomes null and an empty shrinkage 0 (kg product)", () => {
    const parsed = productFormSchema.parse({
      ...FORM,
      purchaseUnit: "kg",
      defaultPackQuantity: "",
      lastShrinkage: "",
    });

    expect(parsed.defaultPackQuantity).toBeNull();
    expect(parsed.lastShrinkage).toBe("0");
  });

  test("reports margin errors on the percent field", () => {
    expect(errorsOf(productFormSchema.safeParse({ ...FORM, lastMarginPercent: "501" }))).toEqual({
      lastMarginPercent: ["El margen debe estar entre 0 % y 500 %"],
    });
    expect(
      errorsOf(productFormSchema.safeParse({ ...FORM, lastMarginPercent: "12.345" }))
        .lastMarginPercent,
    ).toEqual(["El margen admite como máximo 2 decimales"]);
  });

  test("reports decimal format errors on their field", () => {
    expect(
      errorsOf(productFormSchema.safeParse({ ...FORM, defaultPackQuantity: "24,5" }))
        .defaultPackQuantity,
    ).toEqual(["La cantidad por bulto debe ser un número con punto decimal (p. ej. 15.50)"]);
  });

  test("reports the unit rules on the form fields", () => {
    expect(
      errorsOf(productFormSchema.safeParse({ ...FORM, defaultPackQuantity: "" }))
        .defaultPackQuantity,
    ).toEqual(["Indica cuánto trae cada bulto"]);
  });
});

describe("quickProductFormSchema", () => {
  test("empty pack → null; kg product is valid", () => {
    expect(
      quickProductFormSchema.parse({
        name: "Ocumo",
        purchaseUnit: "kg",
        saleUnit: "kg",
        defaultPackQuantity: "",
      }),
    ).toEqual({ name: "Ocumo", purchaseUnit: "kg", saleUnit: "kg", defaultPackQuantity: null });
  });
});

describe("productListQuerySchema", () => {
  test("defaults: page 1, 20 per page, active products", () => {
    expect(productListQuerySchema.parse({})).toEqual({ page: 1, pageSize: 20, isActive: true });
  });

  test("parses query-string values", () => {
    expect(
      productListQuerySchema.parse({
        page: "2",
        pageSize: "50",
        isActive: "false",
        search: "  tomate ",
        purchaseUnit: "crate",
      }),
    ).toEqual({ page: 2, pageSize: 50, isActive: false, search: "tomate", purchaseUnit: "crate" });
  });

  test("rejects a page size above 100 and an unknown unit", () => {
    expect(productListQuerySchema.safeParse({ pageSize: "500" }).success).toBe(false);
    expect(productListQuerySchema.safeParse({ purchaseUnit: "sack" }).success).toBe(false);
  });
});
