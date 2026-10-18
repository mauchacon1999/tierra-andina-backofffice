import { describe, expect, it } from "vitest";

import {
  formatBs,
  formatDecimal,
  formatMoney,
  formatPercentFromFraction,
  formatQuantity,
  formatUsd,
} from "@/utils/format-number";

describe("format-number (es-VE)", () => {
  it("formats an amount in its own currency", () => {
    expect(formatMoney("1234.5", "USD")).toBe("1.234,50 $");
    expect(formatMoney("6400", "VES")).toBe("6.400,00 Bs");
  });

  it("formats money with comma decimals and dot thousands", () => {
    expect(formatUsd("1.4")).toBe("1,40 $");
    expect(formatBs("1234567.5")).toBe("1.234.567,50 Bs");
  });

  it("formats from the string, without float loss", () => {
    expect(formatDecimal("9007199254740993.10", 2)).toBe("9.007.199.254.740.993,10");
  });

  it("shows quantities without padding zeros, up to 3 decimals", () => {
    expect(formatQuantity("22.0000")).toBe("22");
    expect(formatQuantity("0.9091")).toBe("0,909");
  });

  it("shows fractions as percents", () => {
    expect(formatPercentFromFraction("0.5000")).toBe("50 %");
    expect(formatPercentFromFraction("0.125")).toBe("12,5 %");
  });
});
