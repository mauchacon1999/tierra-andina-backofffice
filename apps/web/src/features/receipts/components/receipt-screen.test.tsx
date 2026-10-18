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
  toBuy: [],
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

  it("splits the trip into pending and received, with a status on each product", async () => {
    vi.mocked(listReceipts).mockResolvedValue([
      {
        ...TRIP,
        toBuy: [
          {
            id: "01a14314-2825-7000-a1d1-bdf734d059b1",
            productName: "Cebolla",
            note: "se acabó",
          },
        ],
      },
    ]);
    render(<ReceiptScreen />, { wrapper: SwrTestWrapper });

    const section = await screen.findByRole("region", { name: "viernes 16/10/2026" });
    const pending = within(section).getByRole("region", { name: "Pendientes" });
    const received = within(section).getByRole("region", { name: "Recibidos" });
    const pendingNames = within(pending)
      .getAllByRole("listitem")
      .map((item) => item.textContent);
    expect(pendingNames[0]).toContain("Cebolla");
    expect(pendingNames[0]).toContain("Por comprar");
    expect(pendingNames[1]).toContain("Tomate perita");
    expect(pendingNames[1]).toContain("En camino");
    expect(
      within(pending).queryByRole("button", { name: "Marcar Cebolla como recibido" }),
    ).toBeNull();
    expect(within(received).getByText("Cilantro")).toBeDefined();
    expect(within(received).getByText("Recibido")).toBeDefined();
    expect(within(section).getByText("1 por recibir")).toBeDefined();
    expect(within(section).queryByText(/Precio/)).toBeNull();
  });

  it("dragging a pending row reorders the list and keeps that order", async () => {
    vi.mocked(listReceipts).mockResolvedValue([
      {
        ...TRIP,
        toBuy: [
          {
            id: "01a14314-2825-7000-a1d1-bdf734d059b1",
            productName: "Cebolla",
            note: null,
          },
        ],
      },
    ]);
    const { unmount } = render(<ReceiptScreen />, { wrapper: SwrTestWrapper });

    const pending = async () =>
      within(await screen.findByRole("region", { name: "Pendientes" })).getAllByRole("listitem");
    fireEvent.keyDown(
      within((await pending())[0]!).getByRole("button", { name: "Mover Cebolla" }),
      {
        key: "ArrowDown",
      },
    );

    const names = (await pending()).map((item) => item.textContent);
    expect(names[0]).toContain("Tomate perita");
    expect(names[1]).toContain("Cebolla");

    unmount();
    render(<ReceiptScreen />, { wrapper: SwrTestWrapper });
    const again = (await pending()).map((item) => item.textContent);
    expect(again[0]).toContain("Tomate perita");
    expect(again[1]).toContain("Cebolla");
  });

  it("the check marks the product received and moves it to Recibidos", async () => {
    vi.mocked(listReceipts).mockResolvedValue([TRIP]);
    vi.mocked(setReceipt).mockResolvedValue({
      ...TRIP,
      lines: TRIP.lines.map((l) => (l.id === LINE.id ? { ...l, receiptStatus: "received" } : l)),
    });
    render(<ReceiptScreen />, { wrapper: SwrTestWrapper });

    const group = await screen.findByRole("group", { name: "Qué llegó de Tomate perita" });
    fireEvent.click(
      within(group).getByRole("button", { name: "Marcar Tomate perita como recibido" }),
    );

    await waitFor(() => {
      const received = screen.getByRole("region", { name: "Recibidos" });
      expect(within(received).getByText("Tomate perita")).toBeDefined();
    });
    expect(setReceipt).toHaveBeenCalledWith(TRIP.id, LINE.id, { status: "received" });
    expect(
      within(screen.getByRole("region", { name: "Pendientes" })).queryByText("Tomate perita"),
    ).toBeNull();
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
