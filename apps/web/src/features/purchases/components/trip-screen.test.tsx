import { fireEvent, render, screen, waitFor, within } from "@testing-library/react";
import type { TripDetail } from "@ta/validators";
import { beforeEach, describe, expect, it, vi } from "vitest";

import { closeTrip, deleteLine, getTrip } from "@/features/purchases/api/purchase-requests";
import { TripScreen } from "@/features/purchases/components/trip-screen";
import { ApiError } from "@/lib/api";
import { OPEN_TRIP, TOMATO_LINE } from "@/testing/purchase-fixtures";
import { setDesktop } from "@/testing/media";
import { SwrTestWrapper } from "@/testing/swr-wrapper";

vi.mock("next/navigation", async () => {
  const { OPEN_TRIP: trip } = await import("@/testing/purchase-fixtures");
  return { useParams: () => ({ id: trip.id }) };
});
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
  });

  it("an open trip shows its rates, totals, the line form and its purchases", async () => {
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
    expect(screen.getByText("Formulario de compra")).toBeDefined();
  });

  it("closing asks first, then the trip is read-only", async () => {
    vi.mocked(getTrip).mockResolvedValue(WITH_LINE);
    vi.mocked(closeTrip).mockResolvedValue({ ...WITH_LINE, status: "closed" });
    render(<TripScreen />, { wrapper: SwrTestWrapper });

    fireEvent.click(await screen.findByRole("button", { name: "Cerrar jornada" }));
    fireEvent.click(
      within(screen.getByRole("group", { name: "¿Cerrar la jornada?" })).getByRole("button", {
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
      within(screen.getByRole("group", { name: "¿Cerrar la jornada?" })).getByRole("button", {
        name: "Cerrar jornada",
      }),
    );

    expect(await screen.findByText("La jornada está cerrada")).toBeDefined();
  });
});
