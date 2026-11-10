import { describe, expect, it } from "vitest";

import {
  businessDateMinusDays,
  businessDateToLocalDate,
  formatBusinessDate,
  formatBusinessDateLong,
  localDateToBusinessDate,
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

  it("round-trips a business day through a date picker's local date", () => {
    const local = businessDateToLocalDate("2026-01-05");
    expect([local.getFullYear(), local.getMonth(), local.getDate()]).toEqual([2026, 0, 5]);
    expect(localDateToBusinessDate(local)).toBe("2026-01-05");
    expect(localDateToBusinessDate(new Date(2026, 11, 31, 23, 59))).toBe("2026-12-31");
  });

  it("subtracts days across months", () => {
    expect(businessDateMinusDays("2026-11-03", 14)).toBe("2026-10-20");
  });
});
