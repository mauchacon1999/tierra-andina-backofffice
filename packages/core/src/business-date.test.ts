import { describe, expect, test } from "bun:test";

import { weekContaining } from "./business-date";

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
