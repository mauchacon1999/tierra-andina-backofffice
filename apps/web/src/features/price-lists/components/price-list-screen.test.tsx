import type { PriceList } from "@ta/validators";
import { fireEvent, render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";

import { getCurrentPriceList } from "@/features/price-lists/api/price-list-requests";
import { PriceListScreen } from "@/features/price-lists/components/price-list-screen";
import { setDesktop } from "@/testing/media";
import { SwrTestWrapper } from "@/testing/swr-wrapper";

vi.mock("@/features/auth/hooks/use-require-session", () => ({
  useRequireSession: () => ({
    activeMembership: { storeId: "store", storeName: "Tierra Andina", role: "manager" },
  }),
}));
vi.mock("@/features/price-lists/api/price-list-requests", () => ({
  getCurrentPriceList: vi.fn(),
}));
vi.mock("@/features/price-lists/api/price-proposal-requests", () => ({
  getPriceProposal: vi.fn(),
  publishPriceProposal: vi.fn(),
}));

const line = (id: string, productName: string, priceBs: string) => ({
  id: `0199f000-0000-7000-8000-0000000000a${id}`,
  productId: `0199f000-0000-7000-8000-0000000000b${id}`,
  productName,
  saleUnit: "kg" as const,
  unitCostUsd: null,
  margin: null,
  priceUsd: "1.0000",
  priceBs,
});

const LIST: PriceList = {
  id: "0199f000-0000-7000-8000-0000000000c1",
  tripId: null,
  saleRate: "200.0000",
  publishedAt: "2026-10-20T12:00:00.000Z",
  lines: [line("1", "Tomate perita", "450.0000"), line("2", "Ñame", "350.0000")],
};

describe("PriceListScreen", () => {
  it("the manager sees every price, a manual one without margin, and searches by name", async () => {
    setDesktop(true);
    vi.mocked(getCurrentPriceList).mockResolvedValue(LIST);
    render(<PriceListScreen />, { wrapper: SwrTestWrapper });

    expect(await screen.findByText("Tomate perita")).toBeDefined();
    expect(screen.getByText("350,00 Bs / kg")).toBeDefined();

    fireEvent.change(screen.getByLabelText("Buscar producto"), { target: { value: "NAME" } });
    expect(screen.queryByText("Tomate perita")).toBeNull();
    expect(screen.getByText("Ñame")).toBeDefined();

    fireEvent.change(screen.getByLabelText("Buscar producto"), { target: { value: "papa" } });
    expect(screen.getByText("Ningún producto coincide con la búsqueda.")).toBeDefined();
  });
});
