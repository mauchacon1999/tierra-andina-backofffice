import { act, renderHook, waitFor } from "@testing-library/react";
import type { MeResponse } from "@ta/validators";
import type { ReactNode } from "react";
import { SWRConfig } from "swr";
import { beforeEach, describe, expect, it, vi } from "vitest";

import { getMe, signInWithEmail } from "@/features/auth/api/auth-requests";
import { useMe } from "@/features/auth/api/use-me";
import { useSignIn } from "@/features/auth/api/use-sign-in";
import { useRequireSession } from "@/features/auth/hooks/use-require-session";
import { ApiError } from "@/lib/api";
import { swrConfig } from "@/lib/swr-config";

const router = vi.hoisted(() => ({ replace: vi.fn(), push: vi.fn() }));
vi.mock("next/navigation", () => ({ useRouter: () => router }));
vi.mock("@/features/auth/api/auth-requests", () => ({
  signInWithEmail: vi.fn(),
  signOut: vi.fn(),
  getMe: vi.fn(),
}));

const ME: MeResponse = {
  user: { id: "u1", name: "Dueño", email: "owner@test.local" },
  memberships: [{ storeId: "store-a", storeName: "Tienda A", role: "owner" }],
};
const UNAUTHENTICATED = new ApiError({
  status: 401,
  code: "UNAUTHENTICATED",
  message: "Inicia sesión para continuar",
});

describe("useSignIn", () => {
  beforeEach(() => {
    router.replace.mockReset();
    vi.mocked(signInWithEmail).mockResolvedValue();
  });

  // Regression (found by the browser e2e): the cached 401 from the first visit made the home
  // screen redirect back to /login right after a successful sign-in.
  it("replaces a cached 401 with the signed-in user, so home does not bounce to /login", async () => {
    const cache = new Map();
    const wrapper = ({ children }: { children: ReactNode }) => (
      <SWRConfig value={{ ...swrConfig, provider: () => cache, dedupingInterval: 0 }}>
        {children}
      </SWRConfig>
    );

    // 1. First visit while signed out: /me answers 401 and SWR caches the error.
    vi.mocked(getMe).mockRejectedValue(UNAUTHENTICATED);
    const firstVisit = renderHook(() => useMe(), { wrapper });
    await waitFor(() => expect(firstVisit.result.current.isUnauthenticated).toBe(true));
    firstVisit.unmount();

    // 2. Sign in on the login screen (nobody is subscribed to /me there).
    vi.mocked(getMe).mockResolvedValue(ME);
    const login = renderHook(() => useSignIn(), { wrapper });
    await act(() => login.result.current.signIn({ email: "owner@test.local", password: "x" }));
    login.unmount();

    // 3. Home mounts: it must see the user right away and never redirect.
    const home = renderHook(() => useRequireSession(), { wrapper });
    expect(home.result.current.me).toEqual(ME);
    await waitFor(() => expect(home.result.current.activeMembership?.storeId).toBe("store-a"));
    expect(router.replace).not.toHaveBeenCalled();
  });
});
