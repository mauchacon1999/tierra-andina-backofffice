import {
  dailyRatesListSchema,
  dailyRatesSchema,
  type DailyRates,
  type SetDailyRates,
} from "@ta/validators";

import { api } from "@/lib/api";

export function getDailyRates(date: string): Promise<DailyRates> {
  return api.get(`/api/v1/exchange-rates/${date}`, { schema: dailyRatesSchema });
}

export async function listDailyRates(from: string, to: string): Promise<DailyRates[]> {
  const { data } = await api.get(`/api/v1/exchange-rates?from=${from}&to=${to}`, {
    schema: dailyRatesListSchema,
  });
  return data;
}

export function setDailyRates(date: string, rates: SetDailyRates): Promise<DailyRates> {
  return api.put(`/api/v1/exchange-rates/${date}`, rates, { schema: dailyRatesSchema });
}
