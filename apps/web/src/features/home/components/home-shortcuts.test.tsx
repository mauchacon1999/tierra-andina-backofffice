import { render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";

import { HomeShortcuts } from "@/features/home/components/home-shortcuts";
import { SwrTestWrapper } from "@/testing/swr-wrapper";

vi.mock("@/features/auth/hooks/use-require-session", () => ({
  useRequireSession: () => ({
    activeMembership: { storeId: "store", storeName: "Tierra Andina", role: "owner" },
  }),
}));

describe("HomeShortcuts", () => {
  it("shows the menu icon on each shortcut", () => {
    render(<HomeShortcuts />, { wrapper: SwrTestWrapper });

    for (const name of [/Cierre del día/, /Faltantes/, /Compras/, /Usuarios/]) {
      const link = screen.getByRole("link", { name });
      expect(link.querySelector("svg")).not.toBeNull();
    }
  });
});
