import type { HomeBriefing } from "@ta/validators";
import { render, screen } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";

import { getHomeBriefing } from "@/features/home/api/home-requests";
import { HomeBriefing as HomeBriefingScreen } from "@/features/home/components/home-briefing";
import { SwrTestWrapper } from "@/testing/swr-wrapper";

vi.mock("@/features/home/api/home-requests", () => ({
  getHomeBriefing: vi.fn(),
}));

const session = vi.hoisted(() => ({ role: "owner" as "owner" | "receiver" }));

vi.mock("@/features/auth/hooks/use-require-session", () => ({
  useRequireSession: () => ({
    me: {
      user: {
        id: "0199f000-0000-7000-8000-000000000001",
        name: "Ender",
        email: "owner@tierra-andina.local",
      },
      memberships: [],
    },
    activeMembership: {
      storeId: "0199f000-0000-7000-8000-000000000010",
      storeName: "Tierra Andina",
      role: session.role,
    },
    isLoading: false,
  }),
}));

const BRIEFING: HomeBriefing = {
  week: {
    from: "2027-05-31",
    to: "2027-06-06",
    closeCount: 2,
    collected: { usd: "18100.0000", bs: "254413.0000" },
    deposited: { usd: "100.0000", bs: "2000.0000" },
    kept: { usd: "18000.0000", bs: "5500.0000" },
  },
  payables: { count: 1, remainingUsd: "6.0000" },
  credit: { usd: "0.0000", bs: "1200.0000" },
  alerts: [
    { code: "closes_pending", count: 2 },
    { code: "rates_missing", count: 3 },
  ],
};

describe("HomeBriefing", () => {
  beforeEach(() => {
    session.role = "owner";
    vi.mocked(getHomeBriefing).mockReset();
    vi.mocked(getHomeBriefing).mockResolvedValue(BRIEFING);
  });

  it("shows the week's money, debts, fiados and the alerts that are true", async () => {
    render(<HomeBriefingScreen />, { wrapper: SwrTestWrapper });

    expect(await screen.findByText("Hola, Ender")).toBeDefined();
    expect(screen.getByText("Semana del 31/05/2027 al 06/06/2027")).toBeDefined();
    expect(screen.getByText("18.100,00 $")).toBeDefined();
    expect(screen.getByText("254.413,00 Bs")).toBeDefined();
    expect(screen.getByText("100,00 $")).toBeDefined();
    expect(screen.getByText(/En la tienda quedó 18.000,00 \$ y 5.500,00 Bs/)).toBeDefined();
    expect(screen.getByText("6,00 $")).toBeDefined();
    expect(screen.getByText("1.200,00 Bs")).toBeDefined();
    expect(screen.getByRole("link", { name: "2 cierres por revisar" }).getAttribute("href")).toBe(
      "/closes",
    );
    expect(screen.getByRole("link", { name: "Faltan tasas de hoy" }).getAttribute("href")).toBe(
      "/rates",
    );
  });

  it("does not show the owner's money to the receiver", () => {
    session.role = "receiver";
    render(<HomeBriefingScreen />, { wrapper: SwrTestWrapper });

    expect(screen.getByText("Hola, Ender")).toBeDefined();
    expect(screen.getByText("Lo que toca hoy")).toBeDefined();
    expect(screen.queryByText("Cobrado")).toBeNull();
    expect(getHomeBriefing).not.toHaveBeenCalled();
  });
});
