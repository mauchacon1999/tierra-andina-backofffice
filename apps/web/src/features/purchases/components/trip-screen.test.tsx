import { fireEvent, render, screen, waitFor, within } from "@testing-library/react";
import type { TripDetail } from "@ta/validators";
import { beforeEach, describe, expect, it, vi } from "vitest";

import { closeTrip, deleteLine, getTrip } from "@/features/purchases/api/purchase-requests";
import { listShoppingItems } from "@/features/shopping-list/api/shopping-list-requests";
import { TripScreen } from "@/features/purchases/components/trip-screen";
import { ApiError } from "@/lib/api";
import { OPEN_TRIP, TOMATO_LINE } from "@/testing/purchase-fixtures";
import { setDesktop } from "@/testing/media";
import { SwrTestWrapper } from "@/testing/swr-wrapper";

vi.mock("next/navigation", async () => {
  const { OPEN_TRIP: trip } = await import("@/testing/purchase-fixtures");
  return { useParams: () => ({ id: trip.id }) };
});
vi.mock("@/features/shopping-list/api/shopping-list-requests", () => ({
  listShoppingItems: vi.fn(async () => ({ data: [] })),
}));
vi.mock("@/features/purchases/api/purchase-requests", () => ({
  getTrip: vi.fn(),
  closeTrip: vi.fn(),
  deleteLine: vi.fn(),
}));
// The line form has its own tests; here it only matters whether it is offered.
vi.mock("@/features/purchases/components/purchase-line-form", () => ({
  PurchaseLineForm: ({ line }: { line?: { productName: string } }) => (
    <p>{line ? `Formulario de ${line.productName}` : "Formulario de compra"}</p>
  ),
}));

const WITH_LINE: TripDetail = {
  ...OPEN_TRIP,
  lines: [TOMATO_LINE],
  lineCount: 1,
  totalUsd: "20.1000",
  totalBs: "4020.0000",
};

describe("TripScreen", () => {
  beforeEach(() => {
    vi.mocked(closeTrip).mockReset();
    vi.mocked(deleteLine).mockReset();
    vi.mocked(listShoppingItems).mockReset();
    vi.mocked(listShoppingItems).mockResolvedValue({ data: [] });
  });

  it("an open trip shows its rates, totals and its purchases, without the add form", async () => {
    setDesktop(true);
    vi.mocked(getTrip).mockResolvedValue(WITH_LINE);
    render(<TripScreen />, { wrapper: SwrTestWrapper });

    const table = await screen.findByRole("table", { name: "Compras de la jornada" });
    const row = within(table).getAllByRole("row")[1]!;
    expect(within(row).getByText("Tomate perita")).toBeDefined();
    expect(within(row).getByText("Puesto 14")).toBeDefined();
    expect(within(row).getByText("1 cesta")).toBeDefined();
    expect(within(row).getByText("24 → 22 kg")).toBeDefined();
    expect(within(row).getByText("1,40 $/kg")).toBeDefined();
    expect(screen.getByText("201,00 Bs")).toBeDefined();
    expect(screen.getAllByText("4.020,00 Bs").length).toBeGreaterThan(0);
    expect(screen.queryByText("Formulario de compra")).toBeNull();
    expect(within(row).getByText("Por recibir")).toBeDefined();
    expect(screen.getByText("1 compra por recibir")).toBeDefined();
  });

  it("a partial receipt shows what arrived and the cost of what arrived", async () => {
    setDesktop(true);
    vi.mocked(getTrip).mockResolvedValue({
      ...WITH_LINE,
      lines: [
        {
          ...TOMATO_LINE,
          packs: "2.0000",
          receiptStatus: "partial",
          receivedPacks: "1.0000",
          receivedQuantity: "12.0000",
          receivedUsableQuantity: "11.0000",
          receivedUnitCostUsd: "1.8273",
          receivedSalePriceUsd: "2.7500",
        },
      ],
    });
    render(<TripScreen />, { wrapper: SwrTestWrapper });

    const table = await screen.findByRole("table", { name: "Compras de la jornada" });
    const row = within(table).getAllByRole("row")[1]!;
    expect(within(row).getByText("Incompleto")).toBeDefined();
    expect(within(row).getByText("Llegaron 1 cesta")).toBeDefined();
    expect(within(row).getByText("2,75 $/kg")).toBeDefined();
    expect(screen.getByText("Todo recibido en la camioneta")).toBeDefined();
  });

  it("shows what is still to buy, without the add form", async () => {
    vi.mocked(getTrip).mockResolvedValue(OPEN_TRIP);
    vi.mocked(listShoppingItems).mockResolvedValue({
      data: [
        {
          id: "0199f0a0-0000-7000-8000-000000000001",
          productId: "0199f0a0-0000-7000-8000-000000000002",
          productName: "Cebolla",
          note: "se acabó",
          status: "open",
          purchaseLineId: null,
          createdAt: "2026-10-16T12:00:00.000Z",
        },
      ],
    });
    render(<TripScreen />, { wrapper: SwrTestWrapper });

    expect(await screen.findByText("Cebolla")).toBeDefined();
    expect(screen.getByText("se acabó")).toBeDefined();
    expect(screen.getByText("1 por comprar")).toBeDefined();
    expect(screen.getByText(/ordénalos como vas a recorrer el mercado/)).toBeDefined();
    expect(screen.queryByText("Formulario de compra")).toBeNull();

    fireEvent.click(screen.getByRole("button", { name: "Comprar Cebolla" }));

    expect(screen.getByText("Formulario de compra")).toBeDefined();
  });

  it("reorders the pending list and keeps that order on this phone", async () => {
    vi.mocked(getTrip).mockResolvedValue(OPEN_TRIP);
    vi.mocked(listShoppingItems).mockResolvedValue({
      data: [
        {
          id: "0199f0a0-0000-7000-8000-000000000001",
          productId: "0199f0a0-0000-7000-8000-000000000002",
          productName: "Cebolla",
          note: null,
          status: "open",
          purchaseLineId: null,
          createdAt: "2026-10-16T12:00:00.000Z",
        },
        {
          id: "0199f0a0-0000-7000-8000-000000000003",
          productId: "0199f0a0-0000-7000-8000-000000000004",
          productName: "Tomate perita",
          note: null,
          status: "open",
          purchaseLineId: null,
          createdAt: "2026-10-16T12:01:00.000Z",
        },
      ],
    });
    const { unmount } = render(<TripScreen />, { wrapper: SwrTestWrapper });
    const pending = async () =>
      within(await screen.findByRole("region", { name: "Faltantes" })).getAllByRole("listitem");

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
    render(<TripScreen />, { wrapper: SwrTestWrapper });
    const again = (await pending()).map((item) => item.textContent);
    expect(again[0]).toContain("Tomate perita");
    expect(again[1]).toContain("Cebolla");
  });

  it("closing with purchases still to receive warns first", async () => {
    vi.mocked(getTrip).mockResolvedValue(WITH_LINE);
    render(<TripScreen />, { wrapper: SwrTestWrapper });

    fireEvent.click(await screen.findByRole("button", { name: "Cerrar jornada" }));

    expect(
      screen.getByRole("group", {
        name: "Queda 1 compra sin recibir. ¿Cerrar la jornada igual?",
      }),
    ).toBeDefined();
  });

  it("closing asks first, then the trip is read-only", async () => {
    vi.mocked(getTrip).mockResolvedValue(WITH_LINE);
    vi.mocked(closeTrip).mockResolvedValue({ ...WITH_LINE, status: "closed" });
    render(<TripScreen />, { wrapper: SwrTestWrapper });

    fireEvent.click(await screen.findByRole("button", { name: "Cerrar jornada" }));
    fireEvent.click(
      within(screen.getByRole("group", { name: /¿Cerrar la jornada/ })).getByRole("button", {
        name: "Cerrar jornada",
      }),
    );

    expect(await screen.findByText("Cerrada")).toBeDefined();
    expect(closeTrip).toHaveBeenCalledWith(OPEN_TRIP.id);
    expect(screen.queryByText("Formulario de compra")).toBeNull();
    // No actions on a closed trip.
    expect(screen.queryByRole("button", { name: "Acciones de Tomate perita" })).toBeNull();
  });

  it("editing a purchase opens its form in a dialog", async () => {
    vi.mocked(getTrip).mockResolvedValue(WITH_LINE);
    render(<TripScreen />, { wrapper: SwrTestWrapper });

    fireEvent.click(await screen.findByRole("button", { name: "Acciones de Tomate perita" }));
    fireEvent.click(screen.getByRole("menuitem", { name: "Editar" }));

    const dialog = screen.getByRole("dialog", { name: "Editar Tomate perita" });
    expect(within(dialog).getByText("Formulario de Tomate perita")).toBeDefined();
  });

  it("deletes a purchase after confirming", async () => {
    vi.mocked(getTrip).mockResolvedValue(WITH_LINE);
    vi.mocked(deleteLine).mockResolvedValue({ ...OPEN_TRIP });
    render(<TripScreen />, { wrapper: SwrTestWrapper });

    fireEvent.click(await screen.findByRole("button", { name: "Acciones de Tomate perita" }));
    fireEvent.click(screen.getByRole("menuitem", { name: "Eliminar" }));
    const dialog = screen.getByRole("dialog", { name: "¿Eliminar Tomate perita?" });
    expect(deleteLine).not.toHaveBeenCalled();
    fireEvent.click(within(dialog).getByRole("button", { name: "Eliminar" }));

    await waitFor(() => expect(deleteLine).toHaveBeenCalledWith(OPEN_TRIP.id, TOMATO_LINE.id));
    expect(await screen.findByText("Aún no hay compras.")).toBeDefined();
  });

  it("shows the API message when the trip cannot be closed", async () => {
    vi.mocked(getTrip).mockResolvedValue(WITH_LINE);
    vi.mocked(closeTrip).mockRejectedValue(
      new ApiError({ status: 409, code: "TRIP_CLOSED", message: "La jornada está cerrada" }),
    );
    render(<TripScreen />, { wrapper: SwrTestWrapper });

    fireEvent.click(await screen.findByRole("button", { name: "Cerrar jornada" }));
    fireEvent.click(
      within(screen.getByRole("group", { name: /¿Cerrar la jornada/ })).getByRole("button", {
        name: "Cerrar jornada",
      }),
    );

    expect(await screen.findByText("La jornada está cerrada")).toBeDefined();
  });
});
