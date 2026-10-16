import {
  cleanProductName,
  isValidUnitCombination,
  percentToFraction,
  PURCHASE_UNITS,
  SALE_UNITS,
  validateProductDefaults,
  type ProductDefaultsIssueCode,
} from "@ta/core";
import { z } from "zod";

import { decimalSchema } from "./amount";
import { paginatedSchema, paginationQuerySchema } from "./pagination";

/*
 * Product schemas (docs/modules/products.md §4). Rules come from @ta/core so the web form and
 * the API validate exactly the same way. Messages are Spanish (shown to users).
 */

export const purchaseUnitSchema = z.enum(PURCHASE_UNITS, { error: "Elige cómo se compra" });
export const saleUnitSchema = z.enum(SALE_UNITS, { error: "Elige cómo se vende" });

export const NAME_MIN = 2;
export const NAME_MAX = 60;

const nameSchema = z
  .string({ error: "Escribe el nombre" })
  .transform(cleanProductName)
  .pipe(
    z
      .string()
      .min(1, { message: "Escribe el nombre", abort: true })
      .min(NAME_MIN, `El nombre debe tener al menos ${NAME_MIN} caracteres`)
      .max(NAME_MAX, `El nombre admite como máximo ${NAME_MAX} caracteres`),
  );

const categoryIdSchema = z.uuid({ error: "Elige una categoría" });
const packQuantitySchema = decimalSchema("La cantidad por bulto").nullable();
const shrinkageSchema = decimalSchema("La merma");
/** Margin as a fraction: "0.5" = 50 %. */
const marginSchema = decimalSchema("El margen");

/** Spanish messages for the @ta/core product rules; also used by the API in error details. */
export const PRODUCT_RULE_MESSAGES: Record<
  ProductDefaultsIssueCode | "INVALID_UNIT_COMBINATION",
  string
> = {
  INVALID_UNIT_COMBINATION: "Lo que se compra por kilo solo se puede vender por kilo",
  PACK_QUANTITY_REQUIRED: "Indica cuánto trae cada bulto",
  PACK_QUANTITY_NOT_ALLOWED: "Los productos por kilo no llevan cantidad por bulto",
  PACK_QUANTITY_NOT_POSITIVE: "La cantidad por bulto debe ser mayor que 0",
  SHRINKAGE_NEGATIVE: "La merma no puede ser negativa",
  SHRINKAGE_NOT_BELOW_PACK: "La merma debe ser menor que la cantidad por bulto",
  MARGIN_OUT_OF_RANGE: "El margen debe estar entre 0 % y 500 %",
};

type RuleInput = {
  purchaseUnit: (typeof PURCHASE_UNITS)[number];
  saleUnit: (typeof SALE_UNITS)[number];
  defaultPackQuantity: string | null;
  lastShrinkage: string;
  lastMargin?: string | undefined;
};

/** Field names the issues are reported on (the web form uses a percent field for the margin). */
type RulePaths = { lastMargin: string };

function checkProductRules(
  value: RuleInput,
  ctx: z.RefinementCtx,
  paths: RulePaths = { lastMargin: "lastMargin" },
): void {
  if (!isValidUnitCombination(value.purchaseUnit, value.saleUnit)) {
    ctx.addIssue({
      code: "custom",
      path: ["saleUnit"],
      message: PRODUCT_RULE_MESSAGES.INVALID_UNIT_COMBINATION,
    });
  }
  const issues = validateProductDefaults({
    purchaseUnit: value.purchaseUnit,
    defaultPackQuantity: value.defaultPackQuantity,
    lastShrinkage: value.lastShrinkage,
    // Margin not sent (create without margin → API uses the store default): nothing to check.
    lastMargin: value.lastMargin ?? "0",
  });
  for (const issue of issues) {
    ctx.addIssue({
      code: "custom",
      path: [issue.field === "lastMargin" ? paths.lastMargin : issue.field],
      message: PRODUCT_RULE_MESSAGES[issue.code],
    });
  }
}

// Create / quick create -------------------------------------------------------------------------

const productFields = {
  name: nameSchema,
  categoryId: categoryIdSchema,
  purchaseUnit: purchaseUnitSchema,
  saleUnit: saleUnitSchema,
  defaultPackQuantity: packQuantitySchema.default(null),
  lastShrinkage: shrinkageSchema.default("0"),
  /** Omitted → the store's `default_margin` setting. */
  lastMargin: marginSchema.optional(),
};

/** POST /api/v1/products */
export const createProductSchema = z
  .object(productFields)
  .superRefine((value, ctx) => checkProductRules(value, ctx));

export type CreateProductInput = z.input<typeof createProductSchema>;
export type CreateProduct = z.output<typeof createProductSchema>;

/** POST /api/v1/products/quick — from the purchase screen; category defaults to "other". */
export const quickCreateProductSchema = z
  .object({
    name: nameSchema,
    purchaseUnit: purchaseUnitSchema,
    saleUnit: saleUnitSchema,
    defaultPackQuantity: packQuantitySchema.default(null),
  })
  .superRefine((value, ctx) => checkProductRules({ ...value, lastShrinkage: "0" }, ctx));

export type QuickCreateProductInput = z.input<typeof quickCreateProductSchema>;
export type QuickCreateProduct = z.output<typeof quickCreateProductSchema>;

/**
 * PATCH /api/v1/products/:id — every field optional, no defaults (an omitted field keeps its
 * value). Cross-field rules need the stored product, so the API re-checks the merged result.
 */
export const updateProductSchema = z
  .object({
    name: nameSchema.optional(),
    categoryId: categoryIdSchema.optional(),
    purchaseUnit: purchaseUnitSchema.optional(),
    saleUnit: saleUnitSchema.optional(),
    defaultPackQuantity: packQuantitySchema.optional(),
    lastShrinkage: shrinkageSchema.optional(),
    lastMargin: marginSchema.optional(),
  })
  .refine((value) => Object.values(value).some((v) => v !== undefined), {
    message: "No hay cambios que guardar",
  });

export type UpdateProductInput = z.input<typeof updateProductSchema>;
export type UpdateProduct = z.output<typeof updateProductSchema>;

/** Re-checks a full product (e.g. stored product + PATCH) with the same rules and messages. */
export function productRuleIssues(value: RuleInput): { path: string; message: string }[] {
  const result = z
    .custom<RuleInput>()
    .superRefine((v, ctx) => checkProductRules(v, ctx))
    .safeParse(value);
  return result.success
    ? []
    : result.error.issues.map((i) => ({ path: i.path.join("."), message: i.message }));
}

// Web form ---------------------------------------------------------------------------------------

/** Percent typed by the owner ("50" = 50 %); 2 decimals keep the fraction within 4. */
const marginPercentSchema = decimalSchema("El margen", { maxDecimals: 2 });

/**
 * The product form holds text inputs; it outputs the `CreateProduct` payload:
 * empty pack quantity → null, margin percent → fraction ("50" → "0.5").
 */
export const productFormSchema = z
  .object({
    name: nameSchema,
    categoryId: categoryIdSchema,
    purchaseUnit: purchaseUnitSchema,
    saleUnit: saleUnitSchema,
    defaultPackQuantity: z.string(),
    lastShrinkage: z.string(),
    lastMarginPercent: marginPercentSchema,
  })
  .transform((value, ctx) => {
    const pack = value.defaultPackQuantity.trim() === "" ? null : value.defaultPackQuantity.trim();
    const shrinkage = value.lastShrinkage.trim() === "" ? "0" : value.lastShrinkage.trim();
    for (const [field, raw, schema] of [
      ["defaultPackQuantity", pack, packQuantitySchema],
      ["lastShrinkage", shrinkage, shrinkageSchema],
    ] as const) {
      const parsed = schema.safeParse(raw);
      if (!parsed.success) {
        for (const issue of parsed.error.issues) {
          ctx.addIssue({ code: "custom", path: [field], message: issue.message });
        }
      }
    }
    const payload = {
      name: value.name,
      categoryId: value.categoryId,
      purchaseUnit: value.purchaseUnit,
      saleUnit: value.saleUnit,
      defaultPackQuantity: pack,
      lastShrinkage: shrinkage,
      lastMargin: percentToFraction(value.lastMarginPercent),
    };
    if (ctx.issues.length === 0)
      checkProductRules(payload, ctx, { lastMargin: "lastMarginPercent" });
    return payload satisfies CreateProduct;
  });

export type ProductFormValues = z.input<typeof productFormSchema>;

/** Quick-create form (purchase screen): same text-input handling, no category/defaults. */
export const quickProductFormSchema = z
  .object({
    name: nameSchema,
    purchaseUnit: purchaseUnitSchema,
    saleUnit: saleUnitSchema,
    defaultPackQuantity: z.string(),
  })
  .transform((value, ctx) => {
    const pack = value.defaultPackQuantity.trim() === "" ? null : value.defaultPackQuantity.trim();
    const parsed = packQuantitySchema.safeParse(pack);
    if (!parsed.success) {
      for (const issue of parsed.error.issues) {
        ctx.addIssue({ code: "custom", path: ["defaultPackQuantity"], message: issue.message });
      }
    }
    const payload = { ...value, defaultPackQuantity: pack };
    if (ctx.issues.length === 0) checkProductRules({ ...payload, lastShrinkage: "0" }, ctx);
    return payload satisfies QuickCreateProduct;
  });

export type QuickProductFormValues = z.input<typeof quickProductFormSchema>;

// List query and responses ------------------------------------------------------------------------

/** GET /api/v1/products?search=&categoryId=&isActive=&purchaseUnit=&page=&pageSize= */
export const productListQuerySchema = paginationQuerySchema.extend({
  search: z.string().trim().max(NAME_MAX).optional(),
  categoryId: z.uuid().optional(),
  /** Defaults to active products; "false" lists the inactive ones. */
  isActive: z
    .enum(["true", "false"])
    .default("true")
    .transform((v) => v === "true"),
  purchaseUnit: purchaseUnitSchema.optional(),
});

export type ProductListQueryInput = z.input<typeof productListQuerySchema>;
export type ProductListQuery = z.output<typeof productListQuerySchema>;

export const productCategorySchema = z.object({
  id: z.uuid(),
  code: z.string(),
  name: z.string(),
  sortOrder: z.number().int(),
});

export type ProductCategory = z.infer<typeof productCategorySchema>;

export const productCategoryListSchema = z.object({ data: z.array(productCategorySchema) });

/** Full product as seen by owners and managers. Decimals are 4-decimal strings. */
export const productSchema = z.object({
  id: z.uuid(),
  name: z.string(),
  categoryId: z.uuid(),
  categoryName: z.string(),
  purchaseUnit: purchaseUnitSchema,
  saleUnit: saleUnitSchema,
  defaultPackQuantity: z.string().nullable(),
  lastShrinkage: z.string(),
  lastMargin: z.string(),
  isActive: z.boolean(),
  createdAt: z.iso.datetime({ offset: true }),
  updatedAt: z.iso.datetime({ offset: true }),
});

export type Product = z.infer<typeof productSchema>;

/** Detail adds whether the units can still change (no purchase/price-list line uses it). */
export const productDetailSchema = productSchema.extend({ isUnitLocked: z.boolean() });

export type ProductDetail = z.infer<typeof productDetailSchema>;

/** What a receiver may see (no costs, margins or defaults). */
export const productSummarySchema = z.object({
  id: z.uuid(),
  name: z.string(),
  saleUnit: saleUnitSchema,
});

export type ProductSummary = z.infer<typeof productSummarySchema>;

export const productListSchema = paginatedSchema(productSchema);
export const productSummaryListSchema = paginatedSchema(productSummarySchema);

export type ProductList = z.infer<typeof productListSchema>;
