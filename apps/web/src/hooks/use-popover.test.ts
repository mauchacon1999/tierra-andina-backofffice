import { describe, expect, it } from "vitest";

import { placePopover } from "@/hooks/use-popover";

const SIZE = { width: 320, height: 400 };
const PHONE = { width: 375, height: 800 };

/** A trigger box at (left, top) with the given size, like getBoundingClientRect returns. */
const box = (left: number, top: number, width = 200, height = 44): DOMRect =>
  ({ left, top, width, height, right: left + width, bottom: top + height }) as DOMRect;

describe("placePopover", () => {
  it("opens under the trigger, aligned to its left edge", () => {
    expect(placePopover(box(16, 100), PHONE, SIZE)).toMatchObject({
      position: "fixed",
      left: 16,
      width: 320,
      top: 148,
    });
  });

  it("stays on screen when the trigger is near the right edge", () => {
    expect(placePopover(box(200, 100), PHONE, SIZE)).toMatchObject({ left: 47 });
  });

  it("opens above the trigger when there is no room below", () => {
    const style = placePopover(box(16, 600), PHONE, SIZE);

    expect(style).toMatchObject({ bottom: 204 });
    expect(style.top).toBeUndefined();
  });

  it("narrows to the screen on very small phones", () => {
    expect(placePopover(box(8, 100), { width: 300, height: 800 }, SIZE)).toMatchObject({
      left: 8,
      width: 284,
    });
  });
});
