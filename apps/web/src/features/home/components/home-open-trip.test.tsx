import { render, screen, waitFor } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";

import { HomeOpenTrip } from "@/features/home/components/home-open-trip";
import { listTrips } from "@/features/purchases/api/purchase-requests";
import { OPEN_TRIP } from "@/testing/purchase-fixtures";
import { SwrTestWrapper } from "@/testing/swr-wrapper";

const session = vi.hoisted(() => ({ role: "owner" as "owner" | "receiver" }));

vi.mock("@/features/auth/hooks/use-require-session", () => ({
  useRequireSession: () => ({
    me: {
      user: { id: "u", name: "Ender", email: "owner@tierra-andina.local" },
      memberships: [],
    },
    activeMembership: {
      storeId: "s",
      storeName: "Tierra Andina",
      role: session.role,
    },
    isLoading: false,
  }),
}));
vi.mock("@/features/purchases/api/purchase-requests", () => ({
  listTrips: vi.fn(),
}));

describe("HomeOpenTrip", () => {
  beforeEach(() => {
    session.role = "owner";
    vi.mocked(listTrips).mockReset();
    vi.mocked(listTrips).mockResolvedValue({
      data: [OPEN_TRIP],
      total: 1,
      page: 1,
      pageSize: 1,
    });
  });

  it("links the owner to the open trip", async () => {
    render(<HomeOpenTrip />, { wrapper: SwrTestWrapper });

    expect(await screen.findByText("Jornada abierta")).toBeDefined();
    expect(screen.getByText(/Ciérrala antes de abrir otra/)).toBeDefined();
    expect(screen.getByRole("link", { name: "Entrar a la jornada" }).getAttribute("href")).toBe(
      `/purchases/${OPEN_TRIP.id}`,
    );
  });

  it("stays hidden when there is no open trip", async () => {
    vi.mocked(listTrips).mockResolvedValue({ data: [], total: 0, page: 1, pageSize: 1 });
    render(<HomeOpenTrip />, { wrapper: SwrTestWrapper });

    await waitFor(() => expect(listTrips).toHaveBeenCalled());
    expect(screen.queryByText("Jornada abierta")).toBeNull();
  });

  it("is not shown to the receiver", () => {
    session.role = "receiver";
    render(<HomeOpenTrip />, { wrapper: SwrTestWrapper });

    expect(screen.queryByText("Jornada abierta")).toBeNull();
    expect(listTrips).not.toHaveBeenCalled();
  });
});
