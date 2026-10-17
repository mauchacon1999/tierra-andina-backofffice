import { fireEvent, render, screen, waitFor, within } from "@testing-library/react";
import type { ReceiptLine, ReceiptTrip } from "@ta/validators";
import { beforeEach, describe, expect, it, vi } from "vitest";

import { listReceipts, setReceipt } from "@/features/receipts/api/receipt-requests";
import { ReceiptScreen } from "@/features/receipts/components/receipt-screen";
import { ApiError } from "@/lib/api";
import { SwrTestWrapper } from "@/testing/swr-wrapper";

vi.mock("@/features/receipts/api/receipt-requests", () => ({
  listReceipts: vi.fn(),
  setReceipt: vi.fn(),
}));

const LINE: ReceiptLine = {
  id: "01a14314-2825-7000-a1d1-bdf734d05991",
  productName: "Tomate perita",
  purchaseUnit: "crate",
  saleUnit: "kg",
  packs: "3.0000",
  grossQuantity: "72.0000",
  supplierName: null,
  stallReference: "Puesto 14",
  receiptStatus: "pending",
  receivedPacks: null,
  receivedQuantity: null,
  receiptNote: null,
  receivedAt: null,
  quotedPriceUsd: null,
  createdAt: "2026-10-16T10:00:00.000Z",
};

const TRIP: ReceiptTrip = {
  id: "01a14314-2825-7000-a1d1-bdf734d059a0",
  businessDate: "2026-10-16",
  note: null,
  lines: [
    {
      ...LINE,
      id: "01a14314-2825-7000-a1d1-bdf734d05992",
      productName: "Cilantro",
      receiptStatus: "received",
      createdAt: "2026-10-16T09:00:00.000Z",
    },
    LINE,
  ],
};

const card = (product: string) =>
  screen.getByRole("group", { name: `Qué llegó de ${product}` }).closest("section")!;

describe("ReceiptScreen", () => {
  beforeEach(() => {
    vi.mocked(listReceipts).mockReset();
    vi.mocked(setReceipt).mockReset();
  });

  it("lists what to check, pending first, with the count still to receive and no prices", async () => {
    vi.mocked(listReceipts).mockResolvedValue([TRIP]);
    render(<ReceiptScreen />, { wrapper: SwrTestWrapper });

    const section = await screen.findByRole("region", { name: "viernes 16/10/2026" });
    expect(within(section).getByText("1 por recibir")).toBeDefined();
    const names = within(section)
      .getAllByRole("listitem")
      .map((item) => within(item).getAllByText(/Tomate perita|Cilantro/)[0]?.textContent);
    expect(names).toEqual(["Tomate perita", "Cilantro"]);
    expect(within(section).getAllByText("3 cestas · Puesto 14")).toHaveLength(2);
    expect(within(section).queryByText(/Precio/)).toBeNull();
  });

  it("'Recibido' saves at once", async () => {
    vi.mocked(listReceipts).mockResolvedValue([TRIP]);
    vi.mocked(setReceipt).mockResolvedValue({
      ...TRIP,
      lines: TRIP.lines.map((l) => (l.id === LINE.id ? { ...l, receiptStatus: "received" } : l)),
    });
    render(<ReceiptScreen />, { wrapper: SwrTestWrapper });

    const group = await screen.findByRole("group", { name: "Qué llegó de Tomate perita" });
    fireEvent.click(within(group).getByRole("button", { name: "Recibido" }));

    await waitFor(() =>
      expect(setReceipt).toHaveBeenCalledWith(TRIP.id, LINE.id, { status: "received" }),
    );
    expect(await screen.findByText("Todo revisado")).toBeDefined();
  });

  it("'Incompleto' asks how much arrived and sends it", async () => {
    vi.mocked(listReceipts).mockResolvedValue([TRIP]);
    vi.mocked(setReceipt).mockResolvedValue(TRIP);
    render(<ReceiptScreen />, { wrapper: SwrTestWrapper });

    const group = await screen.findByRole("group", { name: "Qué llegó de Tomate perita" });
    fireEvent.click(within(group).getByRole("button", { name: "Incompleto" }));
    const dialog = screen.getByRole("dialog", { name: "¿Cuánto llegó de Tomate perita?" });
    expect(within(dialog).getByText("De 3 cestas compradas.")).toBeDefined();
    fireEvent.input(within(dialog).getByLabelText(/Cestas que llegaron/), {
      target: { value: "2" },
    });
    fireEvent.input(within(dialog).getByLabelText("Nota"), { target: { value: "Faltó una" } });
    fireEvent.click(within(dialog).getByRole("button", { name: "Guardar" }));

    await waitFor(() =>
      expect(setReceipt).toHaveBeenCalledWith(TRIP.id, LINE.id, {
        status: "partial",
        receivedPacks: "2",
        note: "Faltó una",
      }),
    );
  });

  it("shows the API's range error on the packs field", async () => {
    vi.mocked(listReceipts).mockResolvedValue([TRIP]);
    vi.mocked(setReceipt).mockRejectedValue(
      new ApiError({
        status: 422,
        code: "INVALID_RECEIPT",
        message: "Revisa lo que llegó",
        details: { fieldErrors: { receivedPacks: ["Debe ser más de 0 y menos de lo comprado"] } },
      }),
    );
    render(<ReceiptScreen />, { wrapper: SwrTestWrapper });

    const group = await screen.findByRole("group", { name: "Qué llegó de Tomate perita" });
    fireEvent.click(within(group).getByRole("button", { name: "Incompleto" }));
    const dialog = screen.getByRole("dialog", { name: "¿Cuánto llegó de Tomate perita?" });
    fireEvent.input(within(dialog).getByLabelText(/Cestas que llegaron/), {
      target: { value: "3" },
    });
    fireEvent.click(within(dialog).getByRole("button", { name: "Guardar" }));

    expect(
      await within(dialog).findByText("Debe ser más de 0 y menos de lo comprado"),
    ).toBeDefined();
  });

  it("a marked line can be undone", async () => {
    vi.mocked(listReceipts).mockResolvedValue([TRIP]);
    vi.mocked(setReceipt).mockResolvedValue(TRIP);
    render(<ReceiptScreen />, { wrapper: SwrTestWrapper });

    await screen.findByRole("group", { name: "Qué llegó de Cilantro" });
    fireEvent.click(within(card("Cilantro")).getAllByRole("button", { name: "Deshacer" })[0]!);

    await waitFor(() =>
      expect(setReceipt).toHaveBeenCalledWith(TRIP.id, TRIP.lines[0]!.id, { status: "pending" }),
    );
  });

  it("without open trips it says so", async () => {
    vi.mocked(listReceipts).mockResolvedValue([]);
    render(<ReceiptScreen />, { wrapper: SwrTestWrapper });

    expect(await screen.findByText(/No hay jornadas abiertas/)).toBeDefined();
  });
});
