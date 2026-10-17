import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";

import {
  getDailyRates,
  setDailyRates,
} from "@/features/exchange-rates/api/exchange-rates-requests";
import { DailyRatesForm } from "@/features/exchange-rates/components/daily-rates-form";
import { SwrTestWrapper } from "@/testing/swr-wrapper";

vi.mock("@/features/exchange-rates/api/exchange-rates-requests", () => ({
  getDailyRates: vi.fn(),
  setDailyRates: vi.fn(),
  listDailyRates: vi.fn(),
}));

const DAY = "2026-10-16";
const valueOf = (label: string) => (screen.getByLabelText(label) as HTMLInputElement).value;

describe("DailyRatesForm", () => {
  beforeEach(() => {
    vi.mocked(setDailyRates).mockReset();
    vi.mocked(getDailyRates).mockImplementation(async (date) => ({
      businessDate: date,
      bcv: "200.0000",
      market: null,
      sale: null,
    }));
  });

  it("shows the stored rates of the day without padding zeros", async () => {
    render(<DailyRatesForm initialDate={DAY} />, { wrapper: SwrTestWrapper });

    await waitFor(() => expect(valueOf("Tasa BCV")).toBe("200"));
    expect(valueOf("Tasa de Coche")).toBe("");
    expect(screen.getByText("viernes 16/10/2026")).toBeDefined();
  });

  it("saves only the rates that were typed", async () => {
    vi.mocked(setDailyRates).mockResolvedValue({
      businessDate: DAY,
      bcv: "200.0000",
      market: "201.5000",
      sale: null,
    });
    render(<DailyRatesForm initialDate={DAY} />, { wrapper: SwrTestWrapper });
    await waitFor(() => expect(valueOf("Tasa BCV")).toBe("200"));

    fireEvent.input(screen.getByLabelText("Tasa de Coche"), { target: { value: "201.5" } });
    fireEvent.click(screen.getByRole("button", { name: "Guardar tasas" }));

    await waitFor(() =>
      expect(setDailyRates).toHaveBeenCalledWith(DAY, { bcv: "200", market: "201.5" }),
    );
    expect(await screen.findByText("Tasas guardadas.")).toBeDefined();
  });

  it("rejects a zero rate", async () => {
    render(<DailyRatesForm initialDate={DAY} />, { wrapper: SwrTestWrapper });
    await waitFor(() => expect(valueOf("Tasa BCV")).toBe("200"));

    fireEvent.input(screen.getByLabelText("Tasa de Coche"), { target: { value: "0" } });
    fireEvent.click(screen.getByRole("button", { name: "Guardar tasas" }));

    expect(await screen.findByText("La tasa debe ser mayor que 0")).toBeDefined();
    expect(setDailyRates).not.toHaveBeenCalled();
  });
});
