import type { ManualPriceList, ManualPriceRow } from "@ta/validators";
import { fireEvent, render, screen, waitFor, within } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";

import {
  getManualPrices,
  saveManualPrice,
  saveShareOnWhatsapp,
} from "@/features/price-lists/api/manual-price-requests";
import { ManualPricesScreen } from "@/features/price-lists/components/manual-prices-screen";
import { setDesktop } from "@/testing/media";
import { SwrTestWrapper } from "@/testing/swr-wrapper";
import { formatBusinessDate, todayBusinessDate } from "@/utils/format-date";

vi.mock("@/features/auth/hooks/use-require-session", () => ({
  useRequireSession: () => ({
    activeMembership: { storeId: "store", storeName: "Tierra Andina", role: "owner" },
  }),
}));

vi.mock("@/features/price-lists/api/manual-price-requests", () => ({
  getManualPrices: vi.fn(),
  saveManualPrice: vi.fn(),
  saveShareOnWhatsapp: vi.fn(),
}));

const TOMATO: ManualPriceRow = {
  productId: "0199f000-0000-7000-8000-0000000000b1",
  productName: "Tomate perita",
  saleUnit: "kg",
  lastPurchase: { priceUsd: "0.8000", per: "saleUnit", purchaseUnit: "kg" },
  priceUsd: "2.2500",
  priceBs: "450.0000",
  shareOnWhatsapp: true,
};

const YAM: ManualPriceRow = {
  productId: "0199f000-0000-7000-8000-0000000000b2",
  productName: "Ñame",
  saleUnit: "kg",
  lastPurchase: null,
  priceUsd: null,
  priceBs: null,
  shareOnWhatsapp: false,
};

const AVOCADO: ManualPriceRow = {
  productId: "0199f000-0000-7000-8000-0000000000b3",
  productName: "Aguacate",
  saleUnit: "kg",
  lastPurchase: { priceUsd: "15.0000", per: "pack", purchaseUnit: "crate" },
  priceUsd: "1.5000",
  priceBs: "300.0000",
  shareOnWhatsapp: false,
};

const LIST: ManualPriceList = { saleRate: "200.0000", data: [AVOCADO, TOMATO, YAM] };

const writeText = vi.fn<(text: string) => Promise<void>>();

function rowOf(name: string): HTMLElement {
  const cell = screen.getByText(name);
  const row = cell.closest("tr");
  if (!row) throw new Error(`no row for ${name}`);
  return row;
}

describe("ManualPricesScreen", () => {
  beforeEach(() => {
    setDesktop(true);
    vi.mocked(getManualPrices).mockReset();
    vi.mocked(saveManualPrice).mockReset();
    vi.mocked(saveShareOnWhatsapp).mockReset();
    vi.mocked(getManualPrices).mockResolvedValue(LIST);
    writeText.mockReset();
    writeText.mockResolvedValue(undefined);
    Object.defineProperty(navigator, "clipboard", { value: { writeText }, configurable: true });
  });

  it("lists each product with its last purchase cost per crate or kilo and its price", async () => {
    render(<ManualPricesScreen />, { wrapper: SwrTestWrapper });

    await screen.findByText("Tomate perita");
    const tomato = rowOf("Tomate perita");
    expect(within(tomato).getByText("0,80 $/kg")).toBeDefined();
    expect(within(rowOf("Aguacate")).getByText("15,00 $/cesta")).toBeDefined();
    const price = within(tomato).getByLabelText("Precio de Tomate perita en bolívares");
    expect((price as HTMLInputElement).value).toBe("450");
    expect(within(tomato).queryByText(/Margen/)).toBeNull();
    expect(
      within(tomato)
        .getByRole("button", { name: "Incluir Tomate perita en la lista de WhatsApp" })
        .getAttribute("aria-pressed"),
    ).toBe("true");

    const yam = rowOf("Ñame");
    expect(within(yam).getByText("—")).toBeDefined();
    expect(
      (within(yam).getByLabelText("Precio de Ñame en bolívares") as HTMLInputElement).value,
    ).toBe("");
  });

  it("saves a new price from its row", async () => {
    vi.mocked(saveManualPrice).mockResolvedValue({
      ...TOMATO,
      priceBs: "500.0000",
      priceUsd: "2.5000",
    });
    render(<ManualPricesScreen />, { wrapper: SwrTestWrapper });

    await screen.findByText("Tomate perita");
    const tomato = rowOf("Tomate perita");
    const save = within(tomato).getByRole("button", { name: "Guardar" }) as HTMLButtonElement;
    expect(save.disabled).toBe(true);

    fireEvent.change(within(tomato).getByLabelText("Precio de Tomate perita en bolívares"), {
      target: { value: "500" },
    });
    await waitFor(() => expect(save.disabled).toBe(false));
    fireEvent.click(save);

    await waitFor(() =>
      expect(saveManualPrice).toHaveBeenCalledWith(TOMATO.productId, { priceBs: "500" }),
    );
    expect(await within(tomato).findByText("Guardado")).toBeDefined();
  });

  it("shows the field's error and does not save 0", async () => {
    render(<ManualPricesScreen />, { wrapper: SwrTestWrapper });

    await screen.findByText("Tomate perita");
    const tomato = rowOf("Tomate perita");
    fireEvent.change(within(tomato).getByLabelText("Precio de Tomate perita en bolívares"), {
      target: { value: "0" },
    });
    fireEvent.click(within(tomato).getByRole("button", { name: "Guardar" }));

    expect(await within(tomato).findByText("El precio debe ser mayor que 0")).toBeDefined();
    expect(saveManualPrice).not.toHaveBeenCalled();
  });

  it("switches WhatsApp on and copies only the products switched on with a price", async () => {
    vi.mocked(saveShareOnWhatsapp).mockResolvedValue({ shareOnWhatsapp: true });
    render(<ManualPricesScreen />, { wrapper: SwrTestWrapper });

    await screen.findByText("Tomate perita");
    expect(screen.getByText("1 producto marcado")).toBeDefined();
    const yamToggle = within(rowOf("Ñame")).getByRole("button", {
      name: "Incluir Ñame en la lista de WhatsApp",
    });
    fireEvent.click(yamToggle);

    await waitFor(() => expect(yamToggle.getAttribute("aria-pressed")).toBe("true"));
    expect(saveShareOnWhatsapp).toHaveBeenCalledWith(YAM.productId, true);
    // Ñame has no price yet: it is not copied.
    expect(screen.getByText("1 producto marcado")).toBeDefined();

    fireEvent.click(screen.getByRole("button", { name: "Copiar para WhatsApp" }));

    await waitFor(() =>
      expect(writeText).toHaveBeenCalledWith(
        `*Tierra Andina — Precios del ${formatBusinessDate(todayBusinessDate())}*\n` +
          "Tomate perita: 450,00 Bs/kg",
      ),
    );
    expect(await screen.findByText("Lista copiada (1 producto)")).toBeDefined();
  });

  it("the copy is off while no product is switched on", async () => {
    vi.mocked(getManualPrices).mockResolvedValue({
      ...LIST,
      data: [{ ...TOMATO, shareOnWhatsapp: false }, YAM],
    });
    render(<ManualPricesScreen />, { wrapper: SwrTestWrapper });

    await screen.findByText("Tomate perita");
    const copy = screen.getByRole("button", { name: "Copiar para WhatsApp" }) as HTMLButtonElement;
    expect(copy.disabled).toBe(true);
    expect(
      screen.getByText("Marca con el ícono de WhatsApp los productos que van en la lista."),
    ).toBeDefined();
  });

  it("without a sale rate, asks for it and prices cannot be typed", async () => {
    vi.mocked(getManualPrices).mockResolvedValue({ saleRate: null, data: [YAM] });
    render(<ManualPricesScreen />, { wrapper: SwrTestWrapper });

    expect(
      await screen.findByText("Falta la tasa de venta de hoy: anótala para poder guardar precios."),
    ).toBeDefined();
    expect(
      (screen.getByLabelText("Precio de Ñame en bolívares") as HTMLInputElement).disabled,
    ).toBe(true);
  });

  it("filters by name, ignoring accents and case", async () => {
    render(<ManualPricesScreen />, { wrapper: SwrTestWrapper });

    await screen.findByText("Tomate perita");
    fireEvent.change(screen.getByLabelText("Buscar producto"), { target: { value: "name" } });

    expect(screen.queryByText("Tomate perita")).toBeNull();
    expect(screen.getByText("Ñame")).toBeDefined();
  });
});
