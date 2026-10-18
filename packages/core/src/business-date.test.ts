import { describe, expect, test } from "bun:test";

import { monthContaining, previousMonth, previousWeek, weekContaining } from "./business-date";

describe("weekContaining", () => {
  test("Saturday 17 Oct 2026 belongs to Monday 12 through Sunday 18", () => {
    expect(weekContaining("2026-10-17")).toEqual({ from: "2026-10-12", to: "2026-10-18" });
  });

  test("Monday and Sunday are the ends of their own week", () => {
    expect(weekContaining("2026-10-12")).toEqual({ from: "2026-10-12", to: "2026-10-18" });
    expect(weekContaining("2026-10-18")).toEqual({ from: "2026-10-12", to: "2026-10-18" });
  });

  test("rejects a date that is not a real day", () => {
    expect(() => weekContaining("2026-02-30")).toThrow(TypeError);
  });
});

describe("previousWeek", () => {
  test("the week before Saturday 17 Oct 2026 is 5 to 11 October", () => {
    expect(previousWeek("2026-10-17")).toEqual({ from: "2026-10-05", to: "2026-10-11" });
  });

  test("steps back from a Monday", () => {
    expect(previousWeek("2026-10-12")).toEqual({ from: "2026-10-05", to: "2026-10-11" });
  });
});

describe("monthContaining", () => {
  test("October 2026 is the 1st through the 31st", () => {
    expect(monthContaining("2026-10-17")).toEqual({ from: "2026-10-01", to: "2026-10-31" });
  });

  test("February has 28 days, and 29 in a leap year", () => {
    expect(monthContaining("2026-02-15")).toEqual({ from: "2026-02-01", to: "2026-02-28" });
    expect(monthContaining("2024-02-15")).toEqual({ from: "2024-02-01", to: "2024-02-29" });
  });
});

describe("previousMonth", () => {
  test("March starts after a 28-day February", () => {
    expect(previousMonth("2026-03-01")).toEqual({ from: "2026-02-01", to: "2026-02-28" });
  });

  test("January steps back into December of the previous year", () => {
    expect(previousMonth("2026-01-15")).toEqual({ from: "2025-12-01", to: "2025-12-31" });
  });
});
