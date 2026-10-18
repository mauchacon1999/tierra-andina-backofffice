import {
  customerListSchema,
  dailyCloseListSchema,
  dailyCloseSchema,
  paymentMethodListSchema,
  pendingClosesSchema,
  type Customer,
  type DailyClose,
  type DailyCloseSummary,
  type PaymentMethod,
  type SubmitDailyClose,
  type UpdateDailyClose,
} from "@ta/validators";

import { api } from "@/lib/api";

export async function listPaymentMethods(): Promise<PaymentMethod[]> {
  const { data } = await api.get("/api/v1/payment-methods", { schema: paymentMethodListSchema });
  return data;
}

export async function searchCustomers(search: string): Promise<Customer[]> {
  const query = search ? `?search=${encodeURIComponent(search)}` : "";
  const { data } = await api.get(`/api/v1/customers${query}`, { schema: customerListSchema });
  return data;
}

export function getDailyClose(date: string): Promise<DailyClose> {
  return api.get(`/api/v1/daily-closes/${date}`, { schema: dailyCloseSchema });
}

export async function listDailyCloses(from: string, to: string): Promise<DailyCloseSummary[]> {
  const { data } = await api.get(`/api/v1/daily-closes?from=${from}&to=${to}`, {
    schema: dailyCloseListSchema,
  });
  return data;
}

export async function countPendingCloses(): Promise<number> {
  const { count } = await api.get("/api/v1/daily-closes/pending-count", {
    schema: pendingClosesSchema,
  });
  return count;
}

export function submitDailyClose(close: SubmitDailyClose): Promise<DailyClose> {
  return api.post("/api/v1/daily-closes", close, { schema: dailyCloseSchema });
}

export function updateDailyClose(id: string, contents: UpdateDailyClose): Promise<DailyClose> {
  return api.patch(`/api/v1/daily-closes/${id}`, contents, { schema: dailyCloseSchema });
}

export function approveDailyClose(id: string): Promise<DailyClose> {
  return api.post(`/api/v1/daily-closes/${id}/approve`, undefined, { schema: dailyCloseSchema });
}

export function deleteDailyClose(id: string): Promise<void> {
  return api.delete(`/api/v1/daily-closes/${id}`);
}
