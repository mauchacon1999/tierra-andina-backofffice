import {
  supplierDetailSchema,
  supplierSchema,
  type CreateSupplier,
  type Supplier,
  type SupplierDetail,
  type SupplierPaymentAccountInput,
  type UpdateSupplier,
} from "@ta/validators";

import { api } from "@/lib/api";

export function getSupplier(id: string): Promise<SupplierDetail> {
  return api.get(`/api/v1/suppliers/${id}`, { schema: supplierDetailSchema });
}

export function createSupplier(input: CreateSupplier): Promise<Supplier> {
  return api.post("/api/v1/suppliers", input, { schema: supplierSchema });
}

export function updateSupplier(id: string, patch: UpdateSupplier): Promise<SupplierDetail> {
  return api.patch(`/api/v1/suppliers/${id}`, patch, { schema: supplierDetailSchema });
}

export function addAccount(
  supplierId: string,
  input: SupplierPaymentAccountInput,
): Promise<SupplierDetail> {
  return api.post(`/api/v1/suppliers/${supplierId}/accounts`, input, {
    schema: supplierDetailSchema,
  });
}

export function replaceAccount(
  supplierId: string,
  accountId: string,
  input: SupplierPaymentAccountInput,
): Promise<SupplierDetail> {
  return api.put(`/api/v1/suppliers/${supplierId}/accounts/${accountId}`, input, {
    schema: supplierDetailSchema,
  });
}

/** Accounts are never deleted (payments point at them): this deactivates it. */
export function deactivateAccount(supplierId: string, accountId: string): Promise<SupplierDetail> {
  return api.delete(`/api/v1/suppliers/${supplierId}/accounts/${accountId}`, {
    schema: supplierDetailSchema,
  });
}
