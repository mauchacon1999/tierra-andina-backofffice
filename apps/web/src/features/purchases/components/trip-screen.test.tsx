import { fireEvent, render, screen, waitFor, within } from "@testing-library/react";
import type { TripDetail } from "@ta/validators";
import { beforeEach, describe, expect, it, vi } from "vitest";

import { closeTrip, deleteLine, getTrip } from "@/features/purchases/api/purchase-requests";
import { TripScreen } from "@/features/purchases/components/trip-screen";
import { ApiError } from "@/lib/api";
import { OPEN_TRIP, TOMATO_LINE } from "@/testing/purchase-fixtures";
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
    vi.mocked(getTrip).mockResolvedValue(WITH_LINE);
    render(<TripScreen />, { wrapper: SwrTestWrapper });

    expect(await screen.findByText("Tomate perita")).toBeDefined();
    expect(screen.getByText("201,00 Bs")).toBeDefined();
    expect(screen.getByText("4.020,00 Bs")).toBeDefined();
    expect(screen.getByText("Formulario de compra")).toBeDefined();
    expect(screen.getByText("Venta 1,40 $/kg")).toBeDefined();
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
    expect(screen.queryByRole("button", { name: "Editar" })).toBeNull();
    expect(screen.queryByRole("button", { name: "Eliminar" })).toBeNull();
  });

  it("editing a purchase swaps its card for the form", async () => {
    vi.mocked(getTrip).mockResolvedValue(WITH_LINE);
    render(<TripScreen />, { wrapper: SwrTestWrapper });

    fireEvent.click(await screen.findByRole("button", { name: "Editar" }));

    expect(screen.getByText("Formulario de Tomate perita")).toBeDefined();
    expect(screen.queryByText("Formulario de compra")).toBeNull();
  });

  it("deletes a purchase after confirming", async () => {
    vi.mocked(getTrip).mockResolvedValue(WITH_LINE);
    vi.mocked(deleteLine).mockResolvedValue({ ...OPEN_TRIP });
    render(<TripScreen />, { wrapper: SwrTestWrapper });

    fireEvent.click(await screen.findByRole("button", { name: "Eliminar" }));
    fireEvent.click(screen.getByRole("button", { name: "Eliminar" }));

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
