import { describe, expect, test } from "bun:test";

import { BUSINESS_TIME_ZONE, isBusinessDate, toBusinessDate } from "./business-date";
import { InvalidValueError } from "./errors";
import { amountInBs, sumDecimals } from "./rates";

describe("amountInBs", () => {
  test("3 crates quoted at 60 USD, paid at the Coche rate 201 → 12060 Bs", () => {
    expect(amountInBs("60", "201")).toBe("12060.0000");
  });

  test("rounds half-up to 4 decimals", () => {
    expect(amountInBs("0.33335", "1")).toBe("0.3334");
    expect(amountInBs("1.5", "200.1234")).toBe("300.1851");
  });

  test("rejects a negative amount or a rate ≤ 0", () => {
    expect(() => amountInBs("-1", "200")).toThrow(InvalidValueError);
    expect(() => amountInBs("10", "0")).toThrow(InvalidValueError);
  });
});

describe("sumDecimals", () => {
  test("adds exactly", () => {
    expect(sumDecimals(["0.1", "0.2", "20.0000"])).toBe("20.3000");
  });

  test("is 0 for an empty list", () => {
    expect(sumDecimals([])).toBe("0.0000");
  });

  test("rejects non-numeric values", () => {
    expect(() => sumDecimals(["1", "x"])).toThrow(TypeError);
  });
});

describe("toBusinessDate", () => {
  test("uses Caracas time (UTC−4): late night UTC is still the previous day", () => {
    expect(toBusinessDate(new Date("2026-10-16T03:30:00Z"))).toBe("2026-10-15");
    expect(toBusinessDate(new Date("2026-10-16T04:00:00Z"))).toBe("2026-10-16");
  });

  test("defaults to America/Caracas and accepts another zone", () => {
    expect(BUSINESS_TIME_ZONE).toBe("America/Caracas");
    expect(toBusinessDate(new Date("2026-10-16T03:30:00Z"), "UTC")).toBe("2026-10-16");
  });
});

describe("isBusinessDate", () => {
  test.each([
    ["2026-10-16", true],
    ["2028-02-29", true],
    ["2026-02-30", false],
    ["2026-13-01", false],
    ["16/10/2026", false],
    ["2026-10-16T00:00", false],
  ])("%s → %p", (value, expected) => {
    expect(isBusinessDate(value)).toBe(expected);
  });
});
