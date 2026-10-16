import {
  productCategoryListSchema,
  productDetailSchema,
  productListSchema,
  productSchema,
  type CreateProduct,
  type Product,
  type ProductCategory,
  type ProductDetail,
  type ProductList,
  type ProductListQueryInput,
  type QuickCreateProduct,
  type UpdateProduct,
} from "@ta/validators";

import { api } from "@/lib/api";

/** `?search=…&page=…` with empty values left out. */
export function toQueryString(params: ProductListQueryInput): string {
  const search = new URLSearchParams();
  for (const [key, value] of Object.entries(params)) {
    if (value !== undefined && value !== "") search.set(key, String(value));
  }
  const text = search.toString();
  return text ? `?${text}` : "";
}

export function listProducts(params: ProductListQueryInput): Promise<ProductList> {
  return api.get(`/api/v1/products${toQueryString(params)}`, { schema: productListSchema });
}

export function getProduct(id: string): Promise<ProductDetail> {
  return api.get(`/api/v1/products/${id}`, { schema: productDetailSchema });
}

export function createProduct(payload: CreateProduct): Promise<Product> {
  return api.post("/api/v1/products", payload, { schema: productSchema });
}

export function quickCreateProduct(payload: QuickCreateProduct): Promise<Product> {
  return api.post("/api/v1/products/quick", payload, { schema: productSchema });
}

export function updateProduct(id: string, patch: UpdateProduct): Promise<ProductDetail> {
  return api.patch(`/api/v1/products/${id}`, patch, { schema: productDetailSchema });
}

export function setProductActive(id: string, isActive: boolean): Promise<Product> {
  return api.post(`/api/v1/products/${id}/${isActive ? "activate" : "deactivate"}`, undefined, {
    schema: productSchema,
  });
}

export async function listProductCategories(): Promise<ProductCategory[]> {
  const { data } = await api.get("/api/v1/product-categories", {
    schema: productCategoryListSchema,
  });
  return data;
}
