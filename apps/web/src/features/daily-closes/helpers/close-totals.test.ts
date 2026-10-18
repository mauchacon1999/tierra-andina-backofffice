import { describe, expect, it } from "vitest";

import { sumCollected } from "@/features/daily-closes/helpers/close-totals";

describe("sumCollected", () => {
  it("adds each currency on its own", () => {
    expect(
      sumCollected([
        { ves: "252413.0000", usd: "18000.0000" },
        { ves: "100.5000", usd: "0.0000" },
      ]),
    ).toEqual({ ves: "252513.5000", usd: "18000.0000" });
  });

  it("is zero when the filter has no closes", () => {
    expect(sumCollected([])).toEqual({ ves: "0.0000", usd: "0.0000" });
  });
});
