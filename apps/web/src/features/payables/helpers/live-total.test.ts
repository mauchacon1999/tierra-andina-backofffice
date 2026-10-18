import { describe, expect, it } from "vitest";

import { liveSubtotal, liveTotal } from "@/features/payables/helpers/live-total";

describe("live invoice total", () => {
  it("multiplies quantity by unit price with the core rule", () => {
    expect(liveSubtotal({ quantity: "10", unitPrice: "1.50" })).toBe("15.0000");
  });

  it("is null while a value is empty or not a number", () => {
    expect(liveSubtotal({ quantity: "", unitPrice: "1" })).toBeNull();
    expect(liveSubtotal({ quantity: "2", unitPrice: "1,5" })).toBeNull();
    expect(liveSubtotal({ quantity: "0", unitPrice: "1" })).toBeNull();
  });

  it("adds the lines that can be computed", () => {
    expect(
      liveTotal([
        { quantity: "10", unitPrice: "1.50" },
        { quantity: "20", unitPrice: "0.50" },
        { quantity: "", unitPrice: "3" },
      ]),
    ).toBe("25.0000");
  });
});
