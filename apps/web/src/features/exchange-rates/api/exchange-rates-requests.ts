import {
  dailyRatesListSchema,
  dailyRatesSchema,
  officialBcvRateSchema,
  type DailyRates,
  type OfficialBcvRateResponse,
  type SetDailyRates,
} from "@ta/validators";

import { api } from "@/lib/api";

/** Official BCV USD rate as published. It is not the rate stored for the shop. */
export function getOfficialBcvRate(): Promise<OfficialBcvRateResponse> {
  return api.get("/api/v1/exchange-rates/official", { schema: officialBcvRateSchema });
}

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
