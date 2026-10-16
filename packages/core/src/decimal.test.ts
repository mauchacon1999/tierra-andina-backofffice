import { describe, expect, test } from "bun:test";

import { sum } from "./decimal";

describe("sum", () => {
  test('adds 0.1 + 0.2 to exactly "0.3"', () => {
    expect(sum("0.1", "0.2")).toBe("0.3");
  });

  test("keeps 4-decimal precision", () => {
    expect(sum("1234.5678", "0.0001")).toBe("1234.5679");
  });

  test("handles integers beyond Number precision", () => {
    expect(sum("9007199254740993", "1")).toBe("9007199254740994");
  });

  test("handles negatives", () => {
    expect(sum("-5.25", "2")).toBe("-3.25");
  });

  test("never returns exponential notation", () => {
    expect(sum("0.0000001", "0")).toBe("0.0000001");
    expect(sum("1e21", "0")).toBe("1000000000000000000000");
  });

  test("rejects non-numeric input with a TypeError", () => {
    expect(() => sum("abc", "1")).toThrow('a is not a valid decimal number: "abc"');
    expect(() => sum("1", "")).toThrow(TypeError);
    expect(() => sum("Infinity", "1")).toThrow(TypeError);
  });
});
