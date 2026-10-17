import type { PriceList, PriceProposal } from "@ta/validators";
import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";

import {
  getPriceProposal,
  publishPriceProposal,
} from "@/features/price-lists/api/price-proposal-requests";
import { PriceProposalScreen } from "@/features/price-lists/components/price-proposal-screen";
import { setDesktop } from "@/testing/media";
import { SwrTestWrapper } from "@/testing/swr-wrapper";

const push = vi.hoisted(() => vi.fn());

vi.mock("next/navigation", () => ({
  useRouter: () => ({ push }),
}));

vi.mock("@/features/price-lists/api/price-proposal-requests", () => ({
  getPriceProposal: vi.fn(),
  publishPriceProposal: vi.fn(),
}));

const PROPOSAL: PriceProposal = {
  currentSaleRate: "210.0000",
  proposedSaleRate: "211.0000",
  bcvChanged: true,
  lines: [
    {
      id: "0199f000-0000-7000-8000-0000000000a1",
      productId: "0199f000-0000-7000-8000-0000000000b1",
      productName: "Tomate",
      saleUnit: "kg",
      unitCostUsd: "0.9136",
      margin: "0.5000",
      priceUsd: "1.4000",
      priceBs: "294.0000",
      proposedPriceBs: "296.0000",
      changed: true,
    },
    {
      id: "0199f000-0000-7000-8000-0000000000a2",
      productId: "0199f000-0000-7000-8000-0000000000b2",
      productName: "Cilantro",
      saleUnit: "unit",
      unitCostUsd: "0.4000",
      margin: "0.5000",
      priceUsd: "0.0500",
      priceBs: "11.0000",
      proposedPriceBs: "11.0000",
      changed: false,
    },
  ],
};

const PUBLISHED: PriceList = {
  id: "0199f000-0000-7000-8000-0000000000c1",
  tripId: null,
  saleRate: "211.0000",
  publishedAt: "2027-08-03T12:00:00.000Z",
  lines: [],
};

describe("PriceProposalScreen", () => {
  beforeEach(() => {
    setDesktop(true);
    push.mockReset();
    vi.mocked(getPriceProposal).mockReset();
    vi.mocked(publishPriceProposal).mockReset();
    vi.mocked(getPriceProposal).mockResolvedValue(PROPOSAL);
    vi.mocked(publishPriceProposal).mockResolvedValue(PUBLISHED);
  });

  it("shows only the products whose bolívar price moves, and publishes on confirm", async () => {
    render(<PriceProposalScreen />, { wrapper: SwrTestWrapper });

    expect(await screen.findByText("Tomate")).toBeDefined();
    expect(screen.queryByText("Cilantro")).toBeNull();
    expect(screen.getByText("296,00 Bs / kg")).toBeDefined();
    expect(screen.getByText(/La tasa BCV cambió/)).toBeDefined();

    fireEvent.click(screen.getByRole("button", { name: "Publicar precios" }));

    await waitFor(() => expect(publishPriceProposal).toHaveBeenCalledOnce());
    await waitFor(() => expect(push).toHaveBeenCalledWith("/prices"));
  });

  it("says so when today's rate changes no price", async () => {
    vi.mocked(getPriceProposal).mockResolvedValue({
      ...PROPOSAL,
      proposedSaleRate: null,
      bcvChanged: false,
      lines: [],
    });
    render(<PriceProposalScreen />, { wrapper: SwrTestWrapper });

    expect(
      await screen.findByText("La tasa de hoy no cambia ningún precio en bolívares."),
    ).toBeDefined();
    expect(screen.queryByRole("button", { name: "Publicar precios" })).toBeNull();
  });
});
