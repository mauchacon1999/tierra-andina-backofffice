import { render, screen } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";

import { listTrips } from "@/features/purchases/api/purchase-requests";
import { OpenTripSection } from "@/features/purchases/components/open-trip-section";
import { OPEN_TRIP } from "@/testing/purchase-fixtures";
import { SwrTestWrapper } from "@/testing/swr-wrapper";

vi.mock("next/navigation", () => ({ useRouter: () => ({ push: vi.fn() }) }));
vi.mock("@/features/purchases/api/purchase-requests", () => ({
  listTrips: vi.fn(),
  openTrip: vi.fn(),
}));
vi.mock("@/features/exchange-rates/api/exchange-rates-requests", () => ({
  getDailyRates: vi.fn(async (date: string) => ({
    businessDate: date,
    bcv: "200.0000",
    market: "201.0000",
    sale: null,
  })),
}));

const EMPTY = { data: [], total: 0, page: 1, pageSize: 1 };

describe("OpenTripSection", () => {
  beforeEach(() => {
    vi.mocked(listTrips).mockReset();
  });

  it("points at the open trip instead of offering another", async () => {
    vi.mocked(listTrips).mockResolvedValue({ ...EMPTY, data: [OPEN_TRIP], total: 1 });
    render(<OpenTripSection />, { wrapper: SwrTestWrapper });

    expect(await screen.findByText("Ya hay una jornada abierta")).toBeDefined();
    expect(screen.getByText(/Ciérrala antes de abrir otra/)).toBeDefined();
    expect(screen.getByRole("link", { name: "Ir a la jornada" }).getAttribute("href")).toBe(
      `/purchases/${OPEN_TRIP.id}`,
    );
    expect(screen.queryByRole("button", { name: "Abrir jornada" })).toBeNull();
  });

  it("offers the form when no trip is open", async () => {
    vi.mocked(listTrips).mockResolvedValue(EMPTY);
    render(<OpenTripSection />, { wrapper: SwrTestWrapper });

    expect(await screen.findByRole("button", { name: "Abrir jornada" })).toBeDefined();
  });
});
