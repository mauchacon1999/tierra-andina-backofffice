import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";

import { listProducts } from "@/features/products/api/product-requests";
import { addLine, listSuppliers, updateLine } from "@/features/purchases/api/purchase-requests";
import { PurchaseLineForm } from "@/features/purchases/components/purchase-line-form";
import { ApiError } from "@/lib/api";
import { BAKERY } from "@/testing/payable-fixtures";
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
  fireEvent.click(screen.getByRole("button", { name: "Ver opciones" }));
  fireEvent.click(await screen.findByRole("option", { name: TOMATO_PRODUCT.name }));
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

  it("choosing a product pre-fills its margin and does not ask for merma or a supplier", async () => {
    await chooseTomato();

    expect(valueOf(/Margen/)).toBe("50");
    expect(screen.queryByLabelText(/Merma/)).toBeNull();
    expect(screen.queryByLabelText(/Proveedor/)).toBeNull();
    expect(screen.queryByLabelText(/Tasa/)).toBeNull();
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
    type(/^Precio/, "20");

    const costs = await screen.findByLabelText("Costo de la compra");
    expect(costs.textContent).toContain("4.020,00 Bs");
    expect(costs.textContent).toContain("0,91 $");
    expect(costs.textContent).toContain("1,40 $");
  });

  it("submits without crates: the product's shrinkage and the Coche rate, then stays open", async () => {
    vi.mocked(addLine).mockResolvedValue({ ...OPEN_TRIP, lines: [TOMATO_LINE], lineCount: 1 });
    await chooseTomato();
    type(/Cantidad bruta/, "24");
    type(/^Precio/, "20");
    fireEvent.click(screen.getByRole("button", { name: "Agregar" }));

    await waitFor(() =>
      expect(addLine).toHaveBeenCalledWith(OPEN_TRIP.id, {
        productId: TOMATO_PRODUCT.id,
        packs: null,
        grossQuantity: "24",
        shrinkage: "2.0000",
        quotedPriceUsd: "20",
        margin: "0.5",
        paymentStatus: "paid",
        supplierId: null,
      }),
    );
    await waitFor(() => expect(valueOf(/^Precio/)).toBe(""));
    expect(screen.getByRole("button", { name: "Agregar" })).toBeDefined();
  });

  it("accepts the price in bolívares and stores the dollars at the Coche rate (201)", async () => {
    vi.mocked(addLine).mockResolvedValue({ ...OPEN_TRIP, lines: [TOMATO_LINE], lineCount: 1 });
    await chooseTomato();
    expect((screen.getByRole("radio", { name: "Dólares" }) as HTMLInputElement).checked).toBe(true);

    type(/^Precio/, "20");
    fireEvent.click(screen.getByRole("radio", { name: "Bolívares" }));
    expect(valueOf(/^Precio/)).toBe("4020");
    expect(screen.getByText("Son 20,00 $ a la tasa de Coche (201).")).toBeDefined();

    type(/^Precio/, "4020");
    type(/Cantidad bruta/, "24");
    fireEvent.click(screen.getByRole("button", { name: "Agregar" }));

    await waitFor(() =>
      expect(addLine).toHaveBeenCalledWith(
        OPEN_TRIP.id,
        expect.objectContaining({ quotedPriceUsd: "20", grossQuantity: "24" }),
      ),
    );
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
    type(/^Precio/, "20");
    fireEvent.click(screen.getByRole("button", { name: "Agregar" }));

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

    expect(valueOf(/Cestas/)).toBe("1");
    expect(screen.queryByLabelText(/Tasa/)).toBeNull();
    expect(screen.queryByRole("button", { name: "+ Nuevo producto" })).toBeNull();
    type(/^Precio/, "22");
    fireEvent.click(screen.getByRole("button", { name: "Guardar cambios" }));

    await waitFor(() => expect(onDone).toHaveBeenCalledOnce());
    expect(vi.mocked(updateLine).mock.calls[0]?.[1]).toBe(TOMATO_LINE.id);
    expect(vi.mocked(updateLine).mock.calls[0]?.[2]).toMatchObject({
      quotedPriceUsd: "22",
      packs: "1",
      shrinkage: "2.0000",
      margin: "0.5",
    });
  });
});

describe("PurchaseLineForm (buy from the list)", () => {
  it("selects the product and its margin once the list has loaded", async () => {
    let resolveProducts: (page: Awaited<ReturnType<typeof listProducts>>) => void = () => {};
    vi.mocked(listProducts).mockReturnValue(
      new Promise((resolve) => {
        resolveProducts = resolve;
      }),
    );
    render(
      <PurchaseLineForm trip={OPEN_TRIP} pickedProductId={TOMATO_PRODUCT.id} pickToken={1} />,
      { wrapper: SwrTestWrapper },
    );

    const product = () => screen.getByRole("combobox", { name: /Producto/ }) as HTMLInputElement;
    expect(product().value).toBe("");

    resolveProducts({ data: [TOMATO_PRODUCT], total: 1, page: 1, pageSize: 100 });

    await waitFor(() => expect(product().value).toBe(TOMATO_PRODUCT.name));
    expect(valueOf(/Margen/)).toBe("50");
  });
});

describe("PurchaseLineForm (credit)", () => {
  const STALL = { ...BAKERY, id: "0199f000-0000-7000-8000-0000000000b9", name: "Puesto 7" };

  beforeEach(() => {
    vi.mocked(addLine).mockReset();
    vi.mocked(listSuppliers).mockResolvedValue([STALL]);
    vi.mocked(listProducts).mockResolvedValue({
      data: [TOMATO_PRODUCT],
      total: 1,
      page: 1,
      pageSize: 100,
    });
  });

  it("at Coche a credit line asks which supplier is owed, and sends it", async () => {
    vi.mocked(addLine).mockResolvedValue({ ...OPEN_TRIP, lines: [TOMATO_LINE], lineCount: 1 });
    render(<PurchaseLineForm trip={OPEN_TRIP} />, { wrapper: SwrTestWrapper });
    await chooseTomato();
    type(/Cantidad bruta/, "24");
    type(/^Precio/, "20");
    fireEvent.click(screen.getByRole("radio", { name: "A crédito" }));

    fireEvent.click(screen.getByRole("button", { name: "Agregar" }));
    expect(await screen.findByText("Indica a qué proveedor se le debe")).toBeDefined();
    expect(addLine).not.toHaveBeenCalled();

    await screen.findByRole("option", { name: "Puesto 7" });
    fireEvent.change(screen.getByLabelText(/^Proveedor/), { target: { value: STALL.id } });
    fireEvent.click(screen.getByRole("button", { name: "Agregar" }));
    await waitFor(() =>
      expect(addLine).toHaveBeenCalledWith(
        OPEN_TRIP.id,
        expect.objectContaining({ paymentStatus: "credit", supplierId: STALL.id }),
      ),
    );
  });

  it("a local purchase is on credit by default, at the BCV rate, with no supplier to choose", async () => {
    const local = { ...OPEN_TRIP, kind: "local" as const, marketRate: "200.0000" };
    render(<PurchaseLineForm trip={local} />, { wrapper: SwrTestWrapper });

    expect(
      await screen.findByText("En dólares. En bolívares se calcula con la tasa BCV (200)."),
    ).toBeDefined();
    expect((screen.getByRole("radio", { name: "A crédito" }) as HTMLInputElement).checked).toBe(
      true,
    );
    expect(screen.queryByLabelText(/^Proveedor/)).toBeNull();
  });
});
