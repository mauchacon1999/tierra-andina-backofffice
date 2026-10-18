import { act, renderHook } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { COPIED_NOTICE_MS, useCopy } from "@/hooks/use-copy";

const writeText = vi.fn<(text: string) => Promise<void>>();

describe("useCopy", () => {
  beforeEach(() => {
    vi.useFakeTimers();
    writeText.mockReset();
    writeText.mockResolvedValue(undefined);
    vi.stubGlobal("navigator", { ...navigator, clipboard: { writeText } });
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it("copies the text and remembers which button did it for a short while", async () => {
    const { result } = renderHook(() => useCopy());

    await act(() => result.current.copy("phone", "04141234567"));

    expect(writeText).toHaveBeenCalledWith("04141234567");
    expect(result.current.last).toEqual({ key: "phone", ok: true });
    act(() => {
      vi.advanceTimersByTime(COPIED_NOTICE_MS);
    });
    expect(result.current.last).toBeNull();
  });

  it("reports a failed copy", async () => {
    writeText.mockRejectedValue(new Error("denied"));
    const { result } = renderHook(() => useCopy());

    await act(() => result.current.copy("all", "x"));

    expect(result.current.last).toEqual({ key: "all", ok: false });
  });
});
