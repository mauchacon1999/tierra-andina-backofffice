import { act, renderHook } from "@testing-library/react";
import { describe, expect, it } from "vitest";

import {
  describePriceExample,
  usePriceExample,
  usePriceExampleText,
  type PriceExampleInput,
} from "@/features/products/hooks/use-price-example";
import { IntlTestWrapper } from "@/testing/intl-wrapper";

const text = () =>
  renderHook(() => usePriceExampleText(), { wrapper: IntlTestWrapper }).result.current;

const TOMATO: PriceExampleInput = {
  purchaseUnit: "crate",
  saleUnit: "kg",
  defaultPackQuantity: "24",
  lastShrinkage: "2",
  lastMarginPercent: "50",
  usdRoundingStep: "0.05",
};

describe("describePriceExample", () => {
  it("tomato reference case: crate at 20 $ → 22 kg → 0,91 $/kg → sells at 1,40 $/kg", () => {
    expect(describePriceExample(TOMATO, "20", text())).toBe(
      "Cesta a 20,00 $ → 22 kg útiles → 0,91 $/kg → venta 1,40 $/kg",
    );
  });

  it("cilantro bundle by bunch: 10 $ for 28, 2 lost → sells at 0,60 $/und", () => {
    expect(
      describePriceExample(
        { ...TOMATO, purchaseUnit: "bundle", saleUnit: "unit", defaultPackQuantity: "28" },
        "10",
        text(),
      ),
    ).toBe("Cuenta a 10,00 $ → 26 und útiles → 0,38 $/und → venta 0,60 $/und");
  });

  it("rounds the sale price up to the store step (0.10 → 1,40; 1 → 2,00)", () => {
    expect(describePriceExample({ ...TOMATO, usdRoundingStep: "0.10" }, "20", text())).toContain(
      "venta 1,40 $/kg",
    );
    expect(describePriceExample({ ...TOMATO, usdRoundingStep: "1" }, "20", text())).toContain(
      "venta 2,00 $/kg",
    );
  });

  it("kilo products are priced per kilo", () => {
    expect(
      describePriceExample({ ...TOMATO, purchaseUnit: "kg", defaultPackQuantity: "" }, "2", text()),
    ).toBe("Kilo a 2,00 $ → venta 3,00 $/kg");
  });

  it.each([
    ["no sample cost", TOMATO, ""],
    ["a cost with comma", TOMATO, "20,5"],
    ["no pack quantity yet", { ...TOMATO, defaultPackQuantity: "" }, "20"],
    ["shrinkage ≥ pack", { ...TOMATO, lastShrinkage: "24" }, "20"],
    ["an invalid margin", { ...TOMATO, lastMarginPercent: "abc" }, "20"],
  ] as const)("shows nothing for %s", (_label, input, cost) => {
    expect(describePriceExample(input, cost, text())).toBeNull();
  });
});

describe("usePriceExample", () => {
  it("updates the example as the sample cost is typed", () => {
    const { result } = renderHook(() => usePriceExample(TOMATO), { wrapper: IntlTestWrapper });
    expect(result.current.example).toBeNull();

    act(() => result.current.setSampleCost("20"));

    expect(result.current.example).toContain("venta 1,40 $/kg");
  });
});
