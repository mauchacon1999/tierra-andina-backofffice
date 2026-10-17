import { fireEvent, render, screen, waitFor, within } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";

import {
  approveDailyClose,
  getDailyClose,
  listDailyCloses,
  listPaymentMethods,
  updateDailyClose,
} from "@/features/daily-closes/api/daily-close-requests";
import { CloseDetailScreen } from "@/features/daily-closes/components/close-detail-screen";
import { ClosesScreen } from "@/features/daily-closes/components/closes-screen";
import { METHODS, TUESDAY_CLOSE } from "@/testing/close-fixtures";
import { setDesktop } from "@/testing/media";
import { SwrTestWrapper } from "@/testing/swr-wrapper";

vi.mock("next/navigation", () => ({ useParams: () => ({ date: "2026-10-13" }) }));
vi.mock("@/features/daily-closes/api/daily-close-requests", () => ({
  listPaymentMethods: vi.fn(),
  listDailyCloses: vi.fn(),
  getDailyClose: vi.fn(),
  approveDailyClose: vi.fn(),
  updateDailyClose: vi.fn(),
  searchCustomers: vi.fn().mockResolvedValue([]),
}));

const { credits: _c, expenses: _e, ...SUMMARY } = TUESDAY_CLOSE;

describe("ClosesScreen (owner)", () => {
  beforeEach(() => {
    vi.mocked(listPaymentMethods).mockResolvedValue(METHODS);
    vi.mocked(listDailyCloses).mockResolvedValue([SUMMARY]);
  });

  it("one column per method like the Excel, totals per currency, batch and status", async () => {
    setDesktop(true);
    render(<ClosesScreen />, { wrapper: SwrTestWrapper });

    const table = await screen.findByRole("table", { name: "Cierres" });
    await waitFor(() =>
      expect(
        within(table)
          .getAllByRole("columnheader")
          .map((h) => h.textContent),
      ).toEqual([
        "Fecha",
        "Punto de venta",
        "Efectivo Bs",
        "Efectivo USD",
        "Pago móvil",
        "Total Bs",
        "Total $",
        "Lote",
        "Estado",
        "Acciones",
      ]),
    );
    const row = within(table).getAllByRole("row")[1]!;
    for (const text of ["163.344,00 Bs", "252.413,00 Bs", "16", "Por revisar"]) {
      expect(within(row).getByText(text)).toBeDefined();
    }
    // Dólares column and Total $ (the only dollar method), never mixed with the Bs.
    expect(within(row).getAllByText("18.000,00 $")).toHaveLength(2);
    expect(within(row).getByRole("link", { name: "martes 13/10/2026" }).getAttribute("href")).toBe(
      "/closes/2026-10-13",
    );
  });
});

describe("CloseDetailScreen (owner)", () => {
  beforeEach(() => {
    vi.mocked(listPaymentMethods).mockResolvedValue(METHODS);
    vi.mocked(getDailyClose).mockResolvedValue(TUESDAY_CLOSE);
    vi.mocked(approveDailyClose).mockReset();
    vi.mocked(updateDailyClose).mockReset();
  });

  it("approves after confirming", async () => {
    vi.mocked(approveDailyClose).mockResolvedValue({
      ...TUESDAY_CLOSE,
      status: "approved",
      approvedBy: { id: "o1", name: "Dueño" },
      approvedAt: "2026-10-14T12:00:00.000Z",
    });
    render(<CloseDetailScreen />, { wrapper: SwrTestWrapper });

    fireEvent.click(await screen.findByRole("button", { name: "Aprobar" }));
    const confirm = screen.getByRole("group", {
      name: "¿Aprobar el cierre del martes 13/10/2026?",
    });
    fireEvent.click(within(confirm).getByRole("button", { name: "Aprobar" }));

    await waitFor(() => expect(approveDailyClose).toHaveBeenCalledWith(TUESDAY_CLOSE.id));
    expect(await screen.findByText("Aprobado por Dueño", { exact: false })).toBeDefined();
    expect(screen.queryByRole("button", { name: "Aprobar" })).toBeNull();
  });

  it("corrects with the same form, prefilled with the close", async () => {
    vi.mocked(updateDailyClose).mockResolvedValue({ ...TUESDAY_CLOSE, cardBatch: "17" });
    render(<CloseDetailScreen />, { wrapper: SwrTestWrapper });

    fireEvent.click(await screen.findByRole("button", { name: "Corregir" }));
    expect(((await screen.findByLabelText("Punto de venta")) as HTMLInputElement).value).toBe(
      "163344",
    );
    expect((screen.getByLabelText("Concepto") as HTMLInputElement).value).toBe("Bolsas");
    fireEvent.input(screen.getByLabelText("Lote del punto"), { target: { value: "17" } });
    fireEvent.click(screen.getByRole("button", { name: "Guardar corrección" }));

    await waitFor(() => expect(updateDailyClose).toHaveBeenCalledOnce());
    expect(vi.mocked(updateDailyClose).mock.calls[0]).toEqual([
      TUESDAY_CLOSE.id,
      expect.objectContaining({
        cardBatch: "17",
        expenses: [{ concept: "Bolsas", amount: "379", currency: "USD" }],
      }),
    ]);
    expect(await screen.findByText("Corrección guardada.")).toBeDefined();
  });
});
