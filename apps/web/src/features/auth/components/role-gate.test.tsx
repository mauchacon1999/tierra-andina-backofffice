import { render, screen } from "@testing-library/react";
import type { MeResponse } from "@ta/validators";
import { describe, expect, it, vi } from "vitest";

import { getMe } from "@/features/auth/api/auth-requests";
import { RoleGate } from "@/features/auth/components/role-gate";
import { SwrTestWrapper } from "@/testing/swr-wrapper";

vi.mock("next/navigation", () => ({ useRouter: () => ({ replace: vi.fn(), push: vi.fn() }) }));
vi.mock("@/features/auth/api/auth-requests", () => ({
  getMe: vi.fn(),
  signInWithEmail: vi.fn(),
  signOut: vi.fn(),
}));

const meAs = (role: MeResponse["memberships"][number]["role"]): MeResponse => ({
  user: { id: "u1", name: "Ana", email: "ana@test.local" },
  memberships: [{ storeId: "s1", storeName: "Tienda", role }],
});

describe("RoleGate", () => {
  it("shows the content to an allowed role", async () => {
    vi.mocked(getMe).mockResolvedValue(meAs("owner"));
    render(
      <RoleGate roles={["owner"]}>
        <p>Productos</p>
      </RoleGate>,
      { wrapper: SwrTestWrapper },
    );

    expect(await screen.findByText("Productos")).toBeDefined();
  });

  it("explains the missing permission to other roles", async () => {
    vi.mocked(getMe).mockResolvedValue(meAs("manager"));
    render(
      <RoleGate roles={["owner"]}>
        <p>Productos</p>
      </RoleGate>,
      { wrapper: SwrTestWrapper },
    );

    expect(await screen.findByText("No tienes permiso para ver esta sección")).toBeDefined();
    expect(screen.queryByText("Productos")).toBeNull();
    expect(screen.getByRole("link", { name: "Volver al inicio" }).getAttribute("href")).toBe("/");
  });
});
