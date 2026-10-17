import { fireEvent, render, screen, waitFor, within } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";

import {
  getDailyClose,
  listPaymentMethods,
  submitDailyClose,
} from "@/features/daily-closes/api/daily-close-requests";
import { DailyCloseScreen } from "@/features/daily-closes/components/daily-close-screen";
import { ApiError } from "@/lib/api";
import { METHODS, TUESDAY_CLOSE } from "@/testing/close-fixtures";
import { SwrTestWrapper } from "@/testing/swr-wrapper";

vi.mock("@/features/daily-closes/api/daily-close-requests", () => ({
  listPaymentMethods: vi.fn(),
  getDailyClose: vi.fn(),
  submitDailyClose: vi.fn(),
  searchCustomers: vi.fn().mockResolvedValue([{ id: "c1", name: "Sra. María", phone: null }]),
}));

const notFound = new ApiError({ status: 404, code: "CLOSE_NOT_FOUND", message: "No hay cierre" });
const type = (label: string | RegExp, value: string, within_: HTMLElement = document.body) =>
  fireEvent.input(within(within_).getByLabelText(label), { target: { value } });

describe("DailyCloseScreen", () => {
  beforeEach(() => {
    vi.mocked(listPaymentMethods).mockResolvedValue(METHODS);
    vi.mocked(getDailyClose).mockReset();
    vi.mocked(submitDailyClose).mockReset();
  });

  it("one amount per method in the Excel's order, totals per currency while typing", async () => {
    vi.mocked(getDailyClose).mockRejectedValue(notFound);
    render(<DailyCloseScreen />, { wrapper: SwrTestWrapper });

    await screen.findByLabelText("Punto de venta");
    const labels = METHODS.map((m) => screen.getByLabelText(m.name));
    expect(labels).toHaveLength(4);
    type("Punto de venta", "163344");
    type("Efectivo Bs", "5500");
    type("Efectivo USD", "18000");
    type("Pago móvil", "83569");

    const totals = screen.getByLabelText("Totales del día");
    await waitFor(() => expect(totals.textContent).toContain("252.413,00 Bs"));
    expect(totals.textContent).toContain("18.000,00 $");
  });

  it("sends amounts only, with batch, a credit sale and an expense", async () => {
    vi.mocked(getDailyClose).mockRejectedValue(notFound);
    vi.mocked(submitDailyClose).mockImplementation(async (close) => ({
      ...TUESDAY_CLOSE,
      businessDate: close.businessDate,
    }));
    render(<DailyCloseScreen />, { wrapper: SwrTestWrapper });

    await screen.findByLabelText("Punto de venta");
    type("Punto de venta", "163344");
    type("Efectivo USD", "18000");
    type("Lote del punto", "16");
    fireEvent.click(screen.getByRole("button", { name: "+ Agregar fiado" }));
    type("Cliente", "Sra. María");
    type(/^Monto/, "1200");
    fireEvent.click(screen.getByRole("button", { name: "+ Agregar gasto" }));
    type("Concepto", "Bolsas");
    fireEvent.input(screen.getAllByLabelText(/^Monto/)[1]!, { target: { value: "379" } });
    fireEvent.click(screen.getByRole("radio", { name: "Depositado" }));
    fireEvent.click(screen.getByRole("button", { name: "Enviar cierre" }));

    await waitFor(() => expect(submitDailyClose).toHaveBeenCalledOnce());
    const sent = vi.mocked(submitDailyClose).mock.calls[0]![0];
    expect(sent).toMatchObject({
      cardBatch: "16",
      cashDestination: "deposited",
      payments: [
        { paymentMethodId: METHODS[0]!.id, amount: "163344" },
        { paymentMethodId: METHODS[1]!.id, amount: "0" },
        { paymentMethodId: METHODS[2]!.id, amount: "18000" },
        { paymentMethodId: METHODS[3]!.id, amount: "0" },
      ],
      credits: [{ customerName: "Sra. María", amount: "1200", currency: "VES" }],
      expenses: [{ concept: "Bolsas", amount: "379", currency: "USD" }],
    });
    expect(sent).not.toHaveProperty("rate");
    // The day now shows the close that was sent, read-only.
    expect(await screen.findByText("Cierre enviado. El dueño lo revisa.")).toBeDefined();
    expect(screen.queryByRole("button", { name: "Enviar cierre" })).toBeNull();
  });

  it("a day already sent shows it read-only: only the owner corrects it", async () => {
    vi.mocked(getDailyClose).mockResolvedValue(TUESDAY_CLOSE);
    render(<DailyCloseScreen />, { wrapper: SwrTestWrapper });

    expect(await screen.findByText(/El cierre de este día ya fue enviado/)).toBeDefined();
    expect(screen.getByText("Por revisar")).toBeDefined();
    expect(screen.queryByRole("button", { name: "Enviar cierre" })).toBeNull();
    expect(screen.getByLabelText("Totales del día").textContent).toContain("379,00 $");
  });

  it("shows the API's answer when the day was closed meanwhile", async () => {
    vi.mocked(getDailyClose).mockRejectedValue(notFound);
    vi.mocked(submitDailyClose).mockRejectedValue(
      new ApiError({ status: 409, code: "CLOSE_EXISTS", message: "Ese día ya tiene cierre." }),
    );
    render(<DailyCloseScreen />, { wrapper: SwrTestWrapper });

    await screen.findByLabelText("Punto de venta");
    fireEvent.click(screen.getByRole("button", { name: "Enviar cierre" }));

    expect(await screen.findByRole("alert")).toBeDefined();
    expect(screen.getByRole("alert").textContent).toBe("Ese día ya tiene cierre.");
  });
});
