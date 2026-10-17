import { act, renderHook, waitFor } from "@testing-library/react";
import type { Product, ProductDetail } from "@ta/validators";
import { beforeEach, describe, expect, it, vi } from "vitest";

import { createProduct, updateProduct } from "@/features/products/api/product-requests";
import { useProductForm } from "@/features/products/hooks/use-product-form";
import { ApiError } from "@/lib/api";
import { SwrTestWrapper } from "@/testing/swr-wrapper";

vi.mock("@/features/settings/api/use-settings", () => ({
  useSettings: () => ({
    settings: {
      usdRoundingStep: "0.05",
      bsRoundingStep: "1",
      saleRateMode: "manual",
      saleRateMarkupPct: "0",
      defaultMargin: "0.6",
      receiverCanSeePrices: false,
    },
    isLoaded: true,
    error: undefined,
  }),
}));
vi.mock("@/features/products/api/product-requests", () => ({
  createProduct: vi.fn(),
  updateProduct: vi.fn(),
  quickCreateProduct: vi.fn(),
  setProductActive: vi.fn(),
  listProducts: vi.fn(),
  getProduct: vi.fn(),
  listProductCategories: vi.fn().mockResolvedValue([]),
}));

const CATEGORY = "01a14314-2825-7000-a1d1-bdf734d05981";

const DETAIL: ProductDetail = {
  id: "01a14314-282a-7000-9464-3fabd385c6ef",
  name: "Tomate perita",
  categoryId: CATEGORY,
  categoryName: "Hortalizas",
  purchaseUnit: "crate",
  saleUnit: "kg",
  defaultPackQuantity: "24.0000",
  lastShrinkage: "2.0000",
  lastMargin: "0.5000",
  isActive: true,
  createdAt: "2026-10-16T00:00:00.000Z",
  updatedAt: "2026-10-16T00:00:00.000Z",
  isUnitLocked: false,
};

function setupCreate() {
  return renderHook(() => useProductForm({ mode: "create" }), { wrapper: SwrTestWrapper });
}

function fillTomato(result: ReturnType<typeof setupCreate>["result"]) {
  act(() => {
    const { form } = result.current;
    form.setValue("name", " Tomate perita ");
    form.setValue("categoryId", CATEGORY);
    form.setValue("defaultPackQuantity", "24");
    form.setValue("lastShrinkage", "2");
    form.setValue("lastMarginPercent", "50");
  });
}

describe("useProductForm — units", () => {
  it("starts with the store default margin (60 %)", async () => {
    const { result } = setupCreate();

    await waitFor(() => expect(result.current.form.getValues("lastMarginPercent")).toBe("60"));
  });

  it("starts as crate → kilo with the pack quantity field", () => {
    const { result } = setupCreate();

    expect(result.current.purchaseUnit).toBe("crate");
    expect(result.current.showPackQuantity).toBe(true);
    expect(result.current.packQuantityLabel).toBe("Kilos aprox. por cesta");
    expect(result.current.saleUnitSuffix).toBe("kg");
  });

  it("buying by kilo forces selling by kilo and hides/clears the pack quantity", () => {
    const { result } = setupCreate();
    act(() => {
      result.current.setSaleUnit("unit");
      result.current.form.setValue("defaultPackQuantity", "30");
    });

    act(() => result.current.setPurchaseUnit("kg"));

    expect(result.current.saleUnit).toBe("kg");
    expect(result.current.showPackQuantity).toBe(false);
    expect(result.current.form.getValues("defaultPackQuantity")).toBe("");
    expect(result.current.saleUnitOptions).toEqual([
      { value: "kg", label: "Kilo", disabled: false },
      { value: "unit", label: "Unidad", disabled: true },
    ]);
  });

  it("changes the pack label with the units (bundle by bunch → 'Rollitos por cuenta')", () => {
    const { result } = setupCreate();

    act(() => {
      result.current.setPurchaseUnit("bundle");
      result.current.setSaleUnit("unit");
    });

    expect(result.current.packQuantityLabel).toBe("Rollitos por cuenta");
    expect(result.current.saleUnitSuffix).toBe("und");
  });
});

describe("useProductForm — create", () => {
  beforeEach(() => {
    vi.mocked(createProduct).mockReset();
  });

  it("sends the API payload: clean name, margin 50 % → 0.5", async () => {
    vi.mocked(createProduct).mockResolvedValue({ ...DETAIL } satisfies Product);
    const { result } = setupCreate();
    fillTomato(result);

    await act(() => result.current.onSubmit());

    expect(createProduct).toHaveBeenCalledWith({
      name: "Tomate perita",
      categoryId: CATEGORY,
      purchaseUnit: "crate",
      saleUnit: "kg",
      defaultPackQuantity: "24",
      lastShrinkage: "2",
      lastMargin: "0.5",
    });
    expect(result.current.created?.name).toBe("Tomate perita");
  });

  it("validates shrinkage against the pack quantity before calling the API", async () => {
    const { result } = setupCreate();
    fillTomato(result);
    act(() => result.current.form.setValue("lastShrinkage", "24"));

    await act(() => result.current.onSubmit());

    expect(createProduct).not.toHaveBeenCalled();
    expect(result.current.form.formState.errors.lastShrinkage?.message).toBe(
      "La merma debe ser menor que la cantidad por bulto",
    );
  });

  it("puts server field errors on their fields (name taken)", async () => {
    vi.mocked(createProduct).mockRejectedValue(
      new ApiError({
        status: 409,
        code: "PRODUCT_NAME_TAKEN",
        message: "Ya existe un producto con ese nombre",
        details: { fieldErrors: { name: ["Ya existe un producto con ese nombre"] } },
      }),
    );
    const { result } = setupCreate();
    fillTomato(result);

    await act(() => result.current.onSubmit());

    expect(result.current.form.formState.errors.name?.message).toBe(
      "Ya existe un producto con ese nombre",
    );
    expect(result.current.formError).toBeUndefined();
  });

  it("maps the API margin error to the percent field", async () => {
    vi.mocked(createProduct).mockRejectedValue(
      new ApiError({
        status: 422,
        code: "INVALID_PRODUCT_DEFAULTS",
        message: "Revisa la cantidad por bulto, la merma y el margen",
        details: { fieldErrors: { lastMargin: ["El margen debe estar entre 0 % y 500 %"] } },
      }),
    );
    const { result } = setupCreate();
    fillTomato(result);

    await act(() => result.current.onSubmit());

    expect(result.current.form.formState.errors.lastMarginPercent?.message).toBe(
      "El margen debe estar entre 0 % y 500 %",
    );
  });

  it("shows other errors at the top of the form", async () => {
    vi.mocked(createProduct).mockRejectedValue(
      new ApiError({ status: 0, code: "NETWORK_ERROR", message: "No se pudo conectar con la API" }),
    );
    const { result } = setupCreate();
    fillTomato(result);

    await act(() => result.current.onSubmit());

    expect(result.current.formError).toBe("No se pudo conectar con la API");
  });

  it("'Crear otro' clears the form but keeps category and units", async () => {
    vi.mocked(createProduct).mockResolvedValue({ ...DETAIL });
    const { result } = setupCreate();
    fillTomato(result);
    await act(() => result.current.onSubmit());

    act(() => result.current.resetForAnother());

    expect(result.current.created).toBeNull();
    expect(result.current.form.getValues()).toMatchObject({
      name: "",
      categoryId: CATEGORY,
      purchaseUnit: "crate",
      defaultPackQuantity: "",
    });
  });
});

describe("useProductForm — edit", () => {
  beforeEach(() => {
    vi.mocked(updateProduct).mockReset();
  });

  it("loads stored values as form text (24.0000 → 24, 0.5000 → 50 %)", () => {
    const { result } = renderHook(() => useProductForm({ mode: "edit", product: DETAIL }), {
      wrapper: SwrTestWrapper,
    });

    expect(result.current.form.getValues()).toEqual({
      name: "Tomate perita",
      categoryId: CATEGORY,
      purchaseUnit: "crate",
      saleUnit: "kg",
      defaultPackQuantity: "24",
      lastShrinkage: "2",
      lastMarginPercent: "50",
    });
  });

  it("reports locked units and confirms a save", async () => {
    vi.mocked(updateProduct).mockResolvedValue({
      ...DETAIL,
      lastMargin: "0.6000",
      isUnitLocked: true,
    });
    const { result } = renderHook(
      () => useProductForm({ mode: "edit", product: { ...DETAIL, isUnitLocked: true } }),
      { wrapper: SwrTestWrapper },
    );
    expect(result.current.isUnitLocked).toBe(true);

    act(() => result.current.form.setValue("lastMarginPercent", "60", { shouldDirty: true }));
    await act(() => result.current.onSubmit());

    expect(updateProduct).toHaveBeenCalledWith(
      DETAIL.id,
      expect.objectContaining({ lastMargin: "0.6" }),
    );
    await waitFor(() => expect(result.current.isSaved).toBe(true));
    expect(result.current.form.getValues("lastMarginPercent")).toBe("60");
  });
});
