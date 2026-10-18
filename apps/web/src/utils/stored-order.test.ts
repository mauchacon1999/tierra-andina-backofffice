import { describe, expect, it } from "vitest";

import { mergeStoredOrder, moveStoredOrder } from "@/utils/stored-order";

describe("mergeStoredOrder", () => {
  it("keeps the saved order and puts new items at the end", () => {
    expect(mergeStoredOrder(["b", "a"], ["a", "b", "c"])).toEqual(["b", "a", "c"]);
  });

  it("drops an item that left the list", () => {
    expect(mergeStoredOrder(["a", "gone", "b"], ["b", "a"])).toEqual(["a", "b"]);
  });
});

describe("moveStoredOrder", () => {
  it("moves an item down and up", () => {
    expect(moveStoredOrder(["a", "b", "c"], 0, 2)).toEqual(["b", "c", "a"]);
    expect(moveStoredOrder(["b", "c", "a"], 2, 1)).toEqual(["b", "a", "c"]);
  });

  it("leaves the list alone when the move does not fit", () => {
    expect(moveStoredOrder(["a", "b"], 0, 0)).toEqual(["a", "b"]);
    expect(moveStoredOrder(["a", "b"], -1, 0)).toEqual(["a", "b"]);
    expect(moveStoredOrder(["a", "b"], 0, 4)).toEqual(["a", "b"]);
  });
});
