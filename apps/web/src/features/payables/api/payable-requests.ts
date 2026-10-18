import {
  expenseCategoryListSchema,
  mobilePaymentDataSchema,
  payableDetailSchema,
  payableListSchema,
  type ExpenseCategory,
  type MobilePaymentData,
  type PayableDetail,
  type PayableFields,
  type PayableList,
  type PayableListQueryInput,
  type PayablePaymentFields,
  type PayableTerms,
} from "@ta/validators";

import { api } from "@/lib/api";

function toQueryString(params: PayableListQueryInput): string {
  const search = new URLSearchParams();
  for (const [key, value] of Object.entries(params)) {
    if (value !== undefined && value !== "") search.set(key, String(value));
  }
  const query = search.toString();
  return query ? `?${query}` : "";
}

export function listPayables(params: PayableListQueryInput): Promise<PayableList> {
  return api.get(`/api/v1/payables${toQueryString(params)}`, { schema: payableListSchema });
}

export function getPayable(id: string): Promise<PayableDetail> {
  return api.get(`/api/v1/payables/${id}`, { schema: payableDetailSchema });
}

export function createPayable(input: PayableFields): Promise<PayableDetail> {
  return api.post("/api/v1/payables", input, { schema: payableDetailSchema });
}

export function replacePayable(id: string, input: PayableFields): Promise<PayableDetail> {
  return api.put(`/api/v1/payables/${id}`, input, { schema: payableDetailSchema });
}

export function setPayableTerms(id: string, terms: PayableTerms): Promise<PayableDetail> {
  return api.patch(`/api/v1/payables/${id}/terms`, terms, { schema: payableDetailSchema });
}

export function voidPayable(id: string): Promise<PayableDetail> {
  return api.post(`/api/v1/payables/${id}/void`, undefined, { schema: payableDetailSchema });
}

export function recordPayment(id: string, input: PayablePaymentFields): Promise<PayableDetail> {
  return api.post(`/api/v1/payables/${id}/payments`, input, { schema: payableDetailSchema });
}

export function deletePayment(id: string, paymentId: string): Promise<PayableDetail> {
  return api.delete(`/api/v1/payables/${id}/payments/${paymentId}`, {
    schema: payableDetailSchema,
  });
}

export function getMobilePaymentData(id: string): Promise<MobilePaymentData> {
  return api.get(`/api/v1/payables/${id}/mobile-payment`, { schema: mobilePaymentDataSchema });
}

export async function listExpenseCategories(): Promise<ExpenseCategory[]> {
  const { data } = await api.get("/api/v1/expense-categories", {
    schema: expenseCategoryListSchema,
  });
  return data;
}
