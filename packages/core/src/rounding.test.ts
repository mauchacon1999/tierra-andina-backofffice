import { describe, expect, test } from "bun:test";

import { InvalidValueError } from "./errors";
import { roundUpToStep } from "./rounding";

describe("roundUpToStep", () => {
  test("rounds the sale price up to the next 0.05 USD", () => {
    expect(roundUpToStep("1.36365", "0.05")).toBe("1.40");
    expect(roundUpToStep("0.5769", "0.05")).toBe("0.60");
  });

  test("keeps exact multiples", () => {
    expect(roundUpToStep("1.40", "0.05")).toBe("1.40");
    expect(roundUpToStep("294", "1")).toBe("294");
  });

  test("rounds Bs up to whole bolívares with step 1", () => {
    expect(roundUpToStep("293.01", "1")).toBe("294");
  });

  test("never rounds down, even by a hair", () => {
    expect(roundUpToStep("1.3500001", "0.05")).toBe("1.40");
  });

  test("handles zero", () => {
    expect(roundUpToStep("0", "0.05")).toBe("0.00");
  });

  test("rejects a step ≤ 0", () => {
    expect(() => roundUpToStep("1", "0")).toThrow(InvalidValueError);
    expect(() => roundUpToStep("1", "-0.05")).toThrow(InvalidValueError);
  });

  test("rejects non-numeric input", () => {
    expect(() => roundUpToStep("abc", "0.05")).toThrow(TypeError);
  });
});
