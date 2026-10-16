import type { Product, ProductCategory, ProductDetail, ProductSummary } from "@ta/validators";

import type { CategoryRecord, ProductRow } from "./products.repository";
import type { ProductWithLock } from "./products.service";

/** DB row → API DTO for owners and managers (dates as ISO strings). */
export function toProductDto(row: ProductRow): Product {
  return {
    id: row.id,
    name: row.name,
    categoryId: row.categoryId,
    categoryName: row.categoryName,
    purchaseUnit: row.purchaseUnit,
    saleUnit: row.saleUnit,
    defaultPackQuantity: row.defaultPackQuantity,
    lastShrinkage: row.lastShrinkage,
    lastMargin: row.lastMargin,
    isActive: row.isActive,
    createdAt: row.createdAt.toISOString(),
    updatedAt: row.updatedAt.toISOString(),
  };
}

export function toProductDetailDto(row: ProductWithLock): ProductDetail {
  return { ...toProductDto(row), isUnitLocked: row.isUnitLocked };
}

/** What receivers may see: no costs, margins or defaults (products.md §5). */
export function toProductSummaryDto(row: ProductRow): ProductSummary {
  return { id: row.id, name: row.name, saleUnit: row.saleUnit };
}

export function toCategoryDto(row: CategoryRecord): ProductCategory {
  return { id: row.id, code: row.code, name: row.name, sortOrder: row.sortOrder };
}
