import { describe, expect, it } from "vitest";

import { filterByName } from "@/utils/search-text";

const ROWS = [{ name: "Tomate perita" }, { name: "Ñame" }, { name: "Cebollín" }];
const byName = (row: { name: string }) => row.name;

describe("filterByName", () => {
  it("finds a part of the name, ignoring accents and case", () => {
    expect(filterByName(ROWS, "CEBOLLIN", byName)).toEqual([{ name: "Cebollín" }]);
    expect(filterByName(ROWS, "name", byName)).toEqual([{ name: "Ñame" }]);
    expect(filterByName(ROWS, "  peri ", byName)).toEqual([{ name: "Tomate perita" }]);
  });

  it("an empty query keeps every row (the same array)", () => {
    expect(filterByName(ROWS, "  ", byName)).toBe(ROWS);
  });

  it("no match is an empty list", () => {
    expect(filterByName(ROWS, "papa", byName)).toEqual([]);
  });
});
