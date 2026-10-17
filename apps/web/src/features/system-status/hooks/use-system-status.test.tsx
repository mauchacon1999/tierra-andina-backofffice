import { act, renderHook } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { getDbHealth, getHealth } from "@/features/system-status/api/health";
import { useSystemStatus } from "@/features/system-status/hooks/use-system-status";
import { ApiError } from "@/lib/api";
import { IntlTestWrapper } from "@/testing/intl-wrapper";

vi.mock("@/features/system-status/api/health", () => ({
  getHealth: vi.fn(),
  getDbHealth: vi.fn(),
}));

const POLL_MS = 1000;
const dbDown = new ApiError({
  status: 503,
  code: "DB_UNAVAILABLE",
  message: "La base de datos no responde",
});

/** Runs pending timers and lets the resulting promises settle inside act(). */
async function advance(ms: number): Promise<void> {
  await act(async () => {
    await vi.advanceTimersByTimeAsync(ms);
  });
}

describe("useSystemStatus", () => {
  beforeEach(() => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date("2026-10-16T12:00:00Z"));
    vi.mocked(getHealth).mockResolvedValue({ ok: true, version: "0.1.0" });
    vi.mocked(getDbHealth).mockResolvedValue({ ok: true, db: "up" });
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it("starts in loading state before the first check finishes", () => {
    const { result } = renderHook(() => useSystemStatus({ pollMs: POLL_MS }), {
      wrapper: IntlTestWrapper,
    });

    expect(result.current.api.status).toBe("loading");
    expect(result.current.db.status).toBe("loading");
    expect(result.current.checkedAt).toBeNull();
  });

  it("marks API and database as ok when both checks pass", async () => {
    const { result } = renderHook(() => useSystemStatus({ pollMs: POLL_MS }), {
      wrapper: IntlTestWrapper,
    });

    await advance(0);

    expect(result.current.api).toMatchObject({ status: "ok", detail: "Versión 0.1.0" });
    expect(result.current.db).toMatchObject({ status: "ok", detail: "PostgreSQL responde" });
    expect(result.current.checkedAt).toEqual(new Date("2026-10-16T12:00:00Z"));
  });

  it("turns the database red on the next poll when it goes down, keeping the API green", async () => {
    const { result } = renderHook(() => useSystemStatus({ pollMs: POLL_MS }), {
      wrapper: IntlTestWrapper,
    });
    await advance(0);

    vi.mocked(getDbHealth).mockRejectedValue(dbDown);
    await advance(POLL_MS);

    expect(result.current.api.status).toBe("ok");
    expect(result.current.db).toMatchObject({ status: "error", error: dbDown });
  });

  it("recovers on a later poll once the database answers again", async () => {
    vi.mocked(getDbHealth).mockRejectedValue(dbDown);
    const { result } = renderHook(() => useSystemStatus({ pollMs: POLL_MS }), {
      wrapper: IntlTestWrapper,
    });
    await advance(0);
    expect(result.current.db.status).toBe("error");

    vi.mocked(getDbHealth).mockResolvedValue({ ok: true, db: "up" });
    await advance(POLL_MS);

    expect(result.current.db.status).toBe("ok");
  });

  it("wraps unexpected errors as ApiError instead of throwing", async () => {
    vi.mocked(getHealth).mockRejectedValue(new Error("boom"));
    const { result } = renderHook(() => useSystemStatus({ pollMs: POLL_MS }), {
      wrapper: IntlTestWrapper,
    });

    await advance(0);

    const api = result.current.api;
    expect(api.status).toBe("error");
    if (api.status !== "error") return;
    expect(api.error).toBeInstanceOf(ApiError);
    expect(api.error.code).toBe("UNKNOWN");
  });

  it("checks again immediately on refresh()", async () => {
    const { result } = renderHook(() => useSystemStatus({ pollMs: POLL_MS }), {
      wrapper: IntlTestWrapper,
    });
    await advance(0);
    expect(getHealth).toHaveBeenCalledTimes(1);

    act(() => result.current.refresh());
    await advance(0);

    expect(getHealth).toHaveBeenCalledTimes(2);
  });
});
