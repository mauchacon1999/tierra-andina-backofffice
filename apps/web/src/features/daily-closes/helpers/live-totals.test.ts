import { describe, expect, it } from "vitest";

import { liveCloseTotals } from "@/features/daily-closes/helpers/live-totals";
import { METHODS } from "@/testing/close-fixtures";

const values = (amounts: string[]) => ({
  cardBatch: "",
  cashDestination: "kept" as const,
  note: "",
  payments: METHODS.map((m, i) => ({ paymentMethodId: m.id, amount: amounts[i] ?? "" })),
  credits: [{ customerName: "Ana", amount: "1200", currency: "VES" as const }],
  expenses: [{ concept: "Bolsas", amount: "379", currency: "USD" as const }],
});

describe("liveCloseTotals", () => {
  it("Tuesday: 252.413 Bs and 18.000 $, each method in its currency", () => {
    expect(liveCloseTotals(values(["163344", "5500", "18000", "83569"]), METHODS)).toEqual({
      collected: { VES: "252413.0000", USD: "18000.0000" },
      credit: { VES: "1200.0000", USD: "0.0000" },
      expenses: { VES: "0.0000", USD: "379.0000" },
    });
  });

  it("skips what is still being typed or invalid (empty, '1,5', '-3')", () => {
    expect(liveCloseTotals(values(["100", "1,5", "", "-3"]), METHODS).collected).toEqual({
      VES: "100.0000",
      USD: "0.0000",
    });
  });
});
