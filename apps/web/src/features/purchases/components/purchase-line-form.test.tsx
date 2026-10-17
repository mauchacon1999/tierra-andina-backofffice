import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";

import { listProducts } from "@/features/products/api/product-requests";
import { addLine, updateLine } from "@/features/purchases/api/purchase-requests";
import { PurchaseLineForm } from "@/features/purchases/components/purchase-line-form";
import { ApiError } from "@/lib/api";
import { OPEN_TRIP, TOMATO_LINE, TOMATO_PRODUCT } from "@/testing/purchase-fixtures";
import { SwrTestWrapper } from "@/testing/swr-wrapper";

vi.mock("@/features/settings/api/use-settings", async () => {
  const { SETTINGS_MOCK } = await import("@/testing/purchase-fixtures");
  return SETTINGS_MOCK;
});
vi.mock("@/features/products/api/product-requests", () => ({
  listProducts: vi.fn(),
  quickCreateProduct: vi.fn(),
}));
vi.mock("@/features/purchases/api/purchase-requests", () => ({
  addLine: vi.fn(),
  updateLine: vi.fn(),
  listSuppliers: vi.fn().mockResolvedValue([]),
}));

const type = (label: string | RegExp, value: string) =>
  fireEvent.input(screen.getByLabelText(label), { target: { value } });
const valueOf = (label: string | RegExp) =>
  (screen.getByLabelText(label) as HTMLInputElement).value;

async function chooseTomato(): Promise<void> {
  await screen.findByRole("option", { name: TOMATO_PRODUCT.name });
  fireEvent.change(screen.getByLabelText(/Producto/), { target: { value: TOMATO_PRODUCT.id } });
}

describe("PurchaseLineForm (add)", () => {
  beforeEach(() => {
    vi.mocked(addLine).mockReset();
    vi.mocked(listProducts).mockResolvedValue({
      data: [TOMATO_PRODUCT],
      total: 1,
      page: 1,
      pageSize: 100,
    });
    render(<PurchaseLineForm trip={OPEN_TRIP} />, { wrapper: SwrTestWrapper });
  });

  it("choosing a product pre-fills its last shrinkage and margin", async () => {
    await chooseTomato();

    expect(valueOf(/Merma/)).toBe("2");
    expect(valueOf(/Margen/)).toBe("50");
  });

  it("estimates the gross quantity from the packs until it is typed", async () => {
    await chooseTomato();
    type(/Cestas/, "3");
    await waitFor(() => expect(valueOf(/Cantidad bruta/)).toBe("72"));

    type(/Cantidad bruta/, "70");
    type(/Cestas/, "4");
    expect(valueOf(/Cantidad bruta/)).toBe("70");
  });

  it("shows the cost live with the Coche rate of the trip (201): 4.020 Bs, sells at 1,40 $", async () => {
    await chooseTomato();
    type(/Cestas/, "1");
    type(/Precio total/, "20");

    const costs = await screen.findByLabelText("Costo de la compra");
    expect(costs.textContent).toContain("4.020,00 Bs");
    expect(costs.textContent).toContain("0,91 $");
    expect(costs.textContent).toContain("1,40 $");
  });

  it("submits the API payload (margin as a fraction, empty supplier rate omitted)", async () => {
    vi.mocked(addLine).mockResolvedValue({ ...OPEN_TRIP, lines: [TOMATO_LINE], lineCount: 1 });
    await chooseTomato();
    type(/Puesto/, "Puesto 14");
    type(/Cestas/, "1");
    type(/Precio total/, "20");
    fireEvent.click(screen.getByRole("button", { name: "Agregar compra" }));

    await waitFor(() =>
      expect(addLine).toHaveBeenCalledWith(OPEN_TRIP.id, {
        productId: TOMATO_PRODUCT.id,
        supplierId: null,
        stallReference: "Puesto 14",
        packs: "1",
        grossQuantity: "24",
        shrinkage: "2",
        quotedPriceUsd: "20",
        supplierRate: undefined,
        margin: "0.5",
        paymentStatus: "paid",
      }),
    );
    // Ready for the next purchase.
    await waitFor(() => expect(valueOf(/Precio total/)).toBe(""));
  });

  it("shrinkage must be below the gross quantity", async () => {
    await chooseTomato();
    type(/Cestas/, "1");
    type(/Merma/, "24");
    type(/Precio total/, "20");
    fireEvent.click(screen.getByRole("button", { name: "Agregar compra" }));

    expect(await screen.findByText("La merma debe ser menor que la cantidad bruta")).toBeDefined();
    expect(addLine).not.toHaveBeenCalled();
  });

  it("puts the API's field errors on the right field (margin → Margen)", async () => {
    vi.mocked(addLine).mockRejectedValue(
      new ApiError({
        status: 422,
        code: "INVALID_PURCHASE_LINE",
        message: "Revisa los datos de la compra",
        details: { fieldErrors: { margin: ["El margen debe estar entre 0 % y 500 %"] } },
      }),
    );
    await chooseTomato();
    type(/Cestas/, "1");
    type(/Precio total/, "20");
    fireEvent.click(screen.getByRole("button", { name: "Agregar compra" }));

    const message = await screen.findByText("El margen debe estar entre 0 % y 500 %");
    expect(screen.getByLabelText(/Margen/).getAttribute("aria-describedby")).toBe(
      message.getAttribute("id"),
    );
  });
});

describe("PurchaseLineForm (edit)", () => {
  it("starts with the line's values and sends them as a patch", async () => {
    vi.mocked(listProducts).mockResolvedValue({ data: [], total: 0, page: 1, pageSize: 100 });
    vi.mocked(updateLine).mockResolvedValue({ ...OPEN_TRIP, lines: [TOMATO_LINE] });
    const onDone = vi.fn();
    render(<PurchaseLineForm trip={OPEN_TRIP} line={TOMATO_LINE} onDone={onDone} />, {
      wrapper: SwrTestWrapper,
    });

    expect(valueOf(/Tasa del puesto/)).toBe("201");
    expect(screen.queryByRole("button", { name: "+ Nuevo producto" })).toBeNull();
    type(/Precio total/, "22");
    fireEvent.click(screen.getByRole("button", { name: "Guardar cambios" }));

    await waitFor(() => expect(onDone).toHaveBeenCalledOnce());
    expect(vi.mocked(updateLine).mock.calls[0]?.[1]).toBe(TOMATO_LINE.id);
    expect(vi.mocked(updateLine).mock.calls[0]?.[2]).toMatchObject({
      quotedPriceUsd: "22",
      supplierRate: "201",
      margin: "0.5",
    });
  });
});
