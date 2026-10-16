import { act, renderHook } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { signOut } from "@/features/auth/api/auth-requests";
import { useSignOutAction } from "@/features/auth/hooks/use-sign-out-action";
import { ApiError } from "@/lib/api";
import { useSessionStore } from "@/stores/use-session-store";
import { SwrTestWrapper } from "@/testing/swr-wrapper";

const router = vi.hoisted(() => ({ replace: vi.fn(), push: vi.fn() }));
vi.mock("next/navigation", () => ({ useRouter: () => router }));
vi.mock("@/features/auth/api/auth-requests", () => ({
  signInWithEmail: vi.fn(),
  signOut: vi.fn(),
  getMe: vi.fn(),
}));

describe("useSignOutAction", () => {
  beforeEach(() => {
    router.replace.mockReset();
    useSessionStore.getState().setActiveStore("store-a");
  });
  afterEach(() => useSessionStore.getState().clear());

  it("signs out, forgets the active store and goes to /login", async () => {
    vi.mocked(signOut).mockResolvedValue();
    const { result } = renderHook(() => useSignOutAction(), { wrapper: SwrTestWrapper });

    await act(() => result.current.onSignOut());

    expect(signOut).toHaveBeenCalled();
    expect(useSessionStore.getState().activeStoreId).toBeNull();
    expect(router.replace).toHaveBeenCalledWith("/login");
  });

  it("still goes to /login when the API call fails", async () => {
    vi.mocked(signOut).mockRejectedValue(
      new ApiError({ status: 0, code: "NETWORK_ERROR", message: "Sin conexión" }),
    );
    const { result } = renderHook(() => useSignOutAction(), { wrapper: SwrTestWrapper });

    await act(async () => {
      await result.current.onSignOut().catch(() => undefined);
    });

    expect(router.replace).toHaveBeenCalledWith("/login");
  });
});
