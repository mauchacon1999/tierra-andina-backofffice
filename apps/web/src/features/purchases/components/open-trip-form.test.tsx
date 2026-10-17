import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";

import { getDailyRates } from "@/features/exchange-rates/api/exchange-rates-requests";
import { openTrip } from "@/features/purchases/api/purchase-requests";
import { OpenTripForm } from "@/features/purchases/components/open-trip-form";
import { OPEN_TRIP } from "@/testing/purchase-fixtures";
import { SwrTestWrapper } from "@/testing/swr-wrapper";

const push = vi.fn();
vi.mock("next/navigation", () => ({ useRouter: () => ({ push }) }));
vi.mock("@/features/exchange-rates/api/exchange-rates-requests", () => ({
  getDailyRates: vi.fn(),
}));
vi.mock("@/features/purchases/api/purchase-requests", () => ({ openTrip: vi.fn() }));

describe("OpenTripForm", () => {
  beforeEach(() => {
    push.mockReset();
    vi.mocked(openTrip).mockReset();
  });

  it("shows the day's rates and opens the trip, then goes to it", async () => {
    vi.mocked(getDailyRates).mockImplementation(async (date) => ({
      businessDate: date,
      bcv: "200.0000",
      market: "201.0000",
      sale: null,
    }));
    vi.mocked(openTrip).mockResolvedValue(OPEN_TRIP);
    render(<OpenTripForm />, { wrapper: SwrTestWrapper });

    expect(await screen.findByText("BCV 200,00 Bs · Coche 201,00 Bs")).toBeDefined();
    fireEvent.input(screen.getByLabelText("Nota"), { target: { value: "Compra grande" } });
    fireEvent.click(screen.getByRole("button", { name: "Abrir jornada" }));

    await waitFor(() => expect(push).toHaveBeenCalledWith(`/purchases/${OPEN_TRIP.id}`));
    expect(vi.mocked(openTrip).mock.calls[0]?.[0]).toMatchObject({ note: "Compra grande" });
  });

  it("without the Coche rate it cannot open and links to 'Tasas del día'", async () => {
    vi.mocked(getDailyRates).mockImplementation(async (date) => ({
      businessDate: date,
      bcv: "200.0000",
      market: null,
      sale: null,
    }));
    render(<OpenTripForm />, { wrapper: SwrTestWrapper });

    expect(await screen.findByText("Falta la tasa Coche")).toBeDefined();
    expect(screen.getByRole("link", { name: "Ir a Tasas del día" }).getAttribute("href")).toBe(
      "/rates",
    );
    expect(screen.getByRole("button", { name: "Abrir jornada" }).hasAttribute("disabled")).toBe(
      true,
    );
  });

  it("names both rates when neither is set", async () => {
    vi.mocked(getDailyRates).mockImplementation(async (date) => ({
      businessDate: date,
      bcv: null,
      market: null,
      sale: null,
    }));
    render(<OpenTripForm />, { wrapper: SwrTestWrapper });

    expect(await screen.findByText("Falta la tasa BCV y la tasa Coche")).toBeDefined();
  });
});
