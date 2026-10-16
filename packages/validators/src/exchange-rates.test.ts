import { describe, expect, test } from "bun:test";

import {
  businessDateSchema,
  dailyRatesFormSchema,
  dailyRatesRangeQuerySchema,
  rateValueSchema,
  setDailyRatesSchema,
} from "./exchange-rates";
import { updateStoreSettingsSchema } from "./settings";

const message = (r: { success: boolean; error?: { issues: { message: string }[] } }) =>
  r.error?.issues[0]?.message;

describe("businessDateSchema", () => {
  test("accepts real dates and rejects impossible ones", () => {
    expect(businessDateSchema.safeParse("2026-10-16").success).toBe(true);
    expect(message(businessDateSchema.safeParse("2026-02-30"))).toBe(
      "La fecha no es válida (AAAA-MM-DD)",
    );
  });
});

describe("rateValueSchema", () => {
  test("rates must be > 0 with up to 4 decimals", () => {
    expect(rateValueSchema.parse("201.5")).toBe("201.5");
    expect(message(rateValueSchema.safeParse("0"))).toBe("La tasa debe ser mayor que 0");
    expect(message(rateValueSchema.safeParse("201,5"))).toBe(
      "La tasa debe ser un número con punto decimal (p. ej. 15.50)",
    );
  });
});

describe("setDailyRatesSchema", () => {
  test("accepts any subset of BCV, Coche and sale", () => {
    expect(setDailyRatesSchema.parse({ bcv: "200", market: "201" })).toEqual({
      bcv: "200",
      market: "201",
    });
  });

  test("needs at least one rate", () => {
    expect(message(setDailyRatesSchema.safeParse({}))).toBe("Escribe al menos una tasa");
  });
});

describe("dailyRatesFormSchema (web form)", () => {
  test("skips empty fields", () => {
    expect(dailyRatesFormSchema.parse({ bcv: " 200 ", market: "201", sale: "" })).toEqual({
      bcv: "200",
      market: "201",
    });
  });

  test("reports errors on the field and requires one rate", () => {
    const invalid = dailyRatesFormSchema.safeParse({ bcv: "0", market: "", sale: "" });
    expect(invalid.error?.issues[0]).toMatchObject({
      path: ["bcv"],
      message: "La tasa debe ser mayor que 0",
    });
    expect(message(dailyRatesFormSchema.safeParse({ bcv: "", market: "", sale: "" }))).toBe(
      "Escribe al menos una tasa",
    );
  });
});

describe("dailyRatesRangeQuerySchema", () => {
  test("from ≤ to and at most 62 days", () => {
    expect(
      dailyRatesRangeQuerySchema.safeParse({ from: "2026-10-01", to: "2026-10-16" }).success,
    ).toBe(true);
    expect(
      message(dailyRatesRangeQuerySchema.safeParse({ from: "2026-10-16", to: "2026-10-01" })),
    ).toBe("La fecha inicial debe ser anterior a la final");
    expect(
      message(dailyRatesRangeQuerySchema.safeParse({ from: "2026-01-01", to: "2026-10-16" })),
    ).toBe("El rango admite como máximo 62 días");
  });
});

describe("updateStoreSettingsSchema", () => {
  test("accepts a subset and validates each setting", () => {
    expect(updateStoreSettingsSchema.parse({ defaultMargin: "0.6" })).toEqual({
      defaultMargin: "0.6",
    });
    expect(message(updateStoreSettingsSchema.safeParse({ usdRoundingStep: "0" }))).toBe(
      "El redondeo en dólares debe ser mayor que 0",
    );
    expect(message(updateStoreSettingsSchema.safeParse({ defaultMargin: "6" }))).toBe(
      "El margen por defecto debe estar entre 0 % y 500 %",
    );
    expect(message(updateStoreSettingsSchema.safeParse({}))).toBe("No hay cambios que guardar");
  });
});
