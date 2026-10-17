import { describe, expect, it } from "vitest";

import {
  businessDateMinusDays,
  formatBusinessDate,
  formatBusinessDateLong,
  todayBusinessDate,
} from "@/utils/format-date";

describe("format-date", () => {
  it("today is the Caracas business day (UTC−4)", () => {
    expect(todayBusinessDate(new Date("2026-10-20T03:00:00Z"))).toBe("2026-10-19");
  });

  it("formats business days without time-zone shifts", () => {
    expect(formatBusinessDate("2026-10-19")).toBe("19/10/2026");
    expect(formatBusinessDateLong("2026-10-19")).toBe("lunes 19/10/2026");
    expect(formatBusinessDateLong("2026-10-22")).toBe("jueves 22/10/2026");
  });

  it("subtracts days across months", () => {
    expect(businessDateMinusDays("2026-11-03", 14)).toBe("2026-10-20");
  });
});
