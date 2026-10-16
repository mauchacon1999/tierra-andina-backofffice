import { renderHook, waitFor } from "@testing-library/react";
import type { MeResponse } from "@ta/validators";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { getMe } from "@/features/auth/api/auth-requests";
import { useRequireSession } from "@/features/auth/hooks/use-require-session";
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

const ME: MeResponse = {
  user: { id: "u1", name: "Dueño", email: "owner@test.local" },
  memberships: [
    { storeId: "store-a", storeName: "Tienda A", role: "owner" },
    { storeId: "store-b", storeName: "Tienda B", role: "manager" },
  ],
};

function setup() {
  return renderHook(() => useRequireSession(), { wrapper: SwrTestWrapper });
}

describe("useRequireSession", () => {
  beforeEach(() => {
    router.replace.mockReset();
  });
  afterEach(() => {
    useSessionStore.getState().clear();
  });

  it("redirects to /login when the API answers 401", async () => {
    vi.mocked(getMe).mockRejectedValue(
      new ApiError({ status: 401, code: "UNAUTHENTICATED", message: "Inicia sesión" }),
    );

    setup();

    await waitFor(() => expect(router.replace).toHaveBeenCalledWith("/login"));
  });

  it("does not redirect on other errors (e.g. API down)", async () => {
    vi.mocked(getMe).mockRejectedValue(
      new ApiError({ status: 0, code: "NETWORK_ERROR", message: "Sin conexión" }),
    );

    const { result } = setup();

    await waitFor(() => expect(result.current.isLoading).toBe(false));
    expect(router.replace).not.toHaveBeenCalled();
  });

  it("picks the first store and remembers it as the active store", async () => {
    vi.mocked(getMe).mockResolvedValue(ME);

    const { result } = setup();

    await waitFor(() => expect(result.current.activeMembership?.storeId).toBe("store-a"));
    await waitFor(() => expect(useSessionStore.getState().activeStoreId).toBe("store-a"));
  });

  it("keeps a remembered store the user still belongs to", async () => {
    useSessionStore.getState().setActiveStore("store-b");
    vi.mocked(getMe).mockResolvedValue(ME);

    const { result } = setup();

    await waitFor(() => expect(result.current.activeMembership).toEqual(ME.memberships[1]));
    expect(useSessionStore.getState().activeStoreId).toBe("store-b");
  });

  it("replaces a remembered store the user no longer belongs to", async () => {
    useSessionStore.getState().setActiveStore("store-gone");
    vi.mocked(getMe).mockResolvedValue(ME);

    setup();

    await waitFor(() => expect(useSessionStore.getState().activeStoreId).toBe("store-a"));
  });
});
