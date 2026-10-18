import { render, screen } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";

import { getOfficialBcvRate } from "@/features/exchange-rates/api/exchange-rates-requests";
import { HomeOfficialRate } from "@/features/exchange-rates/components/home-official-rate";
import { OfficialRateCard } from "@/features/exchange-rates/components/official-rate-card";
import { ApiError } from "@/lib/api";
import { SwrTestWrapper } from "@/testing/swr-wrapper";

const session = vi.hoisted(() => ({ role: "owner" as "owner" | "manager" }));

vi.mock("@/features/auth/hooks/use-require-session", () => ({
  useRequireSession: () => ({
    me: { user: { id: "u1", name: "Ana", email: "a@b.c" }, memberships: [] },
    activeMembership: { storeId: "s1", storeName: "Tienda", role: session.role },
    isLoading: false,
  }),
}));
vi.mock("@/features/exchange-rates/api/exchange-rates-requests", () => ({
  getOfficialBcvRate: vi.fn(),
}));

describe("OfficialRateCard", () => {
  beforeEach(() => {
    session.role = "owner";
    vi.mocked(getOfficialBcvRate).mockReset();
  });

  it("shows the consulted rate and a way to open the rates screen", async () => {
    vi.mocked(getOfficialBcvRate).mockResolvedValue({
      usd: "880.1159",
      effectiveDate: "2026-10-16",
    });
    render(<OfficialRateCard />, { wrapper: SwrTestWrapper });

    expect(await screen.findByText("880,1159 Bs por dólar")).toBeDefined();
    expect(screen.getByText("Fecha valor 16/10/2026")).toBeDefined();
    expect(screen.getByRole("link", { name: "Ir a tasas del día" }).getAttribute("href")).toBe(
      "/rates",
    );
  });

  it("says when the consultation fails", async () => {
    vi.mocked(getOfficialBcvRate).mockRejectedValue(
      new ApiError({
        status: 503,
        code: "OFFICIAL_RATE_UNAVAILABLE",
        message: "No se pudo consultar la tasa oficial del BCV.",
      }),
    );
    render(<OfficialRateCard />, { wrapper: SwrTestWrapper });

    expect(await screen.findByText("No se pudo consultar la tasa oficial del BCV.")).toBeDefined();
  });

  it("stays off the home screen for anyone who is not the owner", () => {
    session.role = "manager";
    render(<HomeOfficialRate />, { wrapper: SwrTestWrapper });

    expect(screen.queryByText("Tasa oficial BCV")).toBeNull();
  });
});
