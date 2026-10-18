import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";

import { getDailyRates } from "@/features/exchange-rates/api/exchange-rates-requests";
import { listSuppliers, listTrips, openTrip } from "@/features/purchases/api/purchase-requests";
import { LocalPurchasesScreen } from "@/features/purchases/components/local-purchases-screen";
import { BAKERY } from "@/testing/payable-fixtures";
import { OPEN_TRIP } from "@/testing/purchase-fixtures";
import { SwrTestWrapper } from "@/testing/swr-wrapper";

const push = vi.fn();
vi.mock("next/navigation", () => ({ useRouter: () => ({ push }) }));
vi.mock("@/features/exchange-rates/api/exchange-rates-requests", () => ({
  getDailyRates: vi.fn(),
}));
vi.mock("@/features/purchases/api/purchase-requests", () => ({
  listSuppliers: vi.fn(),
  listTrips: vi.fn(),
  openTrip: vi.fn(),
}));

const LOCAL_TRIP = {
  ...OPEN_TRIP,
  kind: "local" as const,
  supplierId: BAKERY.id,
  supplierName: BAKERY.name,
};

describe("LocalPurchasesScreen", () => {
  beforeEach(() => {
    push.mockReset();
    vi.mocked(openTrip).mockReset();
    vi.mocked(listSuppliers).mockResolvedValue([BAKERY]);
    vi.mocked(getDailyRates).mockResolvedValue({
      businessDate: "2026-10-18",
      bcv: "200.0000",
      market: null,
      sale: null,
    });
    vi.mocked(listTrips).mockImplementation(async (params) => ({
      data: params.status === "open" ? [LOCAL_TRIP] : [],
      total: params.status === "open" ? 1 : 0,
      page: 1,
      pageSize: 20,
    }));
  });

  it("lists local purchases in progress to continue them", async () => {
    render(<LocalPurchasesScreen />, { wrapper: SwrTestWrapper });

    expect(
      await screen.findByRole("link", { name: /Panadería La Esquina · .* · Continuar/ }),
    ).toBeDefined();
    expect(listTrips).toHaveBeenCalledWith(
      expect.objectContaining({ kind: "local", status: "open" }),
    );
  });

  it("starts a local purchase with its supplier and opens it", async () => {
    vi.mocked(openTrip).mockResolvedValue(LOCAL_TRIP);
    render(<LocalPurchasesScreen />, { wrapper: SwrTestWrapper });

    await screen.findByRole("option", { name: BAKERY.name });
    fireEvent.change(screen.getByLabelText(/^Proveedor/), { target: { value: BAKERY.id } });
    fireEvent.change(screen.getByLabelText(/^Fecha/), { target: { value: "2026-10-18" } });
    fireEvent.click(screen.getByRole("button", { name: "Empezar compra" }));

    await waitFor(() =>
      expect(openTrip).toHaveBeenCalledWith({
        kind: "local",
        supplierId: BAKERY.id,
        businessDate: "2026-10-18",
        note: "",
      }),
    );
    expect(push).toHaveBeenCalledWith(`/purchases/${LOCAL_TRIP.id}`);
  });

  it("warns when the day has no BCV rate", async () => {
    vi.mocked(getDailyRates).mockResolvedValue({
      businessDate: "2026-10-18",
      bcv: null,
      market: null,
      sale: null,
    });
    render(<LocalPurchasesScreen />, { wrapper: SwrTestWrapper });

    expect(
      await screen.findByText("Falta la tasa BCV de ese día. La compra se costea con ella."),
    ).toBeDefined();
  });
});
